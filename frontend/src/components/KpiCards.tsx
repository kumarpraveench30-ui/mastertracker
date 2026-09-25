import React from 'react';
import { KPI } from '../types';
import { 
  Database, 
  TrendingUp, 
  Activity, 
  BarChart3, 
  Layers, 
  ShieldCheck, 
  Hash, 
  DollarSign, 
  Users,
  Calendar
} from 'lucide-react';

interface KpiCardsProps {
  kpis: KPI[];
  darkMode: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Database,
  TrendingUp,
  Activity,
  BarChart3,
  Layers,
  ShieldCheck,
  Hash,
  DollarSign,
  Users,
  Calendar
};

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, darkMode }) => {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi, idx) => {
        const IconComponent = ICON_MAP[kpi.icon] || BarChart3;

        // Custom accent colors based on card index or type
        const colorSchemes = [
          { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-400' },
          { border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-400' },
          { border: 'border-sky-500/20', iconBg: 'bg-sky-500/10', iconText: 'text-sky-400' },
          { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconText: 'text-amber-400' },
          { border: 'border-purple-500/20', iconBg: 'bg-purple-500/10', iconText: 'text-purple-400' },
          { border: 'border-teal-500/20', iconBg: 'bg-teal-500/10', iconText: 'text-teal-400' },
        ];
        const scheme = colorSchemes[idx % colorSchemes.length];

        return (
          <div
            key={kpi.id || idx}
            className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
              darkMode
                ? `bg-slate-900/60 ${scheme.border} text-slate-100 hover:border-slate-600`
                : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium uppercase tracking-wider ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                {kpi.label}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${scheme.iconBg} ${scheme.iconText}`}>
                <IconComponent className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl font-black tracking-tight text-white mb-1">
              <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                {kpi.value}
              </span>
            </div>

            {kpi.subtitle && (
              <p className={`text-[11px] truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} title={kpi.subtitle}>
                {kpi.subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
