import os
import io
import math
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from backend.services.excel_reader import (
    parse_excel_file,
    switch_sheet,
    get_session_data,
    DATASET_STORE
)
from backend.services.analyzer import (
    analyze_sheet,
    find_primary_metric_columns,
    find_primary_category_columns,
    generate_kpis,
    generate_deterministic_summary
)
from backend.services.visualization import (
    aggregate_chart_data,
    generate_recommended_charts,
    apply_filters_to_dataframe
)
from backend.services.exporter import (
    export_to_csv_bytes,
    export_to_excel_bytes
)

app = FastAPI(
    title="Offline Excel Visualizer API",
    description="100% local, deterministic Excel analytics & visualization API.",
    version="1.0.0"
)

api_router = APIRouter()

# Enable CORS for localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class SelectSheetRequest(BaseModel):
    dataset_id: str
    sheet_name: str

class FilterRequest(BaseModel):
    dataset_id: str
    filters: Dict[str, Any] = {}

class ChartQueryRequest(BaseModel):
    dataset_id: str
    x_col: str
    y_col: Optional[str] = None
    group_col: Optional[str] = None
    chart_type: str = "bar"
    aggregation: str = "sum"
    filters: Dict[str, Any] = {}
    limit: int = 50

class TableDataRequest(BaseModel):
    dataset_id: str
    page: int = 1
    page_size: int = 25
    sort_by: Optional[str] = None
    sort_desc: bool = False
    search: Optional[str] = None
    filters: Dict[str, Any] = {}
    visible_columns: Optional[List[str]] = None

class ExportRequest(BaseModel):
    dataset_id: str
    filters: Dict[str, Any] = {}
    export_format: str = "excel"  # 'excel' or 'csv'

@api_router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mode": "offline-local",
        "privacy": "Local processing — your uploaded data never leaves this computer."
    }

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_spreadsheet.xlsx"
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        dataset_id, sheets, active_sheet, df = parse_excel_file(file_bytes, filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel file parsing error: {str(e)}")

    analysis = analyze_sheet(df, active_sheet)
    lead_numerics = find_primary_metric_columns(df, analysis["column_types"])
    lead_cats = find_primary_category_columns(df, analysis["column_types"])
    recommended_charts = generate_recommended_charts(df, analysis["column_types"], lead_numerics, lead_cats)

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "sheets": sheets,
        "active_sheet": active_sheet,
        "analysis": analysis,
        "kpis": analysis["kpis"],
        "summary": analysis["summary"],
        "recommended_charts": recommended_charts,
        "privacy_notice": "Local processing — your uploaded data never leaves this computer."
    }

@api_router.post("/select-sheet")
def select_sheet(req: SelectSheetRequest):
    session = get_session_data(req.dataset_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session expired or not found.")

    try:
        df = switch_sheet(req.dataset_id, req.sheet_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    analysis = analyze_sheet(df, req.sheet_name)
    lead_numerics = find_primary_metric_columns(df, analysis["column_types"])
    lead_cats = find_primary_category_columns(df, analysis["column_types"])
    recommended_charts = generate_recommended_charts(df, analysis["column_types"], lead_numerics, lead_cats)

    return {
        "dataset_id": req.dataset_id,
        "filename": session["filename"],
        "sheets": session["sheets"],
        "active_sheet": req.sheet_name,
        "analysis": analysis,
        "kpis": analysis["kpis"],
        "summary": analysis["summary"],
        "recommended_charts": recommended_charts
    }

@api_router.post("/filter")
def apply_filters(req: FilterRequest):
    session = get_session_data(req.dataset_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found.")

    df_original = session["df"]
    df_filtered = apply_filters_to_dataframe(df_original, req.filters)

    analysis_original = analyze_sheet(df_original, session["active_sheet"])
    col_types = analysis_original["column_types"]
    
    # Filtered KPIs and summary
    from backend.services.statistics import calculate_data_quality
    quality = calculate_data_quality(df_filtered, col_types)
    kpis = generate_kpis(df_filtered, col_types, quality)
    summary = generate_deterministic_summary(df_filtered, col_types, quality)

    lead_numerics = find_primary_metric_columns(df_filtered, col_types)
    lead_cats = find_primary_category_columns(df_filtered, col_types)
    recommended_charts = generate_recommended_charts(df_filtered, col_types, lead_numerics, lead_cats)

    return {
        "total_rows": len(df_original),
        "filtered_rows": len(df_filtered),
        "kpis": kpis,
        "summary": summary,
        "recommended_charts": recommended_charts
    }

@api_router.post("/query-chart")
def query_chart(req: ChartQueryRequest):
    session = get_session_data(req.dataset_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found.")

    df = session["df"]
    if req.filters:
        df = apply_filters_to_dataframe(df, req.filters)

    result = aggregate_chart_data(
        df=df,
        x_col=req.x_col,
        y_col=req.y_col,
        group_col=req.group_col,
        chart_type=req.chart_type,
        aggregation=req.aggregation,
        limit=req.limit
    )

    return result

@api_router.post("/table-data")
def get_table_data(req: TableDataRequest):
    session = get_session_data(req.dataset_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found.")

    df = session["df"]
    total_original = len(df)

    # 1. Apply filters
    filters_with_search = dict(req.filters)
    if req.search:
        filters_with_search["search"] = req.search

    filtered_df = apply_filters_to_dataframe(df, filters_with_search)
    filtered_count = len(filtered_df)

    # 2. Sort
    if req.sort_by and req.sort_by in filtered_df.columns:
        filtered_df = filtered_df.sort_values(by=req.sort_by, ascending=not req.sort_desc)

    # 3. Paginate
    page = max(1, req.page)
    page_size = max(5, min(200, req.page_size))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    sliced = filtered_df.iloc[start_idx:end_idx]

    # Select columns if requested
    cols = req.visible_columns if req.visible_columns else list(df.columns)
    valid_cols = [c for c in cols if c in sliced.columns]
    
    # Format rows for JSON serialization (handle NaNs, timestamps)
    records = []
    for _, row in sliced[valid_cols].iterrows():
        rec = {}
        for col in valid_cols:
            val = row[col]
            if pd.isna(val):
                rec[col] = None
            elif hasattr(val, 'isoformat'):
                rec[col] = val.isoformat()
            elif isinstance(val, (int, float)):
                if math.isinf(val) or math.isnan(val):
                    rec[col] = None
                else:
                    rec[col] = val
            else:
                rec[col] = str(val)
        records.append(rec)

    total_pages = math.ceil(filtered_count / page_size) if filtered_count > 0 else 1

    return {
        "rows": records,
        "total_rows": total_original,
        "filtered_rows": filtered_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "columns": list(df.columns)
    }

@api_router.post("/export")
def export_dataset(req: ExportRequest):
    session = get_session_data(req.dataset_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found.")

    df = session["df"]
    if req.filters:
        df = apply_filters_to_dataframe(df, req.filters)

    base_name = os.path.splitext(session["filename"])[0]

    if req.export_format.lower() == "csv":
        csv_bytes = export_to_csv_bytes(df)
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_filtered.csv"'}
        )
    else:
        excel_bytes = export_to_excel_bytes(df, sheet_name=session["active_sheet"])
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_filtered.xlsx"'}
        )

@api_router.get("/sample/{name}")
def load_sample_dataset(name: str):
    sample_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")
    if name == "sales":
        file_path = os.path.join(sample_dir, "sample_sales_data.xlsx")
        filename = "Sample_Sales_Performance.xlsx"
    elif name == "employee":
        file_path = os.path.join(sample_dir, "sample_employee_data.xlsx")
        filename = "Sample_Employee_Directory.xlsx"
    else:
        raise HTTPException(status_code=404, detail="Sample dataset not found. Use 'sales' or 'employee'.")

    if not os.path.exists(file_path):
        from backend.sample_data.create_samples import generate_sales_data, generate_employee_data
        os.makedirs(sample_dir, exist_ok=True)
        if name == "sales":
            generate_sales_data(file_path)
        else:
            generate_employee_data(file_path)

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    dataset_id, sheets, active_sheet, df = parse_excel_file(file_bytes, filename)
    analysis = analyze_sheet(df, active_sheet)
    lead_numerics = find_primary_metric_columns(df, analysis["column_types"])
    lead_cats = find_primary_category_columns(df, analysis["column_types"])
    recommended_charts = generate_recommended_charts(df, analysis["column_types"], lead_numerics, lead_cats)

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "sheets": sheets,
        "active_sheet": active_sheet,
        "analysis": analysis,
        "kpis": analysis["kpis"],
        "summary": analysis["summary"],
        "recommended_charts": recommended_charts,
        "privacy_notice": "Local processing — your uploaded data never leaves this computer."
    }

# Mount api_router for both /api prefix and root / paths for Vercel and local compatibility
app.include_router(api_router, prefix="/api")
app.include_router(api_router)

# Serve Frontend static assets if built and running locally (not on Vercel)
if not os.environ.get("VERCEL"):
    frontend_dist = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
    if os.path.exists(frontend_dist):
        app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

        @app.get("/")
        def serve_frontend_root():
            index_file = os.path.join(frontend_dist, "index.html")
            if os.path.exists(index_file):
                return FileResponse(index_file)
            return {"message": "Offline Excel Visualizer API is active."}

        @app.get("/{full_path:path}")
        def serve_frontend_spa(full_path: str):
            if full_path.startswith("api/"):
                raise HTTPException(status_code=404, detail="API endpoint not found.")
            file_path = os.path.join(frontend_dist, full_path)
            if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
                return FileResponse(file_path)
            index_file = os.path.join(frontend_dist, "index.html")
            if os.path.exists(index_file):
                return FileResponse(index_file)
            return {"message": "Offline Excel Visualizer API is active."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
