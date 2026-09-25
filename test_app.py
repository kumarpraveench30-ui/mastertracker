import time
import subprocess
import sys
import os

def test_full_pipeline():
    print("Testing backend and static frontend integration...")
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] GET /api/health:", res.json()["privacy"])

    # 2. Frontend root HTML
    res = client.get("/")
    assert res.status_code == 200, f"Root page failed: {res.status_code}"
    assert "ExcelVibe" in res.text, "Title not in index.html"
    print("[PASS] GET / (Serves built frontend HTML locally)")

    # 3. Load Sample Sales dataset
    res = client.get("/api/sample/sales")
    assert res.status_code == 200, f"Sample sales failed: {res.text}"
    sales_data = res.json()
    dataset_id = sales_data["dataset_id"]
    assert sales_data["analysis"]["total_rows"] == 1200
    assert len(sales_data["kpis"]) > 0
    assert len(sales_data["recommended_charts"]) > 0
    print(f"[PASS] GET /api/sample/sales: {sales_data['analysis']['total_rows']} rows, {len(sales_data['kpis'])} KPIs, {len(sales_data['recommended_charts'])} charts")

    # 4. Table data query
    res = client.post("/api/table-data", json={
        "dataset_id": dataset_id,
        "page": 1,
        "page_size": 10,
        "search": "Technology",
        "filters": {}
    })
    assert res.status_code == 200, f"Table data failed: {res.text}"
    table_res = res.json()
    assert table_res["filtered_rows"] > 0
    assert len(table_res["rows"]) <= 10
    print(f"[PASS] POST /api/table-data (Filtered to {table_res['filtered_rows']} matching 'Technology')")

    # 5. Chart Builder Query
    res = client.post("/api/query-chart", json={
        "dataset_id": dataset_id,
        "x_col": "Category",
        "y_col": "Sales",
        "chart_type": "bar",
        "aggregation": "sum",
        "filters": {},
        "limit": 10
    })
    assert res.status_code == 200, f"Query chart failed: {res.text}"
    chart_res = res.json()
    assert len(chart_res["data"]) > 0
    print(f"[PASS] POST /api/query-chart: Aggregate Sales by Category yielded {len(chart_res['data'])} bars")

    # 6. Apply Filter
    res = client.post("/api/filter", json={
        "dataset_id": dataset_id,
        "filters": {"Region": ["Europe", "North America"]}
    })
    assert res.status_code == 200, f"Apply filter failed: {res.text}"
    filter_res = res.json()
    assert filter_res["filtered_rows"] < 1200
    print(f"[PASS] POST /api/filter: Filtered rows: {filter_res['filtered_rows']} / {filter_res['total_rows']}")

    # 7. Test Export to Excel and CSV
    res = client.post("/api/export", json={
        "dataset_id": dataset_id,
        "filters": {},
        "export_format": "excel"
    })
    assert res.status_code == 200, f"Excel export failed: {res.status_code}"
    assert len(res.content) > 1000
    print(f"[PASS] POST /api/export (Excel .xlsx): {len(res.content)} bytes generated")

    res = client.post("/api/export", json={
        "dataset_id": dataset_id,
        "filters": {},
        "export_format": "csv"
    })
    assert res.status_code == 200, f"CSV export failed: {res.status_code}"
    assert len(res.content) > 1000
    print(f"[PASS] POST /api/export (CSV .csv): {len(res.content)} bytes generated")

    # 8. Load Sample Employee dataset
    res = client.get("/api/sample/employee")
    assert res.status_code == 200, f"Sample employee failed: {res.text}"
    emp_data = res.json()
    assert emp_data["analysis"]["total_rows"] == 450
    assert len(emp_data["kpis"]) > 0
    print(f"[PASS] GET /api/sample/employee: {emp_data['analysis']['total_rows']} rows, {len(emp_data['kpis'])} KPIs, {len(emp_data['recommended_charts'])} charts")

    # 9. Test Data Quality on Employee Dataset
    quality = emp_data["analysis"]["data_quality"]
    assert "health_score" in quality
    assert len(quality["columns"]) == emp_data["analysis"]["total_cols"]
    print(f"[PASS] Data Quality audit: Health score {quality['health_score']}% ({quality['health_status']})")

    print("\nALL BACKEND & INTEGRATION TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_full_pipeline()
