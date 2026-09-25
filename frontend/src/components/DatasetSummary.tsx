import React from 'react';
import { FileText, Cpu, CheckCircle2 } from 'lucide-react';

interface DatasetSummaryProps {
  summary: string[];
  darkMode: boolean;
}

export const DatasetSummary: React.FC<DatasetSummaryProps> = ({ summary, darkMode }) => {
  if (!summary || summary.length === 0) return null;

  return (
    <div className={`p-6 rounded-2xl border transition-all ${
      darkMode 
        ? 'bg-slate-900/60 border-slate-800 text-slate-200' 
        : 'bg-white border-slate-200 text-slate-800 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight">
              Deterministic Dataset Summary
            </h3>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Statistical profile computed from workbook contents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Cpu className="w-3 h-3" />
          <span>Rule-Based Engine (Zero AI / Zero LLM)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed">
        {summary.map((point, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              darkMode ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
