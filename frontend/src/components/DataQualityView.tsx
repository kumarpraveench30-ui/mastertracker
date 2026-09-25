import React from 'react';
import { DataQuality, SheetAnalysis } from '../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  HelpCircle, 
  FileQuestion,
  Activity,
  Layers
} from 'lucide-react';

interface DataQualityViewProps {
  analysis: SheetAnalysis;
  darkMode: boolean;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({ analysis, darkMode }) => {
  const quality = analysis.data_quality;
  if (!quality) return null;

  const getStatusBadge = (status: 'GOOD' | 'WARNING' | 'ATTENTION') => {
    switch (status) {
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>GOOD</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>WARNING</span>
          </span>
        );
      case 'ATTENTION':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Activity className="w-3 h-3" />
            <span>ATTENTION</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Health Score */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Health Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 mb-1">
            {quality.health_score}%
          </div>
          <p className="text-xs text-slate-400">
            Rating: <strong className="text-white">{quality.health_status}</strong>
          </p>
        </div>

        {/* Missing Values */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Missing Cells
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-1">
            {quality.total_missing_cells.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            {quality.total_missing_pct}% of all workbook cells
          </p>
        </div>

        {/* Duplicate Rows */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Duplicate Rows
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mb-1">
            {quality.duplicate_rows_count.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            {quality.duplicate_rows_pct}% duplicate row frequency
          </p>
        </div>

        {/* Outlier Data Points */}
        <div className={`p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Statistical Outliers
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 mb-1">
            {quality.total_outliers_count.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">
            Calculated via Interquartile Range (IQR &times; 1.5)
          </p>
        </div>

      </div>

      {/* Detailed Columns Quality Table */}
      <div className={`rounded-3xl border overflow-hidden ${
        darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className={`p-5 border-b flex items-center justify-between ${
          darkMode ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <h3 className="font-bold text-sm tracking-tight">Column-by-Column Health Audit</h3>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Detailed integrity, missingness, and outlier profile per field
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`uppercase tracking-wider text-[11px] font-semibold border-b ${
              darkMode ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <tr>
                <th className="py-3 px-4">Column Name</th>
                <th className="py-3 px-4">Inferred Type</th>
                <th className="py-3 px-4">Missing Entries</th>
                <th className="py-3 px-4">Missing %</th>
                <th className="py-3 px-4">Unique Values</th>
                <th className="py-3 px-4">Outliers (IQR)</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${
              darkMode ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-200 text-slate-800'
            }`}>
              {quality.columns.map((col) => (
                <tr key={col.column} className={darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-4 font-semibold text-white">
                    {col.column}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-sans uppercase font-medium ${
                      col.type === 'numeric'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : col.type === 'datetime'
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {col.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {col.missing_count.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${col.missing_pct > 20 ? 'bg-rose-500' : col.missing_pct > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(col.missing_pct, 100)}%` }}
                        />
                      </div>
                      <span>{col.missing_pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {col.unique_count.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {col.outliers_count > 0 ? (
                      <span className="text-amber-400 font-semibold">
                        {col.outliers_count.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {getStatusBadge(col.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
