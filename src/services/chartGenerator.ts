import { ColumnMetadata, ChartConfig } from '../types';

export const chartGenerator = {
  /**
   * Generates chart configurations based on columns metadata.
   */
  generateChartConfigs(columns: ColumnMetadata[]): ChartConfig[] {
    const configs: ChartConfig[] = [];

    const textDims = columns.filter(c => c.type === 'text' && c.role === 'dimension');
    const dateDims = columns.filter(c => c.type === 'date' && c.role === 'dimension');
    const metrics = columns.filter(c => c.role === 'metric');

    if (metrics.length === 0) return [];

    // Prioritize metrics
    const getMetricPriority = (name: string): number => {
      const n = name.toLowerCase();
      if (n.includes('turnover') || n.includes('sales') || n.includes('turn.')) return 10;
      if (n.includes('brokerage') || n.includes('revenue') || n.includes('profit') || n.includes('brok.')) return 9;
      if (n.includes('yield')) return 8;
      if (n.includes('amount')) return 7;
      if (n.includes('income')) return 6;
      return 1;
    };

    const sortedMetrics = [...metrics].sort((a, b) => getMetricPriority(b.name) - getMetricPriority(a.name));
    const primaryMetric = sortedMetrics[0];
    const secondaryMetric = sortedMetrics[1] || sortedMetrics[0];
    const percentageMetric = metrics.find(m => m.type === 'percentage');

    // Prioritize dimensions
    const getDimPriority = (name: string): number => {
      const n = name.toLowerCase();
      if (n.includes('city')) return 10;
      if (n.includes('state')) return 9;
      if (n.includes('branch') || n.includes('brcid')) return 8;
      if (n.includes('category') || n.includes('segment')) return 7;
      if (n.includes('chnlname') || n.includes('channel')) return 6;
      return 1;
    };

    const sortedDims = [...textDims].sort((a, b) => getDimPriority(b.name) - getDimPriority(a.name));
    const primaryDim = sortedDims[0];
    const secondaryDim = sortedDims[1] || sortedDims[0];

    // 1. Bar Chart (Primary Category vs Primary Metric)
    if (primaryDim && primaryMetric) {
      configs.push({
        id: 'bar_primary',
        type: 'bar',
        title: `${primaryMetric.name} by ${primaryDim.name}`,
        dimensionKey: primaryDim.name,
        metricKey: primaryMetric.name
      });
    }

    // 2. Horizontal Bar Chart / Ranking (Primary Category vs Secondary Metric)
    if (primaryDim && secondaryMetric) {
      configs.push({
        id: 'horizontal_secondary',
        type: 'horizontal-bar',
        title: `Top ${primaryDim.name}s by ${secondaryMetric.name}`,
        dimensionKey: primaryDim.name,
        metricKey: secondaryMetric.name
      });
    }

    // 3. Line Chart (Date vs Primary Metric)
    if (dateDims.length > 0 && primaryMetric) {
      const primaryDate = dateDims[0];
      configs.push({
        id: 'line_date',
        type: 'line',
        title: `${primaryMetric.name} Trend over Time`,
        dimensionKey: primaryDate.name,
        metricKey: primaryMetric.name
      });
    } else if (primaryDim && primaryMetric && primaryDim.uniqueCount > 5) {
      // Fallback: If no date columns, render a trend of another high cardinality category or secondary metric
      configs.push({
        id: 'line_fallback',
        type: 'line',
        title: `${secondaryMetric.name} Trend by ${primaryDim.name}`,
        dimensionKey: primaryDim.name,
        metricKey: secondaryMetric.name
      });
    }

    // 4. Pie Chart (Secondary Category vs Percentage or Primary Metric)
    // Pie charts look best when there are <= 10 slices.
    let pieDim = sortedDims.find(d => d.uniqueCount >= 2 && d.uniqueCount <= 10);
    if (!pieDim) {
      pieDim = secondaryDim || primaryDim;
    }

    if (pieDim && primaryMetric) {
      configs.push({
        id: 'pie_distribution',
        type: 'pie',
        title: `${primaryMetric.name} Share by ${pieDim.name}`,
        dimensionKey: pieDim.name,
        metricKey: primaryMetric.name
      });
    }

    // 5. Progress Chart (Percentage Metric or Yield)
    if (percentageMetric && primaryDim) {
      configs.push({
        id: 'progress_percentage',
        type: 'progress',
        title: `Average ${percentageMetric.name} by ${primaryDim.name}`,
        dimensionKey: primaryDim.name,
        metricKey: percentageMetric.name
      });
    }

    // 6. Ranking Table (Top 10 Categories by Primary Metric)
    if (primaryDim && primaryMetric) {
      configs.push({
        id: 'ranking_table',
        type: 'table',
        title: `Top 10 ${primaryDim.name} Rank List (${primaryMetric.name})`,
        dimensionKey: primaryDim.name,
        metricKey: primaryMetric.name
      });
    }

    return configs;
  }
};
