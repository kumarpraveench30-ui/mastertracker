from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from backend.services.statistics import (
    calculate_column_types,
    calculate_numeric_stats,
    calculate_categorical_stats,
    calculate_datetime_stats,
    calculate_data_quality
)

def find_primary_metric_columns(df: pd.DataFrame, col_types: Dict[str, str]) -> List[str]:
    """
    Identifies high-value numeric columns (e.g., sales, revenue, profit, salary, amount, quantity, score).
    """
    numeric_cols = [c for c, t in col_types.items() if t == "numeric"]
    if not numeric_cols:
        return []

    # Priority keywords in order
    priority_keywords = [
        "sales", "revenue", "profit", "salary", "amount", "price", "income", 
        "cost", "total", "turnover", "quantity", "units", "score", "value", "balance", "age"
    ]

    scored_cols = []
    for col in numeric_cols:
        col_lower = col.lower()
        score = 0
        for i, kw in enumerate(priority_keywords):
            if kw in col_lower:
                score += (len(priority_keywords) - i) * 10
        # If it doesn't match keywords, give small score based on non-null count and variance
        variance = df[col].std() if len(df) > 1 else 0
        if variance and not np.isnan(variance) and variance > 0:
            score += 1
        scored_cols.append((col, score))

    scored_cols.sort(key=lambda x: x[1], reverse=True)
    return [col for col, _ in scored_cols]

def find_primary_category_columns(df: pd.DataFrame, col_types: Dict[str, str]) -> List[str]:
    """
    Identifies prominent categorical columns (e.g., category, department, region, customer, product).
    """
    cat_cols = [c for c, t in col_types.items() if t == "categorical"]
    if not cat_cols:
        return []

    priority_keywords = [
        "category", "department", "dept", "product", "item", "region", "country", 
        "state", "city", "segment", "type", "status", "role", "branch", "group", "customer", "client", "vendor"
    ]

    scored = []
    for col in cat_cols:
        col_lower = col.lower()
        score = 0
        for i, kw in enumerate(priority_keywords):
            if kw in col_lower:
                score += (len(priority_keywords) - i) * 10
        
        # Penalize if every row is unique (like arbitrary IDs/emails/names unless no others exist)
        nunique = df[col].nunique()
        if len(df) > 10 and nunique == len(df):
            score -= 15
        elif 2 <= nunique <= 50:
            score += 5

        scored.append((col, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return [col for col, _ in scored]

def generate_kpis(df: pd.DataFrame, col_types: Dict[str, str], quality: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Deterministically generates relevant KPI cards for the dataset.
    """
    total_records = len(df)
    kpis = []

    # KPI 1: Total Records
    kpis.append({
        "id": "total_records",
        "label": "Total Records",
        "value": f"{total_records:,}",
        "raw_value": total_records,
        "type": "count",
        "icon": "Database",
        "subtitle": f"{len(df.columns)} Columns Analyzed"
    })

    # KPI 2 & 3: Primary Numeric metrics (Sum / Average / Max)
    primary_numerics = find_primary_metric_columns(df, col_types)
    if primary_numerics:
        lead_num = primary_numerics[0]
        lead_sum = float(pd.to_numeric(df[lead_num], errors='coerce').sum())
        lead_avg = float(pd.to_numeric(df[lead_num], errors='coerce').mean())
        lead_max = float(pd.to_numeric(df[lead_num], errors='coerce').max())

        # Formatter helper
        def fmt_val(v):
            if abs(v) >= 1_000_000:
                return f"{v/1_000_000:.2f}M"
            elif abs(v) >= 1_000:
                return f"{v:,.0f}"
            else:
                return f"{v:.2f}"

        kpis.append({
            "id": f"total_{lead_num.lower()}",
            "label": f"Total {lead_num}",
            "value": fmt_val(lead_sum),
            "raw_value": lead_sum,
            "type": "currency_or_number",
            "icon": "TrendingUp",
            "subtitle": f"Sum across {total_records:,} records"
        })

        kpis.append({
            "id": f"avg_{lead_num.lower()}",
            "label": f"Average {lead_num}",
            "value": fmt_val(lead_avg),
            "raw_value": lead_avg,
            "type": "average",
            "icon": "Activity",
            "subtitle": f"Max: {fmt_val(lead_max)}"
        })

        # If there's a second distinct numeric metric (e.g., Profit or Quantity)
        if len(primary_numerics) > 1:
            sec_num = primary_numerics[1]
            sec_sum = float(pd.to_numeric(df[sec_num], errors='coerce').sum())
            kpis.append({
                "id": f"total_{sec_num.lower()}",
                "label": f"Total {sec_num}",
                "value": fmt_val(sec_sum),
                "raw_value": sec_sum,
                "type": "currency_or_number",
                "icon": "BarChart3",
                "subtitle": f"Mean: {fmt_val(float(pd.to_numeric(df[sec_num], errors='coerce').mean()))}"
            })

    # KPI: Prominent Category Unique Count
    primary_cats = find_primary_category_columns(df, col_types)
    if primary_cats:
        lead_cat = primary_cats[0]
        cat_unique = int(df[lead_cat].nunique())
        top_val = df[lead_cat].mode().iloc[0] if not df[lead_cat].empty and not pd.isna(df[lead_cat].mode().iloc[0]) else "N/A"
        kpis.append({
            "id": f"unique_{lead_cat.lower()}",
            "label": f"Unique {lead_cat}",
            "value": f"{cat_unique:,}",
            "raw_value": cat_unique,
            "type": "distinct",
            "icon": "Layers",
            "subtitle": f"Top: {str(top_val)[:20]}"
        })

    # KPI: Quality Health
    health_score = quality.get("health_score", 100)
    health_status = quality.get("health_status", "GOOD")
    missing_pct = quality.get("total_missing_pct", 0.0)
    kpis.append({
        "id": "data_health",
        "label": "Data Quality Score",
        "value": f"{health_score}%",
        "raw_value": health_score,
        "type": "health",
        "icon": "ShieldCheck",
        "subtitle": f"{health_status} ({missing_pct}% missing)"
    })

    return kpis

def generate_deterministic_summary(df: pd.DataFrame, col_types: Dict[str, str], quality: Dict[str, Any]) -> List[str]:
    """
    Generates deterministic summary statements using predefined templates and Python calculations.
    Strictly NO AI is used.
    """
    rows = len(df)
    cols = len(df.columns)
    summary_bullets = []

    # 1. Dataset volume & shape
    num_numeric = sum(1 for t in col_types.values() if t == "numeric")
    num_cat = sum(1 for t in col_types.values() if t == "categorical")
    num_date = sum(1 for t in col_types.values() if t == "datetime")

    summary_bullets.append(
        f"Dataset contains {rows:,} records across {cols} columns: "
        f"{num_numeric} numeric, {num_cat} categorical, and {num_date} date/time attributes."
    )

    # 2. Leading numeric details
    lead_numerics = find_primary_metric_columns(df, col_types)
    if lead_numerics:
        for num_col in lead_numerics[:2]:
            s_clean = pd.to_numeric(df[num_col], errors='coerce').dropna()
            if len(s_clean) > 0:
                s_sum = s_clean.sum()
                s_mean = s_clean.mean()
                s_min = s_clean.min()
                s_max = s_clean.max()
                summary_bullets.append(
                    f"'{num_col}' totals {s_sum:,.2f} with an average of {s_mean:,.2f}, ranging from {s_min:,.2f} to {s_max:,.2f}."
                )

    # 3. Categorical distribution highlights
    lead_cats = find_primary_category_columns(df, col_types)
    if lead_cats:
        for cat_col in lead_cats[:2]:
            s_clean = df[cat_col].dropna().astype(str)
            if len(s_clean) > 0:
                nunique = s_clean.nunique()
                vc = s_clean.value_counts()
                top_name = vc.index[0]
                top_cnt = vc.iloc[0]
                top_pct = (top_cnt / len(s_clean)) * 100
                summary_bullets.append(
                    f"'{cat_col}' encompasses {nunique:,} unique categories, led by '{top_name}' representing {top_cnt:,} records ({top_pct:.1f}%)."
                )

    # 4. Date span highlights
    date_cols = [c for c, t in col_types.items() if t == "datetime"]
    if date_cols:
        dt_col = date_cols[0]
        s_dt = pd.to_datetime(df[dt_col], errors='coerce').dropna()
        if len(s_dt) > 0:
            min_d = s_dt.min().strftime('%Y-%m-%d')
            max_d = s_dt.max().strftime('%Y-%m-%d')
            span_days = (s_dt.max() - s_dt.min()).days
            summary_bullets.append(
                f"Timeline on '{dt_col}' spans {span_days:,} days from {min_d} to {max_d}."
            )

    # 5. Data hygiene & health
    missing_cells = quality.get("total_missing_cells", 0)
    missing_pct = quality.get("total_missing_pct", 0.0)
    duplicates = quality.get("duplicate_rows_count", 0)
    health_score = quality.get("health_score", 100)

    summary_bullets.append(
        f"Data integrity score is {health_score}/100 with {duplicates:,} duplicate rows and "
        f"{missing_cells:,} missing data cells ({missing_pct}% of total cells)."
    )

    return summary_bullets

def build_filter_definitions(df: pd.DataFrame, col_types: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Builds filter definitions for categorical, numeric, and date columns.
    """
    filters = []

    for col, c_type in col_types.items():
        if c_type == "categorical":
            # Only generate categorical filter if cardinality is reasonable (2 to 80)
            nunique = df[col].nunique(dropna=True)
            if 2 <= nunique <= 80:
                top_vals = df[col].dropna().astype(str).value_counts().head(50)
                options = [{"label": f"{val} ({cnt})", "value": val} for val, cnt in top_vals.items()]
                filters.append({
                    "column": col,
                    "type": "categorical",
                    "options": options
                })
        elif c_type == "numeric":
            s_clean = pd.to_numeric(df[col], errors='coerce').dropna()
            if len(s_clean) > 0:
                min_v = float(s_clean.min())
                max_v = float(s_clean.max())
                filters.append({
                    "column": col,
                    "type": "numeric",
                    "min": min_v,
                    "max": max_v,
                    "step": 1 if s_clean.dtype == int or (max_v - min_v > 100) else 0.1
                })
        elif c_type == "datetime":
            s_dt = pd.to_datetime(df[col], errors='coerce').dropna()
            if len(s_dt) > 0:
                filters.append({
                    "column": col,
                    "type": "datetime",
                    "min": s_dt.min().strftime('%Y-%m-%d'),
                    "max": s_dt.max().strftime('%Y-%m-%d')
                })

    return filters

def analyze_sheet(df: pd.DataFrame, sheet_name: str) -> Dict[str, Any]:
    """
    Full automated analysis of a spreadsheet sheet.
    """
    total_rows = len(df)
    total_cols = len(df.columns)

    if total_rows == 0 or total_cols == 0:
        return {
            "sheet_name": sheet_name,
            "total_rows": total_rows,
            "total_cols": total_cols,
            "columns": [],
            "column_types": {},
            "numeric_stats": {},
            "categorical_stats": {},
            "datetime_stats": {},
            "data_quality": {"health_score": 0, "health_status": "EMPTY", "columns": []},
            "kpis": [],
            "summary": ["Sheet is empty."],
            "filter_definitions": []
        }

    col_types = calculate_column_types(df)

    numeric_stats = {}
    categorical_stats = {}
    datetime_stats = {}

    for col, c_type in col_types.items():
        if c_type == "numeric":
            numeric_stats[col] = calculate_numeric_stats(df[col])
        elif c_type == "categorical":
            categorical_stats[col] = calculate_categorical_stats(df[col])
        elif c_type == "datetime":
            datetime_stats[col] = calculate_datetime_stats(df[col])

    data_quality = calculate_data_quality(df, col_types)
    kpis = generate_kpis(df, col_types, data_quality)
    summary = generate_deterministic_summary(df, col_types, data_quality)
    filter_definitions = build_filter_definitions(df, col_types)

    return {
        "sheet_name": sheet_name,
        "total_rows": total_rows,
        "total_cols": total_cols,
        "columns": list(df.columns),
        "column_types": col_types,
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats,
        "datetime_stats": datetime_stats,
        "data_quality": data_quality,
        "kpis": kpis,
        "summary": summary,
        "filter_definitions": filter_definitions
    }
