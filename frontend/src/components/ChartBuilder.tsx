import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart,
  Area,
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
import { 
  Sliders, 
  BarChart3, 
  TrendingUp, 
  PieChart as PieIcon, 
  ScatterChart as ScatterIcon, 
  Layers, 
  Play,
  RotateCcw
} from 'lucide-react';
import { queryChart, ChartQueryParams } from '../services/api';
import { ChartDataResult } from '../types';

interface ChartBuilderProps {
  datasetId: string;
  columns: string[];
  columnTypes: Record<string, string>;
  activeFilters: Record<string, any>;
  darkMode: boolean;
}

const PALETTE = [
  '#10B981', '#6366F1', '#0EA5E9', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F43F5E'
];

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  datasetId,
  columns,
  columnTypes,
  activeFilters,
  darkMode,
}) => {
  const numericCols = columns.filter((c) => columnTypes[c] === 'numeric');
  const catAndDateCols = columns.filter((c) => columnTypes[c] !== 'numeric');

  const [chartType, setChartType] = useState<string>('bar');
  const [xCol, setXCol] = useState<string>(catAndDateCols[0] || columns[0] || '');
  const [yCol, setYCol] = useState<string>(numericCols[0] || columns[1] || '');
  const [groupCol, setGroupCol] = useState<string>('');
  const [aggregation, setAggregation] = useState<string>('sum');
  const [limit, setLimit] = useState<number>(25);

  const [loading, setLoading] = useState<boolean>(false);
  const [chartResult, setChartResult] = useState<ChartDataResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults intelligently
  useEffect(() => {
    if (columns.length >= 2) {
      if (!xCol || !columns.includes(xCol)) {
        setXCol(catAndDateCols[0] || columns[0]);
      }
      if (!yCol || !columns.includes(yCol)) {
        setYCol(numericCols[0] || columns[1]);
      }
    }
  }, [columns]);

  // Execute query whenever builder controls change or active filters update
  const executeQuery = async () => {
    if (!xCol) return;
    setLoading(true);
    setError(null);

    try {
      const params: ChartQueryParams = {
        dataset_id: datasetId,
        x_col: xCol,
        y_col: yCol || undefined,
        group_col: groupCol || undefined,
        chart_type: chartType,
        aggregation,
        filters: activeFilters,
        limit,
      };
      const res = await queryChart(params);
      setChartResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to render chart.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeQuery();
  }, [chartType, xCol, yCol, groupCol, aggregation, limit, activeFilters, datasetId]);

  const tooltipBg = darkMode ? '#1E293B' : '#FFFFFF';
  const tooltipBorder = darkMode ? '#334155' : '#E2E8F0';
  const tooltipText = darkMode ? '#F8FAFC' : '#0F172A';
  const gridColor = darkMode ? '#33415540' : '#E2E8F0';
  const axisColor = darkMode ? '#94A3B8' : '#64748B';

  const renderVisual = () => {
    if (loading) {
      return (
        <div className="h-96 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400">Computing aggregation...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-96 flex items-center justify-center p-6 text-center text-rose-400 text-sm">
          {error}
        </div>
      );
    }

    if (!chartResult || !chartResult.data || chartResult.data.length === 0) {
      return (
        <div className="h-96 flex flex-col items-center justify-center text-slate-400 text-sm">
          <BarChart3 className="w-10 h-10 text-slate-600 mb-2" />
          <p>No data points match this chart selection or active filters.</p>
        </div>
      );
    }

    const data = chartResult.data;
    const keys = chartResult.series_keys || ['value'];

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} angle={-30} textAnchor="end" />
              <YAxis stroke={axisColor} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {keys.map((k, i) => (
                <Line 
                  key={k} 
                  type="monotone" 
                  dataKey={k} 
                  stroke={PALETTE[i % PALETTE.length]} 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} angle={-30} textAnchor="end" />
              <YAxis stroke={axisColor} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {keys.map((k, i) => (
                <Area 
                  key={k} 
                  type="monotone" 
                  dataKey={k} 
                  fill={PALETTE[i % PALETTE.length]} 
                  stroke={PALETTE[i % PALETTE.length]} 
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'horizontal_bar':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 50, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" stroke={axisColor} fontSize={11} />
              <YAxis type="category" dataKey="name" stroke={axisColor} fontSize={11} width={90} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Bar dataKey="value" fill="#6366F1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={chartType === 'donut' ? 65 : 0}
                outerRadius={110}
                paddingAngle={chartType === 'donut' ? 3 : 0}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" dataKey="x" name={xCol} stroke={axisColor} fontSize={11} />
              <YAxis type="number" dataKey="y" name={yCol} stroke={axisColor} fontSize={11} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Scatter name={`${xCol} vs ${yCol}`} data={data} fill="#0EA5E9" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={11} angle={-30} textAnchor="end" />
              <YAxis stroke={axisColor} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '12px', color: tooltipText }} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Title */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight">Build Your Chart</h3>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Customize dimensions, metrics, aggregations, and visual forms
            </p>
          </div>
        </div>

        <button
          onClick={executeQuery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md shadow-emerald-500/20"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Update Chart</span>
        </button>
      </div>

      {/* Control Grid */}
      <div className={`p-4 rounded-2xl border mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${
        darkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        
        {/* 1. Chart Type */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Chart Type
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border outline-none cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="bar">Bar Chart</option>
            <option value="horizontal_bar">Horizontal Bar</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="donut">Donut Chart</option>
            <option value="scatter">Scatter Plot</option>
          </select>
        </div>

        {/* 2. X-Axis */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            X-Axis Column
          </label>
          <select
            value={xCol}
            onChange={(e) => setXCol(e.target.value)}
            className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border outline-none cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col} ({columnTypes[col] || 'cat'})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Y-Axis (Metric) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Y-Axis (Metric)
          </label>
          <select
            value={yCol}
            onChange={(e) => setYCol(e.target.value)}
            className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border outline-none cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="">(None / Row Count)</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col} ({columnTypes[col] || 'cat'})
              </option>
            ))}
          </select>
        </div>

        {/* 4. Grouping Column (Optional) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Group By (Optional)
          </label>
          <select
            value={groupCol}
            onChange={(e) => setGroupCol(e.target.value)}
            className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border outline-none cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="">None (Single Series)</option>
            {columns.filter((c) => c !== xCol && c !== yCol).map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Aggregation */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Aggregation
          </label>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border outline-none cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="sum">Sum</option>
            <option value="average">Average (Mean)</option>
            <option value="count">Count Records</option>
            <option value="median">Median</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
          </select>
        </div>

        {/* 6. Point Limit */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Max Data Points
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className={`w-full rounded-xl px-2.5 py-2 text-xs font-medium border outline-none cursor-pointer ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value={10}>Top 10</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>

      </div>

      {/* Visual Workspace Canvas */}
      <div className={`p-4 rounded-2xl border min-h-[420px] flex items-center justify-center ${
        darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
      }`}>
        {renderVisual()}
      </div>

    </div>
  );
};
