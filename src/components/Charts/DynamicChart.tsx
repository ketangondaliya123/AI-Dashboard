import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Maximize2, Minimize2, BarChart2, TrendingUp, PieChart as PieIcon, Sliders, TableProperties } from 'lucide-react';
import { ColumnMetadata } from '../../types';
import { dataAnalyzer } from '../../services/dataAnalyzer';

interface DynamicChartProps {
  id: string;
  type: 'bar' | 'horizontal-bar' | 'line' | 'pie' | 'progress' | 'table';
  title: string;
  data: any[];
  dimensionKey: string;
  metricKey: string;
  columns: ColumnMetadata[];
  darkMode: boolean;
  onFullscreenToggle: (chartId: string | null) => void;
  isFullscreen: boolean;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({
  id,
  type: initialType,
  title,
  data,
  dimensionKey: initialDimensionKey,
  metricKey: initialMetricKey,
  columns,
  darkMode,
  onFullscreenToggle,
  isFullscreen,
}) => {
  const [chartType, setChartType] = useState(initialType);
  const [dimensionKey, setDimensionKey] = useState(initialDimensionKey);
  const [metricKey, setMetricKey] = useState(initialMetricKey);

  // Available options for axes
  const dimensions = useMemo(() => columns.filter(c => c.role === 'dimension'), [columns]);
  const metrics = useMemo(() => columns.filter(c => c.role === 'metric'), [columns]);

  // Group, aggregate and sort data for rendering
  const processedData = useMemo(() => {
    if (!data.length || !dimensionKey || !metricKey) return [];

    const isDateDim = columns.find(c => c.name === dimensionKey)?.type === 'date';

    // Map to hold aggregation
    const aggregation: Record<string, { label: string; value: number; sortVal: any }> = {};

    data.forEach(row => {
      let dimVal = row[dimensionKey];
      let rawMetricVal = row[metricKey];

      // Format date values for axis labels
      if (isDateDim && dimVal) {
        const d = new Date(dimVal);
        if (!isNaN(d.getTime())) {
          dimVal = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }

      const label = dimVal !== null && dimVal !== undefined ? String(dimVal) : 'N/A';
      
      // Clean and parse metric value
      let value = 0;
      if (typeof rawMetricVal === 'number') {
        value = rawMetricVal;
      } else if (typeof rawMetricVal === 'string') {
        const cleaned = rawMetricVal.replace(/[^0-9.-]/g, '');
        value = cleaned !== "" ? Number(cleaned) : 0;
      }

      if (!aggregation[label]) {
        aggregation[label] = {
          label,
          value: 0,
          sortVal: row[dimensionKey] // Store original for date sorting
        };
      }

      // If it's a yield or percentage metric, we average it. Otherwise, we sum it.
      const isPercent = columns.find(c => c.name === metricKey)?.type === 'percentage';
      if (isPercent) {
        // We will sum for now, and divide by count at the end
        if (!(aggregation[label] as any).count) {
          (aggregation[label] as any).count = 0;
        }
        aggregation[label].value += value;
        (aggregation[label] as any).count += 1;
      } else {
        aggregation[label].value += value;
      }
    });

    let result = Object.values(aggregation).map(item => {
      const isPercent = columns.find(c => c.name === metricKey)?.type === 'percentage';
      if (isPercent && (item as any).count) {
        item.value = Number((item.value / (item as any).count).toFixed(4));
      } else {
        item.value = Number(item.value.toFixed(2));
      }
      return item;
    });

    // Sorting
    if (isDateDim) {
      // Sort chronologically
      result.sort((a, b) => {
        const da = new Date(a.sortVal).getTime();
        const db = new Date(b.sortVal).getTime();
        return da - db;
      });
    } else {
      // Sort by metric value descending
      result.sort((a, b) => b.value - a.value);
    }

    // Slice to top 10 categories for text dimensions (or top 5 for pie) to keep chart clean
    const maxItems = chartType === 'pie' ? 5 : 10;
    if (!isDateDim && result.length > maxItems && chartType !== 'table') {
      const topRows = result.slice(0, maxItems);
      const rest = result.slice(maxItems);
      const othersSum = rest.reduce((sum, item) => sum + item.value, 0);
      
      const isPercent = columns.find(c => c.name === metricKey)?.type === 'percentage';
      const othersAvg = isPercent && rest.length ? othersSum / rest.length : othersSum;
      
      topRows.push({
        label: 'Others',
        value: Number(othersAvg.toFixed(2)),
        sortVal: 'others'
      });
      return topRows;
    }

    return result;
  }, [data, dimensionKey, metricKey, chartType, columns]);

  // Color Palette
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#374151', '#06b6d4', '#84cc16', '#a855f7', '#f43f5e'];

  // Formatting helpers
  const formatYAxis = (tick: number) => {
    return dataAnalyzer.formatValue(tick, columns.find(c => c.name === metricKey)?.type || 'number', metricKey);
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const isPercent = columns.find(c => c.name === metricKey)?.type === 'percentage';
      let displayValue = '';
      const val = payload[0].value;
      if (isPercent) {
        const displayVal = val >= 0 && val <= 1 ? val * 100 : val;
        displayValue = `${displayVal.toFixed(2)}%`;
      } else {
        displayValue = dataAnalyzer.formatValue(val, 'number', metricKey);
      }

      return (
        <div className="glass-panel p-3 rounded-xl border shadow-lg text-sm text-slate-800 dark:text-slate-200">
          <p className="font-semibold text-slate-500 dark:text-slate-400">{payload[0].payload.label}</p>
          <p className="font-extrabold text-blue-600 dark:text-blue-400 mt-1" title={val.toString()}>
            {metricKey}: <span className="text-slate-900 dark:text-white">{displayValue}</span>
          </p>
          {!isPercent && (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
              Actual: {val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const textLabelColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.6)';

  return (
    <div
      className={`glass-panel rounded-2xl flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-4 z-[999] shadow-2xl p-8 bg-white/95 dark:bg-slate-900/95'
          : 'p-6 h-[420px]'
      }`}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Aggregated by {dimensionKey}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto no-print">
          {/* Dimension Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-1.5 rounded-lg text-xs">
            <Sliders size={12} className="text-slate-400" />
            <select
              value={dimensionKey}
              onChange={(e) => setDimensionKey(e.target.value)}
              className="bg-transparent border-none outline-none font-medium cursor-pointer max-w-[100px] truncate"
            >
              {dimensions.map(d => (
                <option key={d.name} value={d.name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-1.5 rounded-lg text-xs">
            <Sliders size={12} className="text-slate-400" />
            <select
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
              className="bg-transparent border-none outline-none font-medium cursor-pointer max-w-[100px] truncate"
            >
              {metrics.map(m => (
                <option key={m.name} value={m.name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type Toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg">
            <button
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800'}`}
              title="Bar Chart"
            >
              <BarChart2 size={14} />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800'}`}
              title="Line Chart"
            >
              <TrendingUp size={14} />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'pie' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800'}`}
              title="Pie Chart"
            >
              <PieIcon size={14} />
            </button>
            <button
              onClick={() => setChartType('table')}
              className={`p-1.5 rounded-md transition-all ${chartType === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800'}`}
              title="Ranking List"
            >
              <TableProperties size={14} />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={() => onFullscreenToggle(isFullscreen ? null : id)}
            className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-750 transition-all text-slate-500 dark:text-slate-400 active:scale-95"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 w-full min-h-0">
        {processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <BarChart2 size={36} className="opacity-40 animate-pulse" />
            <span className="text-sm mt-2 font-medium">No aggregate data for charts</span>
          </div>
        ) : chartType === 'table' ? (
          /* Rank Table View */
          <div className="h-full overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold pb-2">
                  <th className="py-2 pl-2 text-right">Rank</th>
                  <th className="py-2">{dimensionKey}</th>
                  <th className="py-2 text-right pr-2">{metricKey}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {processedData.slice(0, 10).map((row, idx) => {
                  const isPercent = columns.find(c => c.name === metricKey)?.type === 'percentage';
                  const displayValue = isPercent 
                    ? `${(row.value >= 0 && row.value <= 1 ? row.value * 100 : row.value).toFixed(2)}%`
                    : dataAnalyzer.formatValue(row.value, 'number', metricKey);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 pl-2 font-bold text-slate-400 text-right pr-4">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                      <td className="py-2.5 text-right font-extrabold pr-2 text-slate-900 dark:text-white">
                        {displayValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : chartType === 'pie' ? (
          /* Pie Chart View */
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={isFullscreen ? 150 : 90}
                innerRadius={isFullscreen ? 80 : 50}
                paddingAngle={2}
                label={({ name, percent }) => percent > 0.04 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
              >
                {processedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : chartType === 'progress' ? (
          /* Progress Bar List View */
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            {processedData.slice(0, 5).map((row, idx) => {
              const maxVal = Math.max(...processedData.map(d => d.value));
              // Percentage calculation
              const rawPct = maxVal > 0 ? (row.value / maxVal) * 100 : 0;
              const displayPct = row.value >= 0 && row.value <= 1 ? row.value * 100 : row.value;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span className="truncate max-w-[200px]">{row.label}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {columns.find(c => c.name === metricKey)?.type === 'percentage' 
                        ? `${displayPct.toFixed(2)}%` 
                        : dataAnalyzer.formatValue(row.value, 'number', metricKey)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, rawPct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : chartType === 'line' ? (
          /* Line Chart View */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={textLabelColor}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke={textLabelColor}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill={`url(#grad-${id})`} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* Standard Bar Chart View */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} layout={initialType === 'horizontal-bar' ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              {initialType === 'horizontal-bar' ? (
                <>
                  <XAxis type="number" stroke={textLabelColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />
                  <YAxis dataKey="label" type="category" stroke={textLabelColor} fontSize={10} tickLine={false} axisLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {processedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </>
              ) : (
                <>
                  <XAxis dataKey="label" stroke={textLabelColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke={textLabelColor} fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatYAxis} dx={-10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {processedData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
