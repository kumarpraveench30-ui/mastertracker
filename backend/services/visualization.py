from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

def apply_filters_to_dataframe(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    """
    Applies categorical, numeric range, and date range filters to a DataFrame.
    filters example:
    {
       "Region": ["North", "South"],
       "Sales": {"min": 100, "max": 5000},
       "Date": {"min": "2023-01-01", "max": "2023-12-31"},
       "search": "widget"
    }
    """
    filtered = df.copy()

    for col, condition in filters.items():
        if col == "search":
            search_str = str(condition).strip().lower()
            if search_str:
                # Search across all string representation of columns
                mask = pd.Series(False, index=filtered.index)
                for c in filtered.columns:
                    mask = mask | filtered[c].astype(str).str.lower().str.contains(search_str, na=False)
                filtered = filtered[mask]
            continue

        if col not in filtered.columns:
            continue

        if isinstance(condition, list):
            # Categorical multi-select
            if len(condition) > 0:
                filtered = filtered[filtered[col].astype(str).isin([str(x) for x in condition])]
        elif isinstance(condition, dict):
            # Numeric or date range
            min_val = condition.get("min")
            max_val = condition.get("max")
            
            if pd.api.types.is_datetime64_any_dtype(filtered[col]):
                if min_val:
                    filtered = filtered[filtered[col] >= pd.to_datetime(min_val)]
                if max_val:
                    filtered = filtered[filtered[col] <= pd.to_datetime(max_val)]
            else:
                num_series = pd.to_numeric(filtered[col], errors='coerce')
                if min_val is not None:
                    filtered = filtered[num_series >= float(min_val)]
                if max_val is not None:
                    filtered = filtered[num_series <= float(max_val)]

    return filtered

def aggregate_chart_data(
    df: pd.DataFrame,
    x_col: str,
    y_col: Optional[str] = None,
    group_col: Optional[str] = None,
    chart_type: str = "bar",
    aggregation: str = "sum",
    limit: int = 50
) -> Dict[str, Any]:
    """
    Performs deterministic aggregation based on chart type, axes, and grouping.
    Returns data formatted for Recharts.
    """
    if df.empty or x_col not in df.columns:
        return {"data": [], "series_keys": [], "chart_type": chart_type}

    # Handle scatter plot (unaggregated or sampled pairs of numeric values)
    if chart_type.lower() == "scatter":
        if not y_col or y_col not in df.columns:
            return {"data": [], "series_keys": [], "chart_type": chart_type}
        
        cols_to_select = [x_col, y_col]
        if group_col and group_col in df.columns and group_col not in cols_to_select:
            cols_to_select.append(group_col)
            
        valid = df[cols_to_select].dropna()
        if len(valid) > 500:
            # Sample for chart rendering performance
            valid = valid.sample(n=500, random_state=42)
        
        points = []
        for _, row in valid.iterrows():
            try:
                x_val = float(row[x_col])
                y_val = float(row[y_col])
                pt = {"x": round(x_val, 2), "y": round(y_val, 2)}
                if group_col and group_col in df.columns:
                    pt["group"] = str(row[group_col])
                points.append(pt)
            except (ValueError, TypeError):
                continue

        return {
            "data": points,
            "series_keys": ["y"],
            "chart_type": "scatter",
            "x_col": x_col,
            "y_col": y_col
        }

    # Aggregation function mapping
    agg_funcs = {
        "sum": "sum",
        "average": "mean",
        "mean": "mean",
        "count": "count",
        "min": "min",
        "max": "max",
        "median": "median"
    }
    agg_op = agg_funcs.get(aggregation.lower(), "sum")

    # If count aggregation without y_col, or if y_col not given
    if not y_col or agg_op == "count":
        if group_col and group_col in df.columns and group_col != x_col:
            grouped = df.groupby([x_col, group_col]).size().unstack(fill_value=0)
            series_keys = [str(c) for c in grouped.columns]
            chart_data = []
            for idx, row in grouped.head(limit).iterrows():
                item = {"name": str(idx)}
                for k in series_keys:
                    item[k] = int(row[k])
                chart_data.append(item)
            return {"data": chart_data, "series_keys": series_keys, "chart_type": chart_type}
        else:
            vc = df[x_col].value_counts().head(limit)
            chart_data = [{"name": str(k)[:30], "value": int(v)} for k, v in vc.items()]
            return {"data": chart_data, "series_keys": ["value"], "chart_type": chart_type}

    # Prepare numeric y column
    work_df = df.copy()
    work_df["_numeric_y"] = pd.to_numeric(work_df[y_col], errors='coerce')
    work_df = work_df.dropna(subset=["_numeric_y"])

    # If x is datetime, format nicely (e.g. YYYY-MM or YYYY-MM-DD)
    if pd.api.types.is_datetime64_any_dtype(work_df[x_col]):
        # Check time span to format
        time_span = (work_df[x_col].max() - work_df[x_col].min()).days if len(work_df) > 0 else 0
        if time_span > 365 * 2:
            work_df["_x_fmt"] = work_df[x_col].dt.strftime("%Y")
        elif time_span > 60:
            work_df["_x_fmt"] = work_df[x_col].dt.strftime("%Y-%m")
        else:
            work_df["_x_fmt"] = work_df[x_col].dt.strftime("%Y-%m-%d")
        x_group_col = "_x_fmt"
    else:
        x_group_col = x_col

    # Grouped aggregation with optional grouping column
    if group_col and group_col in work_df.columns and group_col != x_col:
        # Pivot table
        pivot = pd.pivot_table(
            work_df,
            index=x_group_col,
            columns=group_col,
            values="_numeric_y",
            aggfunc=agg_op,
            fill_value=0
        )
        # Limit groups to top 6 by total value to prevent clutter
        top_groups = pivot.sum().nlargest(6).index
        pivot = pivot[top_groups]

        series_keys = [str(col) for col in pivot.columns]
        chart_data = []
        for idx, row in pivot.head(limit).iterrows():
            item = {"name": str(idx)[:30]}
            for k in series_keys:
                item[k] = round(float(row[k]), 2)
            chart_data.append(item)

        return {
            "data": chart_data,
            "series_keys": series_keys,
            "chart_type": chart_type,
            "x_col": x_col,
            "y_col": y_col,
            "group_col": group_col,
            "aggregation": aggregation
        }
    else:
        # Single dimension aggregation
        grouped = work_df.groupby(x_group_col)["_numeric_y"].agg(agg_op)
        if not pd.api.types.is_datetime64_any_dtype(work_df[x_col]):
            grouped = grouped.sort_values(ascending=False)
        else:
            grouped = grouped.sort_index()

        chart_data = []
        for k, v in grouped.head(limit).items():
            chart_data.append({
                "name": str(k)[:30],
                "value": round(float(v), 2)
            })

        return {
            "data": chart_data,
            "series_keys": ["value"],
            "chart_type": chart_type,
            "x_col": x_col,
            "y_col": y_col,
            "aggregation": aggregation
        }

def generate_recommended_charts(
    df: pd.DataFrame,
    col_types: Dict[str, str],
    primary_numerics: List[str],
    primary_cats: List[str]
) -> List[Dict[str, Any]]:
    """
    Deterministically recommends the most insightful charts for the given dataset.
    Follows prompt rules:
    - Date + Numeric -> Line chart
    - Category + Numeric -> Bar chart / Horizontal bar chart
    - Category proportions -> Donut / Pie chart (if <= 10 categories)
    - Numeric + Numeric -> Scatter plot
    - Multiple categories + numeric -> Grouped / Stacked bar chart
    """
    recommendations = []
    date_cols = [c for c, t in col_types.items() if t == "datetime"]
    numeric_cols = [c for c, t in col_types.items() if t == "numeric"]
    cat_cols = [c for c, t in col_types.items() if t == "categorical"]

    # 1. Date + Primary Numeric (Line / Area Chart)
    if date_cols and primary_numerics:
        d_col = date_cols[0]
        n_col = primary_numerics[0]
        chart_result = aggregate_chart_data(df, d_col, n_col, chart_type="line", aggregation="sum")
        if chart_result["data"]:
            recommendations.append({
                "id": "rec_trend_time",
                "title": f"{n_col} Over Time",
                "description": f"Historical trend of {n_col} across {d_col}",
                "chart_type": "line",
                "x_col": d_col,
                "y_col": n_col,
                "aggregation": "sum",
                "chart_data": chart_result
            })

    # 2. Category + Primary Numeric (Bar Chart)
    if primary_cats and primary_numerics:
        c_col = primary_cats[0]
        n_col = primary_numerics[0]
        chart_result = aggregate_chart_data(df, c_col, n_col, chart_type="bar", aggregation="sum", limit=15)
        if chart_result["data"]:
            recommendations.append({
                "id": "rec_cat_bar",
                "title": f"{n_col} by {c_col}",
                "description": f"Total {n_col} grouped by {c_col}",
                "chart_type": "bar",
                "x_col": c_col,
                "y_col": n_col,
                "aggregation": "sum",
                "chart_data": chart_result
            })

    # 3. Small Category Proportions (Donut Chart)
    small_cats = [c for c in primary_cats if 2 <= df[c].nunique() <= 8]
    if small_cats and primary_numerics:
        c_col = small_cats[0]
        n_col = primary_numerics[0]
        chart_result = aggregate_chart_data(df, c_col, n_col, chart_type="donut", aggregation="sum", limit=8)
        if chart_result["data"]:
            recommendations.append({
                "id": "rec_cat_donut",
                "title": f"{c_col} Share of {n_col}",
                "description": f"Proportional distribution of {n_col} among {c_col}",
                "chart_type": "donut",
                "x_col": c_col,
                "y_col": n_col,
                "aggregation": "sum",
                "chart_data": chart_result
            })

    # 4. Grouped Category Comparison (Grouped Bar Chart)
    if len(primary_cats) >= 2 and primary_numerics:
        c1 = primary_cats[0]
        c2 = primary_cats[1]
        # Only group if both have reasonable cardinality
        if df[c1].nunique() <= 12 and df[c2].nunique() <= 6:
            n_col = primary_numerics[0]
            chart_result = aggregate_chart_data(df, c1, n_col, group_col=c2, chart_type="grouped_bar", aggregation="sum", limit=10)
            if chart_result["data"]:
                recommendations.append({
                    "id": "rec_grouped_bar",
                    "title": f"{n_col} by {c1} & {c2}",
                    "description": f"Multi-dimensional breakdown of {n_col}",
                    "chart_type": "grouped_bar",
                    "x_col": c1,
                    "y_col": n_col,
                    "group_col": c2,
                    "aggregation": "sum",
                    "chart_data": chart_result
                })

    # 5. Numeric + Numeric (Scatter Plot)
    if len(primary_numerics) >= 2:
        n1 = primary_numerics[0]
        n2 = primary_numerics[1]
        group = primary_cats[0] if primary_cats else None
        chart_result = aggregate_chart_data(df, n1, n2, group_col=group, chart_type="scatter")
        if chart_result["data"]:
            recommendations.append({
                "id": "rec_scatter",
                "title": f"Correlation: {n1} vs {n2}",
                "description": f"Distribution and correlation between {n1} and {n2}",
                "chart_type": "scatter",
                "x_col": n1,
                "y_col": n2,
                "group_col": group,
                "chart_data": chart_result
            })

    # 6. Secondary Metric Breakdown (Horizontal Bar Chart)
    if len(primary_numerics) >= 2 and primary_cats:
        c_col = primary_cats[0]
        n_col = primary_numerics[1]
        chart_result = aggregate_chart_data(df, c_col, n_col, chart_type="horizontal_bar", aggregation="mean", limit=10)
        if chart_result["data"]:
            recommendations.append({
                "id": "rec_sec_metric",
                "title": f"Average {n_col} by {c_col}",
                "description": f"Mean {n_col} comparative ranking",
                "chart_type": "horizontal_bar",
                "x_col": c_col,
                "y_col": n_col,
                "aggregation": "average",
                "chart_data": chart_result
            })

    return recommendations
