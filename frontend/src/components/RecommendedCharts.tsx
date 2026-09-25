import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { RecommendedChart } from '../types';
import { BarChart3, TrendingUp, PieChart as PieIcon, ScatterChart as ScatterIcon, Layers } from 'lucide-react';

interface RecommendedChartsProps {
  charts: RecommendedChart[];
  darkMode: boolean;
}

const PALETTE = [
  '#10B981', // emerald
  '#6366F1', // indigo
  '#0EA5E9', // sky
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F43F5E', // rose
];

export const RecommendedCharts: React.FC<RecommendedChartsProps> = ({ charts, darkMode }) => {
  if (!charts || charts.length === 0) return null;

  const tooltipBg = darkMode ? '#1E293B' : '#FFFFFF';
  const tooltipBorder = darkMode ? '#334155' : '#E2E8F0';
  const tooltipText = darkMode ? '#F8FAFC' : '#0F172A';
  const gridColor = darkMode ? '#33415540' : '#E2E8F0';
  const axisColor = darkMode ? '#94A3B8' : '#64748B';

  const renderChartGraphic = (chart: RecommendedChart) => {
    const data = chart.chart_data?.data || [];
    const keys = chart.chart_data?.series_keys || ['value'];

    if (!data || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-xs text-slate-500">
          No data available for this chart configuration.
        </div>
      );
    }

    switch (chart.chart_type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
                angle={-25} 
                textAnchor="end" 
              />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText, fontSize: '12px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {keys.map((k, i) => (
                <Line 
                  key={k} 
                  type="monotone" 
                  dataKey={k} 
                  stroke={PALETTE[i % PALETTE.length]} 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: PALETTE[i % PALETTE.length] }} 
                  activeDot={{ r: 5 }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'horizontal_bar':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" stroke={axisColor} fontSize={11} tickLine={false} />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
                width={80}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText, fontSize: '12px' }} 
              />
              <Bar dataKey="value" fill="#6366F1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText, fontSize: '12px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'grouped_bar':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
                angle={-25} 
                textAnchor="end" 
              />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText, fontSize: '12px' }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                type="number" 
                dataKey="x" 
                name={chart.x_col} 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name={chart.y_col} 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText, fontSize: '12px' }} 
              />
              <Scatter name={`${chart.x_col} vs ${chart.y_col}`} data={data} fill="#0EA5E9" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke={axisColor} 
                fontSize={11} 
                tickLine={false} 
                angle={-25} 
                textAnchor="end" 
              />
              <YAxis stroke={axisColor} fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText, fontSize: '12px' }} 
              />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line': return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'donut': return <PieIcon className="w-4 h-4 text-amber-400" />;
      case 'scatter': return <ScatterIcon className="w-4 h-4 text-sky-400" />;
      case 'grouped_bar': return <Layers className="w-4 h-4 text-purple-400" />;
      default: return <BarChart3 className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
            <span>Automated Visualizations</span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
              darkMode ? 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              Auto-Recommended
            </span>
          </h3>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Charts inferred from column types (dates, categories, and numeric measures)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className={`p-5 rounded-2xl border transition-all ${
              darkMode 
                ? 'bg-slate-900/60 border-slate-800 text-slate-100 hover:border-slate-700' 
                : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {getChartIcon(chart.chart_type)}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{chart.title}</h4>
                  <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {chart.description}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                {chart.chart_type.replace('_', ' ')}
              </span>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800/40">
              {renderChartGraphic(chart)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
