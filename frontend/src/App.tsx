import React, { useState } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  UploadZone 
} from './components/UploadZone';
import { 
  KpiCards 
} from './components/KpiCards';
import { 
  DatasetSummary 
} from './components/DatasetSummary';
import { 
  RecommendedCharts 
} from './components/RecommendedCharts';
import { 
  ChartBuilder 
} from './components/ChartBuilder';
import { 
  FilterPanel 
} from './components/FilterPanel';
import { 
  DataTable 
} from './components/DataTable';
import { 
  DataQualityView 
} from './components/DataQualityView';

import { 
  uploadExcelFile, 
  loadSample, 
  switchSheet, 
  filterDataset 
} from './services/api';
import { DatasetPayload, KPI, RecommendedChart } from './types';
import { 
  LayoutDashboard, 
  Table2, 
  Sliders, 
  ShieldAlert, 
  Filter, 
  Sparkles,
  Download
} from 'lucide-react';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [dataset, setDataset] = useState<DatasetPayload | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'explore' | 'builder' | 'quality'>('overview');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  
  // Filtered views state
  const [filteredKpis, setFilteredKpis] = useState<KPI[]>([]);
  const [filteredSummary, setFilteredSummary] = useState<string[]>([]);
  const [filteredCharts, setFilteredCharts] = useState<RecommendedChart[]>([]);
  const [filteredRowCount, setFilteredRowCount] = useState<number | undefined>(undefined);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDatasetLoaded = (payload: DatasetPayload) => {
    setDataset(payload);
    setActiveFilters({});
    setFilteredKpis(payload.kpis);
    setFilteredSummary(payload.summary);
    setFilteredCharts(payload.recommended_charts);
    setFilteredRowCount(payload.analysis.total_rows);
    setActiveTab('overview');
    setError(null);
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await uploadExcelFile(file);
      handleDatasetLoaded(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to upload or parse Excel file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = async (sampleName: 'sales' | 'employee') => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await loadSample(sampleName);
      handleDatasetLoaded(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to load sample dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSheet = async (sheetName: string) => {
    if (!dataset) return;
    setIsLoading(true);
    setError(null);
    try {
      const payload = await switchSheet(dataset.dataset_id, sheetName);
      handleDatasetLoaded(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to switch sheet.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = async (filters: Record<string, any>) => {
    if (!dataset) return;
    setActiveFilters(filters);
    try {
      const res = await filterDataset(dataset.dataset_id, filters);
      setFilteredKpis(res.kpis);
      setFilteredSummary(res.summary);
      setFilteredCharts(res.recommended_charts);
      setFilteredRowCount(res.filtered_rows);
    } catch (err: any) {
      console.error('Filter application failed:', err);
    }
  };

  const handleClearFilters = async () => {
    if (!dataset) return;
    setActiveFilters({});
    setFilteredKpis(dataset.kpis);
    setFilteredSummary(dataset.summary);
    setFilteredCharts(dataset.recommended_charts);
    setFilteredRowCount(dataset.analysis.total_rows);
  };

  const handleReset = () => {
    setDataset(null);
    setActiveFilters({});
    setError(null);
  };

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Application Header */}
      <Header
        filename={dataset?.filename}
        sheets={dataset?.sheets || []}
        activeSheet={dataset?.active_sheet}
        totalRows={dataset?.analysis.total_rows}
        totalCols={dataset?.analysis.total_cols}
        filteredRows={filteredRowCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSelectSheet={handleSelectSheet}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      {!dataset ? (
        <UploadZone
          darkMode={darkMode}
          onFileUpload={handleFileUpload}
          onLoadSample={handleLoadSample}
          isLoading={isLoading}
          error={error}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Navigation Bar / Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('explore')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'explore'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Table2 className="w-4 h-4" />
                <span>Explore Data & Table</span>
              </button>

              <button
                onClick={() => setActiveTab('builder')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'builder'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Build Your Chart</span>
              </button>

              <button
                onClick={() => setActiveTab('quality')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'quality'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Data Quality</span>
              </button>
            </div>

            {/* Privacy indicator pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Session: {dataset.active_sheet}</span>
            </div>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Dynamic KPI Cards */}
              <KpiCards kpis={filteredKpis} darkMode={darkMode} />

              {/* Deterministic Dataset Summary */}
              <DatasetSummary summary={filteredSummary} darkMode={darkMode} />

              {/* Automated Visualizations */}
              <RecommendedCharts charts={filteredCharts} darkMode={darkMode} />
            </div>
          )}

          {/* TAB 2: EXPLORE DATA */}
          {activeTab === 'explore' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* Filter Panel (Left Column) */}
              <div className="lg:col-span-1">
                <FilterPanel
                  filterDefs={dataset.analysis.filter_definitions}
                  activeFilters={activeFilters}
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  darkMode={darkMode}
                />
              </div>

              {/* Data Table (Right 3 Columns) */}
              <div className="lg:col-span-3">
                <DataTable
                  datasetId={dataset.dataset_id}
                  columns={dataset.analysis.columns}
                  activeFilters={activeFilters}
                  filename={dataset.filename}
                  darkMode={darkMode}
                />
              </div>
            </div>
          )}

          {/* TAB 3: BUILD YOUR CHART */}
          {activeTab === 'builder' && (
            <div className="space-y-6">
              <ChartBuilder
                datasetId={dataset.dataset_id}
                columns={dataset.analysis.columns}
                columnTypes={dataset.analysis.column_types}
                activeFilters={activeFilters}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* TAB 4: DATA QUALITY */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              <DataQualityView
                analysis={dataset.analysis}
                darkMode={darkMode}
              />
            </div>
          )}

        </main>
      )}

      {/* Global Offline Footer */}
      <footer className={`mt-16 border-t py-6 text-center text-xs transition-colors ${
        darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
      }`}>
        <p className="max-w-xl mx-auto px-4">
          ExcelVibe Analytics runs completely on <strong className="text-slate-400 font-semibold">localhost</strong>.
          Spreadsheet contents and computations are strictly confined to this computer. Zero telemetry, zero external APIs.
        </p>
      </footer>
    </div>
  );
}

export default App;
