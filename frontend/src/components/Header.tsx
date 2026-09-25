import React from 'react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Layers, 
  Upload, 
  Sun, 
  Moon, 
  RefreshCw,
  TableProperties
} from 'lucide-react';

interface HeaderProps {
  filename?: string;
  sheets: string[];
  activeSheet?: string;
  totalRows?: number;
  totalCols?: number;
  filteredRows?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectSheet: (sheet: string) => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filename,
  sheets,
  activeSheet,
  totalRows,
  totalCols,
  filteredRows,
  darkMode,
  onToggleDarkMode,
  onSelectSheet,
  onReset,
}) => {
  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
      darkMode 
        ? 'bg-slate-900/80 border-slate-800 text-slate-100' 
        : 'bg-white/80 border-slate-200 text-slate-900'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                ExcelVibe
              </span>
              <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                darkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                Offline Engine
              </span>
            </div>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Deterministic On-Device Analytics
            </p>
          </div>
        </div>

        {/* Center / Active File Context */}
        {filename && (
          <div className="hidden md:flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
              darkMode ? 'bg-slate-800/70 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="max-w-[180px] truncate" title={filename}>{filename}</span>
            </div>

            {/* Sheet Selector */}
            {sheets.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={activeSheet}
                  onChange={(e) => onSelectSheet(e.target.value)}
                  className={`rounded-lg px-2.5 py-1.5 border text-xs font-medium outline-none cursor-pointer ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-800 focus:border-emerald-500'
                  }`}
                >
                  {sheets.map((s) => (
                    <option key={s} value={s}>
                      Sheet: {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Row / Col Counts */}
            {totalRows !== undefined && totalCols !== undefined && (
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${
                darkMode ? 'bg-slate-800/50 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <TableProperties className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {filteredRows !== undefined && filteredRows !== totalRows ? (
                    <span>
                      <strong className="text-emerald-400">{filteredRows.toLocaleString()}</strong> / {totalRows.toLocaleString()} rows
                    </span>
                  ) : (
                    <span><strong>{totalRows.toLocaleString()}</strong> rows</span>
                  )}
                  {" × "}
                  <strong>{totalCols}</strong> cols
                </span>
              </div>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Privacy badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Local / Zero Network</span>
          </div>

          {/* Upload New File Button if active file */}
          {filename && (
            <button
              onClick={onReset}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                darkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title="Upload another spreadsheet"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>New File</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg border transition-colors ${
              darkMode 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
