import math
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

def calculate_column_types(df: pd.DataFrame) -> Dict[str, str]:
    """
    Classifies each column as 'numeric', 'categorical', 'datetime', or 'boolean'.
    """
    col_types = {}
    for col in df.columns:
        s = df[col]
        if pd.api.types.is_datetime64_any_dtype(s):
            col_types[col] = "datetime"
        elif pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            # If numeric has only 0 and 1 and length > 10, could still be numeric, but check uniqueness
            col_types[col] = "numeric"
        elif pd.api.types.is_bool_dtype(s):
            col_types[col] = "boolean"
        else:
            # Check if all non-null values can be converted to datetime
            non_nulls = s.dropna()
            if len(non_nulls) > 0 and len(non_nulls) <= 1000:
                try:
                    pd.to_datetime(non_nulls, format='mixed')
                    col_types[col] = "datetime"
                    continue
                except Exception:
                    pass
            col_types[col] = "categorical"
    return col_types

def calculate_numeric_stats(series: pd.Series) -> Dict[str, Any]:
    """
    Calculates detailed descriptive statistics for a numeric column.
    """
    s_clean = pd.to_numeric(series, errors='coerce').dropna()
    count = int(len(s_clean))
    if count == 0:
        return {
            "count": 0,
            "sum": 0,
            "mean": 0,
            "median": 0,
            "min": 0,
            "max": 0,
            "std": 0,
            "q25": 0,
            "q75": 0,
            "iqr": 0,
            "outliers_count": 0,
            "outlier_lower_bound": 0,
            "outlier_upper_bound": 0
        }

    s_sum = float(s_clean.sum())
    mean = float(s_clean.mean())
    median = float(s_clean.median())
    s_min = float(s_clean.min())
    s_max = float(s_clean.max())
    std = float(s_clean.std(ddof=1)) if count > 1 else 0.0
    if math.isnan(std):
        std = 0.0

    q25 = float(s_clean.quantile(0.25))
    q75 = float(s_clean.quantile(0.75))
    iqr = q75 - q25
    lower_bound = q25 - 1.5 * iqr
    upper_bound = q75 + 1.5 * iqr

    outliers = s_clean[(s_clean < lower_bound) | (s_clean > upper_bound)]
    outliers_count = int(len(outliers))

    return {
        "count": count,
        "sum": round(s_sum, 2),
        "mean": round(mean, 2),
        "median": round(median, 2),
        "min": round(s_min, 2),
        "max": round(s_max, 2),
        "std": round(std, 2),
        "q25": round(q25, 2),
        "q75": round(q75, 2),
        "iqr": round(iqr, 2),
        "outliers_count": outliers_count,
        "outlier_lower_bound": round(lower_bound, 2),
        "outlier_upper_bound": round(upper_bound, 2)
    }

def calculate_categorical_stats(series: pd.Series, max_unique_distribution: int = 15) -> Dict[str, Any]:
    """
    Calculates unique counts, top frequencies, and distributions for categorical columns.
    """
    s_clean = series.dropna().astype(str)
    total_non_null = len(s_clean)
    if total_non_null == 0:
        return {
            "unique_count": 0,
            "top_values": [],
            "distribution": []
        }

    val_counts = s_clean.value_counts()
    unique_count = int(len(val_counts))

    top_values = []
    for val, count in val_counts.head(5).items():
        pct = round((count / total_non_null) * 100, 1)
        top_values.append({
            "value": str(val),
            "count": int(count),
            "percentage": pct
        })

    # Distribution for chart display
    distribution = []
    for val, count in val_counts.head(max_unique_distribution).items():
        distribution.append({
            "category": str(val)[:30],  # truncate long names
            "count": int(count)
        })

    return {
        "unique_count": unique_count,
        "top_values": top_values,
        "distribution": distribution
    }

def calculate_datetime_stats(series: pd.Series) -> Dict[str, Any]:
    """
    Calculates min/max dates, date span, and time-based distributions.
    """
    s_dt = pd.to_datetime(series, errors='coerce').dropna()
    count = len(s_dt)
    if count == 0:
        return {
            "count": 0,
            "min_date": None,
            "max_date": None,
            "span_days": 0,
            "by_year": [],
            "by_month": []
        }

    min_date = s_dt.min()
    max_date = s_dt.max()
    span_days = int((max_date - min_date).days) if pd.notna(min_date) and pd.notna(max_date) else 0

    # Year distribution
    year_counts = s_dt.dt.year.value_counts().sort_index()
    by_year = [{"year": str(y), "count": int(c)} for y, c in year_counts.items()]

    # Month distribution (formatted YYYY-MM)
    month_counts = s_dt.dt.to_period("M").value_counts().sort_index()
    by_month = [{"period": str(p), "count": int(c)} for p, c in month_counts.head(24).items()]

    return {
        "count": count,
        "min_date": min_date.strftime("%Y-%m-%d") if pd.notna(min_date) else None,
        "max_date": max_date.strftime("%Y-%m-%d") if pd.notna(max_date) else None,
        "span_days": span_days,
        "by_year": by_year,
        "by_month": by_month
    }

def calculate_data_quality(df: pd.DataFrame, col_types: Dict[str, str]) -> Dict[str, Any]:
    """
    Computes data quality metrics: missing values, duplicates, outliers, empty columns, and health score.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols if total_rows > 0 and total_cols > 0 else 0

    if total_rows == 0 or total_cols == 0:
        return {
            "health_score": 0,
            "health_status": "ERROR",
            "duplicate_rows_count": 0,
            "duplicate_rows_pct": 0.0,
            "total_missing_cells": 0,
            "total_missing_pct": 0.0,
            "columns": []
        }

    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = round((duplicate_rows / total_rows) * 100, 2)

    total_missing = int(df.isna().sum().sum())
    total_missing_pct = round((total_missing / total_cells) * 100, 2) if total_cells > 0 else 0.0

    columns_quality = []
    total_outliers = 0

    for col in df.columns:
        c_type = col_types.get(col, "categorical")
        missing_count = int(df[col].isna().sum())
        missing_pct = round((missing_count / total_rows) * 100, 2)
        unique_vals = int(df[col].nunique(dropna=True))

        outliers_count = 0
        if c_type == "numeric":
            num_stats = calculate_numeric_stats(df[col])
            outliers_count = num_stats.get("outliers_count", 0)
            total_outliers += outliers_count

        # Status: GOOD, WARNING, ATTENTION
        if missing_pct == 0 and (outliers_count == 0 or outliers_count <= total_rows * 0.05):
            status = "GOOD"
        elif missing_pct > 20 or outliers_count > total_rows * 0.15:
            status = "WARNING"
        elif missing_pct > 0 or outliers_count > 0:
            status = "ATTENTION"
        else:
            status = "GOOD"

        columns_quality.append({
            "column": col,
            "type": c_type,
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "unique_count": unique_vals,
            "is_empty": missing_count == total_rows,
            "is_constant": unique_vals <= 1 and total_rows > 1,
            "outliers_count": outliers_count,
            "status": status
        })

    # Overall Health Score (0-100)
    # Deductions:
    # - Missing data percentage (up to -40 points)
    # - Duplicate percentage (up to -20 points)
    # - Empty columns (-10 points per empty col, max -20)
    # - Heavy outliers (-10 points)
    completeness_score = max(0, 100 - (total_missing_pct * 1.5))
    uniqueness_score = max(0, 100 - (duplicate_pct * 2.0))
    empty_cols = sum(1 for c in columns_quality if c["is_empty"])
    empty_col_penalty = min(20, empty_cols * 10)

    health_score = int(round((completeness_score * 0.6) + (uniqueness_score * 0.4) - empty_col_penalty))
    health_score = max(0, min(100, health_score))

    if health_score >= 85:
        overall_status = "EXCELLENT"
    elif health_score >= 70:
        overall_status = "GOOD"
    elif health_score >= 50:
        overall_status = "WARNING"
    else:
        overall_status = "CRITICAL"

    return {
        "health_score": health_score,
        "health_status": overall_status,
        "duplicate_rows_count": duplicate_rows,
        "duplicate_rows_pct": duplicate_pct,
        "total_missing_cells": total_missing,
        "total_missing_pct": total_missing_pct,
        "total_outliers_count": total_outliers,
        "empty_columns_count": empty_cols,
        "columns": columns_quality
    }
