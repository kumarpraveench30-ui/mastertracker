import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  ShieldCheck, 
  FileCheck2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Users
} from 'lucide-react';

interface UploadZoneProps {
  darkMode: boolean;
  onFileUpload: (file: File) => void;
  onLoadSample: (sampleName: 'sales' | 'employee') => void;
  isLoading: boolean;
  error?: string | null;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  darkMode,
  onFileUpload,
  onLoadSample,
  isLoading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      alert('Please upload a valid Excel spreadsheet (.xlsx or .xls).');
      return;
    }
    onFileUpload(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      
      {/* Privacy Notice Banner */}
      <div className={`mb-8 p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
        darkMode 
          ? 'bg-slate-900/60 border-emerald-500/30 text-slate-200 shadow-lg shadow-emerald-950/20' 
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span>Your data stays on this device</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                100% Offline
              </span>
            </h4>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-emerald-800'}`}>
              Local processing — your uploaded data never leaves this computer. No external APIs, cloud servers, or trackers.
            </p>
          </div>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
            : darkMode
              ? 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/70'
              : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/80'
        } ${isLoading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-semibold tracking-tight">Analyzing Spreadsheet Locally...</h3>
            <p className={`text-sm mt-1 max-w-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Parsing worksheets, profiling column types, computing statistics, and generating visualizations.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-xl transition-transform group-hover:scale-105 ${
              darkMode ? 'bg-slate-800 text-emerald-400 border border-slate-700' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              <UploadCloud className="w-10 h-10 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Drop your Excel file here
            </h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              or <span className="text-emerald-500 font-semibold hover:underline">browse files</span> from your local computer
            </p>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                .xlsx (Excel 2007+)
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-medium border ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                .xls (Excel Legacy)
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 1-Click Sample Datasets Section */}
      <div className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Or test instantly with pre-loaded datasets:
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Sample 1: Sales Data */}
          <button
            onClick={() => onLoadSample('sales')}
            disabled={isLoading}
            className={`p-5 rounded-2xl border text-left transition-all group flex flex-col justify-between ${
              darkMode 
                ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-emerald-500/50 text-slate-200' 
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-900 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  1,200 Records
                </span>
              </div>
              <h4 className="text-base font-bold group-hover:text-emerald-400 transition-colors">
                Sales & Revenue Performance
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Date, Product, Category, Region, Customer Segment, Sales, Quantity, and Profit metrics.
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center text-xs font-medium text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Load sample dataset</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>

          {/* Sample 2: Employee Data */}
          <button
            onClick={() => onLoadSample('employee')}
            disabled={isLoading}
            className={`p-5 rounded-2xl border text-left transition-all group flex flex-col justify-between ${
              darkMode 
                ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-emerald-500/50 text-slate-200' 
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-300 text-slate-900 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  450 Records
                </span>
              </div>
              <h4 className="text-base font-bold group-hover:text-emerald-400 transition-colors">
                Employee HR Directory
              </h4>
              <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Employee ID, Department, Location, Age, Salary, Joining Date, and Performance Scores.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center text-xs font-medium text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Load sample dataset</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>

        </div>
      </div>

    </div>
  );
};
