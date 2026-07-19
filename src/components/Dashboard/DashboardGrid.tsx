import React, { useMemo, useState } from 'react';
import { KPICard } from '../Cards/KPICard';
import { DynamicChart } from '../Charts/DynamicChart';
import { AdvancedDataTable } from '../Table/AdvancedDataTable';
import { ColumnMetadata } from '../../types';
import { dataAnalyzer } from '../../services/dataAnalyzer';
import { chartGenerator } from '../../services/chartGenerator';

interface DashboardGridProps {
  data: any[]; // Filtered rows
  columns: ColumnMetadata[];
  darkMode: boolean;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  data,
  columns,
  darkMode,
}) => {
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(null);

  // 1. Calculate dynamic KPIs based on currently filtered data
  const kpis = useMemo(() => {
    return dataAnalyzer.calculateKPIs(data, columns);
  }, [data, columns]);

  // 2. Generate chart configs based on column metadata
  const chartConfigs = useMemo(() => {
    return chartGenerator.generateChartConfigs(columns);
  }, [columns]);

  // 3. Find the fullscreen chart if any is active
  const activeFullscreenChart = useMemo(() => {
    if (!fullscreenChartId) return null;
    return chartConfigs.find(c => c.id === fullscreenChartId);
  }, [fullscreenChartId, chartConfigs]);

  const handleFullscreenToggle = (chartId: string | null) => {
    setFullscreenChartId(chartId);
  };

  return (
    <div className="space-y-8 animate-fade">
      {/* Row 1: KPI Cards (Grid of up to 4 or 5 cards) */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {kpis.slice(0, 5).map((kpi, index) => (
            <KPICard
              key={kpi.id}
              title={kpi.title}
              value={kpi.value}
              rawValue={kpi.rawValue}
              description={kpi.description}
              icon={kpi.icon}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Row 2: Dynamic Chart configurations */}
      {chartConfigs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartConfigs
            .filter(c => c.type !== 'table') // Table chart types render in Table section
            .map((config) => (
              <DynamicChart
                key={config.id}
                id={config.id}
                type={config.type}
                title={config.title}
                data={data}
                dimensionKey={config.dimensionKey}
                metricKey={config.metricKey}
                columns={columns}
                darkMode={darkMode}
                onFullscreenToggle={handleFullscreenToggle}
                isFullscreen={false}
              />
            ))}
        </div>
      )}

      {/* Row 3: Advanced Data Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Detailed Ledger Records
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Explore, filter, search and sort individual rows
            </p>
          </div>
        </div>
        <AdvancedDataTable data={data} columns={columns} />
      </div>

      {/* Fullscreen Chart Overlay */}
      {activeFullscreenChart && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 transition-opacity" 
            onClick={() => setFullscreenChartId(null)}
          />
          <DynamicChart
            id={activeFullscreenChart.id}
            type={activeFullscreenChart.type}
            title={activeFullscreenChart.title}
            data={data}
            dimensionKey={activeFullscreenChart.dimensionKey}
            metricKey={activeFullscreenChart.metricKey}
            columns={columns}
            darkMode={darkMode}
            onFullscreenToggle={handleFullscreenToggle}
            isFullscreen={true}
          />
        </>
      )}
    </div>
  );
};
