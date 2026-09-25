# ExcelVibe Analytics — Offline-First Excel Data Visualization Platform

> **100% Local & Offline — Your data never leaves this computer.**  
> Zero external APIs • Zero cloud services • Zero network calls • Zero AI/LLM dependencies • 100% Deterministic Calculations

---

## 🌟 Overview

**ExcelVibe Analytics** is a high-performance, offline-first web application for analyzing, visualizing, and exploring Excel spreadsheets (`.xlsx` and `.xls`). Designed for security-conscious professionals and offline environments, it runs entirely on `localhost`.

All computations—statistical distributions, correlation metrics, rule-based chart recommendations, and data quality scoring—are performed deterministically on your machine using **Python, FastAPI, and Pandas**, with interactive charts rendered client-side via **Recharts** and **React**.

---

## 🚀 Key Features

### 1. 📂 Drag-and-Drop Excel Upload & Multi-Sheet Support
- Supports both modern `.xlsx` (Excel 2007+) and legacy `.xls` workbooks.
- Seamless workbook inspection: detects sheet names, row/col counts, column headers, and data types.
- Switch between sheets effortlessly in multi-tab workbooks.
- Prominent privacy badge: *"Local processing — your uploaded data never leaves this computer."*
- **1-Click Pre-loaded Samples**: Test instantly with built-in Sales and Employee HR datasets.

### 2. ⚡ Automatic Data Analysis & Dynamic KPIs
- **Numeric Columns**: Count, Sum, Mean, Median, Min, Max, Standard Deviation, and IQR bounds.
- **Categorical Columns**: Unique count, frequency distribution, and dominant category share.
- **Date/Time Columns**: Timeline span, earliest and latest dates, and temporal groupings (by year/month).
- **Sensible Dynamic KPIs**: Automatically computes contextual metrics (e.g., Total Sales, Average Margin, Unique Customers, Quality Health Score) tailored to the uploaded dataset.

### 3. 🧠 Deterministic Dataset Summary (Zero AI / Zero LLMs)
- Produces clean, readable analytical summaries generated purely via deterministic Python logic and predefined templates.
- Grounded strictly in actual numbers with zero hallucination.

### 4. 📊 Auto-Recommended Visualizations
- Rule-based visualization recommendation engine:
  - **Date + Numeric** $\rightarrow$ Line Chart / Area Chart (trends over time)
  - **Category + Numeric** $\rightarrow$ Vertical / Horizontal Bar Chart
  - **Category Proportions** $\rightarrow$ Donut / Pie Chart (cardinality $\le$ 8)
  - **Numeric + Numeric** $\rightarrow$ Scatter Plot (correlation analysis)
  - **Multi-Category + Numeric** $\rightarrow$ Grouped / Stacked Bar Chart

### 5. 🛠️ Interactive Chart Builder ("Build Your Chart")
- Freely build custom charts with immediate live updates:
  - **Chart Types**: Bar, Horizontal Bar, Line, Area, Pie, Donut, Scatter.
  - **Axes Selection**: Choose any X-Axis and Y-Axis columns.
  - **Multi-Series Grouping**: Group by secondary categorical dimensions.
  - **Aggregations**: `Sum`, `Average (Mean)`, `Count`, `Median`, `Min`, `Max`.
  - **Point Limits**: Top 10, 25, 50, or 100 points.

### 6. 🔍 Real-Time Interactive Filters
- **Categorical**: Multi-select pill filters with record counts.
- **Numeric**: Min/Max numerical range inputs.
- **Date**: Start and End date range selectors.
- Active filter badges with one-click removal and "Clear All".
- Applying filters dynamically updates **KPI cards, summary calculations, recommended charts, chart builder, and data table**.

### 7. 📑 Spreadsheet-Style Data Table
- High-performance server-side paginated table (handles large datasets smoothly).
- Global text search across all columns.
- Click-to-sort column headers (ascending / descending).
- Column visibility toggles (customize which fields to display).
- Row count & filtered count indicator (`Showing 1–25 of 490 rows (filtered from 1,200)`).
- **One-Click Local Export**: Download filtered data as `.xlsx` (formatted with styled headers) or `.csv`.

### 8. 🛡️ Data Quality & Anomaly Audit Panel
- Overall Health Score (0–100%) and Status (`EXCELLENT`, `GOOD`, `WARNING`, `CRITICAL`).
- Duplicate row detection and missing cells rate.
- Outlier detection via the **Interquartile Range (IQR $\times$ 1.5)** rule.
- Field-by-field audit table with color-coded status badges (`GOOD`, `WARNING`, `ATTENTION`).

---

## 📁 Project Structure

```
Work/
├── backend/
│   ├── main.py                     # FastAPI server and static asset routes
│   ├── requirements.txt            # Python dependencies (FastAPI, Pandas, openpyxl, etc.)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── excel_reader.py         # Multi-sheet Excel reader and session store
│   │   ├── statistics.py          # Descriptive stats, data quality, IQR outliers
│   │   ├── analyzer.py            # Automated sheet profiler, KPIs, summary generator
│   │   ├── visualization.py       # Rule-based chart recommendations and aggregations
│   │   └── exporter.py             # Formatted Excel (.xlsx) and CSV (.csv) export
│   └── sample_data/
│       ├── create_samples.py       # Generates sample Sales and Employee datasets
│       ├── sample_sales_data.xlsx
│       └── sample_employee_data.xlsx
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts              # Vite config with API proxy and Tailwind plugin
│   ├── tsconfig.json
│   ├── dist/                       # Pre-compiled, production-ready static assets
│   └── src/
│       ├── types/index.ts          # TypeScript type definitions
│       ├── services/api.ts         # Local backend API client
│       ├── components/
│       │   ├── Header.tsx          # Brand, sheet selector, privacy badge, theme toggle
│       │   ├── UploadZone.tsx      # Drag & drop upload, sample dataset triggers
│       │   ├── KpiCards.tsx        # Dynamic KPI cards grid
│       │   ├── DatasetSummary.tsx  # Deterministic template-based summary
│       │   ├── RecommendedCharts.tsx # Auto-recommended Recharts visualizations
│       │   ├── ChartBuilder.tsx    # "Build Your Chart" custom visualization studio
│       │   ├── FilterPanel.tsx     # Categorical, numeric, and date filter panel
│       │   ├── DataTable.tsx       # Spreadsheet data table with search, sort, pagination
│       │   └── DataQualityView.tsx # Data quality audit and outlier profile
│       ├── App.tsx                 # Main application view coordinator
│       └── index.css               # Styling with Tailwind and glassmorphic utilities
│
├── test_app.py                     # Comprehensive end-to-end integration test suite
├── start_local.bat                 # One-click Windows startup script
└── README.md                       # Documentation
```

---

## 🖥️ Local Startup Instructions

### Quick Start (Windows)
Double-click `start_local.bat` in this directory, or run it in Command Prompt / PowerShell:
```cmd
start_local.bat
```
The script will:
1. Detect your local Python installation.
2. Initialize the Python virtual environment (`.\venv`).
3. Install/verify dependencies from `backend\requirements.txt`.
4. Generate the sample datasets if not already present.
5. Launch the local web server at `http://localhost:8000` and open your default browser automatically.

---

### Manual Startup (Any OS)

#### 1. Setup Backend
```bash
# Navigate to the project root
cd Work

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Generate sample datasets
python backend/sample_data/create_samples.py

# Start the unified local server (serves both API and pre-built frontend)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open **`http://localhost:8000`** in your browser.

#### 2. Optional: Frontend Development Mode
If you wish to edit the React frontend with hot-module replacement:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** (API requests are automatically proxied to port 8000).

---

## 🧪 Verification & Sample Datasets

The application has been tested and verified with two diverse datasets:

1. **Sales Performance Dataset (`sample_sales_data.xlsx`)**:
   - **Records**: 1,200 rows across 8 columns.
   - **Fields**: `Date`, `Product`, `Category`, `Region`, `Customer Segment`, `Sales`, `Quantity`, `Profit`.
   - **Recommended Charts**: Historical trend over time (Line), Category vs Sales (Bar), Category Share (Donut), Profit vs Sales Correlation (Scatter).

2. **Employee HR Directory (`sample_employee_data.xlsx`)**:
   - **Records**: 450 rows across 8 columns.
   - **Fields**: `Employee ID`, `Full Name`, `Department`, `Location`, `Age`, `Salary`, `Joining Date`, `Performance Score`.
   - **Recommended Charts**: Timeline of Join Dates (Line), Department vs Salary (Bar), Department vs Location comparison (Grouped Bar), Salary vs Age (Scatter), Average Performance by Department (Horizontal Bar).

To run the automated integration test suite:
```bash
python test_app.py
```

---

## 🔒 Privacy & Offline Assurance

- **Zero Network Connections**: Works even when Wi-Fi and Ethernet are disconnected.
- **No External CDNs**: All styling, icons, and chart packages are bundled locally into `frontend/dist`.
- **System Fonts**: Relies entirely on system font stacks (`Segoe UI`, `Roboto`, `-apple-system`).
- **Data Isolation**: Files are analyzed in local system memory; nothing is uploaded externally.
