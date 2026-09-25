import os
import io
import uuid
import re
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np

import tempfile
import json

# In-memory store for active datasets: dataset_id -> { "filename": str, "file_bytes": bytes, "sheets": List[str], "active_sheet": str, "df": pd.DataFrame, "raw_dfs": Dict[str, pd.DataFrame] }
DATASET_STORE: Dict[str, Dict[str, Any]] = {}

def get_session_data(dataset_id: str) -> Optional[Dict[str, Any]]:
    if dataset_id in DATASET_STORE:
        return DATASET_STORE[dataset_id]

    # Serverless fallback: check temp directory
    temp_dir = tempfile.gettempdir()
    meta_path = os.path.join(temp_dir, f"excelvibe_{dataset_id}.json")
    bin_path = os.path.join(temp_dir, f"excelvibe_{dataset_id}.bin")

    if os.path.exists(meta_path) and os.path.exists(bin_path):
        try:
            with open(meta_path, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            with open(bin_path, 'rb') as f:
                file_bytes = f.read()
            
            filename = meta.get("filename", "spreadsheet.xlsx")
            active_sheet = meta.get("active_sheet", "")
            sheets = meta.get("sheets", [])
            df = read_sheet_dataframe(file_bytes, filename, active_sheet)

            session = {
                "filename": filename,
                "file_bytes": file_bytes,
                "sheets": sheets,
                "active_sheet": active_sheet,
                "df": df,
                "raw_dfs": {active_sheet: df}
            }
            DATASET_STORE[dataset_id] = session
            return session
        except Exception:
            return None

    return None

def clean_column_names(columns: List[Any]) -> List[str]:
    seen = {}
    cleaned = []
    for i, col in enumerate(columns):
        c_str = str(col).strip() if col is not None and not pd.isna(col) else f"Column_{i+1}"
        if c_str == "" or c_str.lower().startswith("unnamed:"):
            c_str = f"Column_{i+1}"
        
        # Handle duplicate column names
        if c_str in seen:
            seen[c_str] += 1
            c_str = f"{c_str}_{seen[c_str]}"
        else:
            seen[c_str] = 0
        cleaned.append(c_str)
    return cleaned

def parse_excel_file(file_bytes: bytes, filename: str) -> Tuple[str, List[str], str, pd.DataFrame]:
    """
    Parses the excel file, extracts sheet names, reads the first sheet into a DataFrame,
    and stores the workbook in the DATASET_STORE.
    """
    file_lower = filename.lower()
    if not (file_lower.endswith('.xlsx') or file_lower.endswith('.xls')):
        raise ValueError("Unsupported file format. Please upload a valid .xlsx or .xls file.")

    engine = "openpyxl" if file_lower.endswith('.xlsx') else "xlrd"
    excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine=engine)
    sheet_names = excel_file.sheet_names

    if not sheet_names:
        raise ValueError("The uploaded Excel workbook contains no sheets.")

    active_sheet = sheet_names[0]
    df = read_sheet_dataframe(file_bytes, filename, active_sheet)

    dataset_id = str(uuid.uuid4())
    DATASET_STORE[dataset_id] = {
        "filename": filename,
        "file_bytes": file_bytes,
        "sheets": sheet_names,
        "active_sheet": active_sheet,
        "df": df,
        "raw_dfs": {active_sheet: df}
    }

    # Persist to temp for serverless recovery
    try:
        temp_dir = tempfile.gettempdir()
        with open(os.path.join(temp_dir, f"excelvibe_{dataset_id}.json"), "w", encoding="utf-8") as f:
            json.dump({"filename": filename, "sheets": sheet_names, "active_sheet": active_sheet}, f)
        with open(os.path.join(temp_dir, f"excelvibe_{dataset_id}.bin"), "wb") as f:
            f.write(file_bytes)
    except Exception:
        pass

    return dataset_id, sheet_names, active_sheet, df

def read_sheet_dataframe(file_bytes: bytes, filename: str, sheet_name: str) -> pd.DataFrame:
    """
    Reads a specific sheet from the Excel file and applies robust type inference and cleaning.
    """
    file_lower = filename.lower()
    engine = "openpyxl" if file_lower.endswith('.xlsx') else "xlrd"
    
    try:
        df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine=engine)
    except Exception as e:
        raise ValueError(f"Failed to read sheet '{sheet_name}': {str(e)}")

    if df.empty and len(df.columns) == 0:
        return pd.DataFrame(columns=["Empty Sheet"])

    # Clean column names
    df.columns = clean_column_names(df.columns)

    # Convert datetime columns if possible, strip string whitespace
    for col in df.columns:
        # Check if already datetime
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            continue
        
        # If object/string, check if it could be datetime
        if df[col].dtype == object:
            # Check non-null values
            non_nulls = df[col].dropna()
            if len(non_nulls) > 0:
                # Test a sample of non-null string values
                sample = non_nulls.head(20).astype(str)
                # Check for common date patterns (YYYY-MM-DD, DD/MM/YYYY, etc.)
                date_like = 0
                for val in sample:
                    val_clean = val.strip()
                    if re.match(r'^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}', val_clean) or \
                       re.match(r'^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}', val_clean):
                        date_like += 1
                
                if date_like >= len(sample) * 0.7:
                    try:
                        converted = pd.to_datetime(df[col], errors='coerce')
                        # If more than 70% converted successfully, keep as datetime
                        if converted.notna().sum() >= len(non_nulls) * 0.7:
                            df[col] = converted
                    except Exception:
                        pass

        # Try numeric conversion for strings with numbers (like "$1,234.50" or "45.2%")
        if df[col].dtype == object and not pd.api.types.is_datetime64_any_dtype(df[col]):
            non_nulls = df[col].dropna()
            if len(non_nulls) > 0:
                sample = non_nulls.head(20).astype(str)
                cleaned_sample = sample.str.replace(r'[\$,₹,€,£,¥,% ]', '', regex=True)
                numeric_converted = pd.to_numeric(cleaned_sample, errors='coerce')
                if numeric_converted.notna().sum() >= len(sample) * 0.8:
                    try:
                        clean_col = df[col].astype(str).str.replace(r'[\$,₹,€,£,¥,% ]', '', regex=True)
                        converted_num = pd.to_numeric(clean_col, errors='coerce')
                        if converted_num.notna().sum() >= len(non_nulls) * 0.7:
                            df[col] = converted_num
                    except Exception:
                        pass

    return df

def switch_sheet(dataset_id: str, sheet_name: str) -> pd.DataFrame:
    """
    Switches the active sheet in the session.
    """
    session = get_session_data(dataset_id)
    if not session:
        raise ValueError(f"Session {dataset_id} not found.")

    if sheet_name not in session["sheets"]:
        raise ValueError(f"Sheet '{sheet_name}' does not exist in workbook.")

    if sheet_name in session["raw_dfs"]:
        df = session["raw_dfs"][sheet_name]
    else:
        df = read_sheet_dataframe(session["file_bytes"], session["filename"], sheet_name)
        session["raw_dfs"][sheet_name] = df

    session["active_sheet"] = sheet_name
    session["df"] = df
    return df
