import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { fetchTableData, exportDataset, TableQueryParams } from '../services/api';
import { TableDataResponse } from '../types';

interface DataTableProps {
  datasetId: string;
  columns: string[];
  activeFilters: Record<string, any>;
  filename: string;
  darkMode: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  datasetId,
  columns,
  activeFilters,
  filename,
  darkMode,
}) => {
  const [data, setData] = useState<TableDataResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns);
  const [showColModal, setShowColModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync visible columns when new dataset loads
  useEffect(() => {
    setVisibleColumns(columns);
  }, [columns]);

  // Load table data
  const loadData = async () => {
    setLoading(true);
    try {
      const params: TableQueryParams = {
        dataset_id: datasetId,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_desc: sortDesc,
        search: search.trim() || undefined,
        filters: activeFilters,
        visible_columns: visibleColumns,
      };
      const res = await fetchTableData(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load table data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [datasetId, page, pageSize, sortBy, sortDesc, search, activeFilters, visibleColumns]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      if (sortDesc) {
        setSortBy(undefined);
        setSortDesc(false);
      } else {
        setSortDesc(true);
      }
    } else {
      setSortBy(col);
      setSortDesc(false);
    }
  };

  const toggleColumnVisibility = (col: string) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter((c) => c !== col));
      }
    } else {
      setVisibleColumns([...visibleColumns, col]);
    }
  };

  const handleExport = (format: 'excel' | 'csv') => {
    const base = filename.replace(/\.[^/.]+$/, '');
    exportDataset(datasetId, format, activeFilters, `${base}_filtered`);
  };

  const formatCellValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-500 italic">null</span>;
    }
    if (typeof val === 'number') {
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(val);
  };

  return (
    <div className={`rounded-3xl border transition-all overflow-hidden flex flex-col ${
      darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Top Toolbar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        darkMode ? 'border-slate-800' : 'border-slate-200'
      }`}>
        
        {/* Left: Search Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all cells..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border outline-none transition-colors ${
                darkMode 
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Right: Export & Column Visibility Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column Visibility Button */}
          <div className="relative">
            <button
              onClick={() => setShowColModal(!showColModal)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Columns ({visibleColumns.length}/{columns.length})</span>
            </button>

            {/* Dropdown Modal for Column Toggles */}
            {showColModal && (
              <div className={`absolute right-0 mt-2 w-64 p-3 rounded-2xl border shadow-2xl z-50 max-h-72 overflow-y-auto ${
                darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/40 text-xs font-semibold">
                  <span>Toggle Columns</span>
                  <button 
                    onClick={() => setVisibleColumns(columns)}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-1">
                  {columns.map((c) => {
                    const isVisible = visibleColumns.includes(c);
                    return (
                      <label
                        key={c}
                        className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg cursor-pointer ${
                          isVisible
                            ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                            : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="truncate max-w-[170px]">{c}</span>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleColumnVisibility(c)}
                          className="rounded text-emerald-500 focus:ring-emerald-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export to Excel */}
          <button
            onClick={() => handleExport('excel')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              darkMode 
                ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800/60 text-emerald-400' 
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
            }`}
            title="Download filtered data as an Excel .xlsx workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Export</span>
          </button>

          {/* Export to CSV */}
          <button
            onClick={() => handleExport('csv')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              darkMode 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Download filtered data as CSV"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV Export</span>
          </button>
        </div>

      </div>

      {/* Spreadsheet Table Container */}
      <div className="overflow-x-auto flex-1 max-h-[560px] relative">
        <table className="w-full text-left text-xs border-collapse">
          {/* Sticky Header */}
          <thead className={`sticky top-0 z-20 backdrop-blur-md uppercase tracking-wider text-[11px] font-semibold select-none border-b ${
            darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-100/90 border-slate-300 text-slate-600'
          }`}>
            <tr>
              <th className="py-3 px-4 w-12 text-center text-slate-500">#</th>
              {visibleColumns.map((col) => {
                const isSorted = sortBy === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-3 px-4 cursor-pointer hover:text-emerald-400 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      {isSorted ? (
                        sortDesc ? (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={`divide-y font-mono ${
            darkMode ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-200 text-slate-800'
          }`}>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading table rows...</span>
                </td>
              </tr>
            ) : !data || data.rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-12 text-center text-slate-500">
                  No matching records found.
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => {
                const rowNum = (page - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-center text-slate-500 font-sans text-[11px]">
                      {rowNum}
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col} className="py-2.5 px-4 whitespace-nowrap">
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data && (
        <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-4 text-xs ${
          darkMode ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          {/* Row Count Info */}
          <div>
            Showing <strong className="text-emerald-400">
              {data.filtered_rows === 0 ? 0 : (page - 1) * pageSize + 1}
            </strong> to <strong className="text-emerald-400">
              {Math.min(page * pageSize, data.filtered_rows)}
            </strong> of <strong className="text-emerald-400">
              {data.filtered_rows.toLocaleString()}
            </strong> records
            {data.filtered_rows !== data.total_rows && (
              <span> (filtered from {data.total_rows.toLocaleString()} total)</span>
            )}
          </div>

          {/* Page Controls */}
          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={`rounded-lg px-2 py-1 text-xs border outline-none cursor-pointer ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-200'
                }`}
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-200'
                }`}
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-medium">
                Page {page} of {data.total_pages}
              </span>

              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-200'
                }`}
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(data.total_pages)}
                className={`p-1.5 rounded-lg border disabled:opacity-30 disabled:cursor-not-allowed ${
                  darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-200'
                }`}
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
