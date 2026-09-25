import React, { useState } from 'react';
import { FilterDefinition } from '../types';
import { Filter, X, RotateCcw, Check, Calendar, Hash, Tag, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterPanelProps {
  filterDefs: FilterDefinition[];
  activeFilters: Record<string, any>;
  onApplyFilters: (filters: Record<string, any>) => void;
  onClearFilters: () => void;
  darkMode: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterDefs,
  activeFilters,
  onApplyFilters,
  onClearFilters,
  darkMode,
}) => {
  const [draftFilters, setDraftFilters] = useState<Record<string, any>>(activeFilters);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const activeCount = Object.keys(activeFilters).filter((k) => {
    const v = activeFilters[k];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object' && v !== null) return v.min !== undefined || v.max !== undefined;
    return Boolean(v);
  }).length;

  const toggleSection = (col: string) => {
    setExpandedSections((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  const handleCategoryToggle = (col: string, val: string) => {
    const currentList: string[] = draftFilters[col] || [];
    let updated: string[];
    if (currentList.includes(val)) {
      updated = currentList.filter((x) => x !== val);
    } else {
      updated = [...currentList, val];
    }
    const next = { ...draftFilters };
    if (updated.length > 0) {
      next[col] = updated;
    } else {
      delete next[col];
    }
    setDraftFilters(next);
  };

  const handleNumericChange = (col: string, bound: 'min' | 'max', val: string) => {
    const num = val === '' ? undefined : Number(val);
    const existing = draftFilters[col] || {};
    const updated = { ...existing, [bound]: num };
    const next = { ...draftFilters };
    if (updated.min !== undefined || updated.max !== undefined) {
      next[col] = updated;
    } else {
      delete next[col];
    }
    setDraftFilters(next);
  };

  const handleDateChange = (col: string, bound: 'min' | 'max', val: string) => {
    const existing = draftFilters[col] || {};
    const updated = { ...existing, [bound]: val || undefined };
    const next = { ...draftFilters };
    if (updated.min || updated.max) {
      next[col] = updated;
    } else {
      delete next[col];
    }
    setDraftFilters(next);
  };

  const handleRemoveSingleFilter = (col: string) => {
    const next = { ...draftFilters };
    delete next[col];
    setDraftFilters(next);
    onApplyFilters(next);
  };

  const handleApply = () => {
    onApplyFilters(draftFilters);
  };

  const handleClear = () => {
    setDraftFilters({});
    onClearFilters();
  };

  return (
    <div className={`p-5 rounded-2xl border transition-all ${
      darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
              <span>Data Filters</span>
              {activeCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  {activeCount} Active
                </span>
              )}
            </h3>
            <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Filter rows dynamically across the entire dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={handleClear}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={handleApply}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>

      {/* Active Filter Badges */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-slate-800/40">
          {Object.entries(activeFilters).map(([col, val]) => {
            let label = col;
            if (Array.isArray(val) && val.length > 0) {
              label = `${col}: ${val.slice(0, 2).join(', ')}${val.length > 2 ? ` +${val.length - 2}` : ''}`;
            } else if (typeof val === 'object' && val !== null) {
              const parts = [];
              if (val.min !== undefined) parts.push(`≥ ${val.min}`);
              if (val.max !== undefined) parts.push(`≤ ${val.max}`);
              label = `${col}: ${parts.join(' & ')}`;
            }

            return (
              <span
                key={col}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
              >
                <span>{label}</span>
                <button
                  onClick={() => handleRemoveSingleFilter(col)}
                  className="hover:text-emerald-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Filter Sections */}
      <div className="space-y-3">
        {filterDefs.map((def) => {
          const col = def.column;
          const isExpanded = expandedSections[col] !== false; // Default expanded
          const activeForCol = draftFilters[col];

          return (
            <div 
              key={col}
              className={`rounded-xl border p-3 ${
                darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div 
                onClick={() => toggleSection(col)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  {def.type === 'categorical' && <Tag className="w-3.5 h-3.5 text-indigo-400" />}
                  {def.type === 'numeric' && <Hash className="w-3.5 h-3.5 text-emerald-400" />}
                  {def.type === 'datetime' && <Calendar className="w-3.5 h-3.5 text-sky-400" />}
                  <span className="text-xs font-semibold">{col}</span>
                  {activeForCol && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </div>

              {isExpanded && (
                <div className="mt-3 pt-2 border-t border-slate-700/30">
                  {/* Categorical options pills */}
                  {def.type === 'categorical' && def.options && (
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {def.options.map((opt) => {
                        const isChecked = (draftFilters[col] || []).includes(opt.value);
                        return (
                          <label
                            key={opt.value}
                            className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                                : darkMode ? 'hover:bg-slate-700/50 text-slate-300' : 'hover:bg-slate-200/60 text-slate-700'
                            }`}
                          >
                            <span className="truncate max-w-[200px]" title={opt.value}>
                              {opt.value}
                            </span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCategoryToggle(col, opt.value)}
                              className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Numeric min/max inputs */}
                  {def.type === 'numeric' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Min</span>
                        <input
                          type="number"
                          placeholder={def.min !== undefined ? String(def.min) : 'Min'}
                          value={draftFilters[col]?.min ?? ''}
                          onChange={(e) => handleNumericChange(col, 'min', e.target.value)}
                          className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Max</span>
                        <input
                          type="number"
                          placeholder={def.max !== undefined ? String(def.max) : 'Max'}
                          value={draftFilters[col]?.max ?? ''}
                          onChange={(e) => handleNumericChange(col, 'max', e.target.value)}
                          className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Date min/max inputs */}
                  {def.type === 'datetime' && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Start Date</span>
                        <input
                          type="date"
                          value={draftFilters[col]?.min ?? ''}
                          onChange={(e) => handleDateChange(col, 'min', e.target.value)}
                          className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">End Date</span>
                        <input
                          type="date"
                          value={draftFilters[col]?.max ?? ''}
                          onChange={(e) => handleDateChange(col, 'max', e.target.value)}
                          className={`w-full px-2 py-1 rounded border text-xs outline-none ${
                            darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
