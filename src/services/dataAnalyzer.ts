import { ColumnMetadata, ColumnType, ColumnRole, KPICardData } from '../types';

export const dataAnalyzer = {
  /**
   * Analyzes rows to infer types and roles of all columns.
   */
  analyzeColumns(data: any[]): ColumnMetadata[] {
    if (data.length === 0) return [];

    const keys = Object.keys(data[0]);
    const metadataList: ColumnMetadata[] = [];

    for (const key of keys) {
      // Gather sample values (up to 200 non-empty values)
      const samples: any[] = [];
      let emptyCount = 0;
      
      for (const row of data) {
        const val = row[key];
        if (val !== null && val !== undefined && val !== "") {
          samples.push(val);
        } else {
          emptyCount++;
        }
        if (samples.length >= 200) break;
      }

      if (samples.length === 0) {
        // Fallback for completely empty column
        metadataList.push({
          name: key,
          type: 'text',
          role: 'dimension',
          uniqueCount: 0,
          sampleValues: []
        });
        continue;
      }

      // Check unique values count and unique values across the entire dataset
      const allValues = data.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== "");
      const uniqueVals = new Set(allValues);
      const uniqueCount = uniqueVals.size;

      // Classify Type
      let type: ColumnType = 'text';
      let dateCount = 0;
      let numericCount = 0;
      let percentCount = 0;

      const dateRegex = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;
      const isPercentName = key.toLowerCase().match(/(percent|growth|yield|rate|ratio|margin|pct|%)/);

      for (const val of samples) {
        if (val instanceof Date || (typeof val === 'string' && dateRegex.test(val) && !isNaN(Date.parse(val.replace(/[-/.]/g, '/'))))) {
          dateCount++;
        } else if (typeof val === 'number') {
          numericCount++;
          // If column name has percent signs/words, count as percentage
          if (isPercentName) {
            percentCount++;
          }
        } else if (typeof val === 'string') {
          const cleaned = val.replace(/[%$£€,]/g, '').trim();
          if (cleaned !== "" && !isNaN(Number(cleaned))) {
            numericCount++;
            if (val.includes('%') || isPercentName) {
              percentCount++;
            }
          }
        }
      }

      const sampleSize = samples.length;
      if (dateCount / sampleSize > 0.7) {
        type = 'date';
      } else if (percentCount / sampleSize > 0.7) {
        type = 'percentage';
      } else if (numericCount / sampleSize > 0.7) {
        type = 'number';
      } else {
        type = 'text';
      }

      // Overwrite type if it matches Year/Month named columns exactly
      if (type === 'number' && key.toLowerCase() === 'year' && uniqueCount < 15) {
        type = 'text'; // treat Year as a category / text dimension
      }

      // Classify Role: dimensions vs metrics
      // Text and dates are dimensions.
      // Numbers and percentages are metrics.
      // Exception: numeric columns with very low unique counts (e.g. < 6) could be dimensions (e.g. status code, quarter, rating).
      let role: ColumnRole = 'dimension';
      if ((type === 'number' || type === 'percentage') && uniqueCount > 6) {
        role = 'metric';
      } else if (type === 'number' || type === 'percentage') {
        // If it's a numeric column but has very few unique values, let name decide
        const metricKeywords = /(turnover|sales|revenue|amount|profit|brokerage|income|yield|passout|count|value|total|sum|cost|price)/i;
        if (metricKeywords.test(key)) {
          role = 'metric';
        } else {
          role = 'dimension';
        }
      }

      // Calculate statistical aggregations for numeric columns
      const meta: ColumnMetadata = {
        name: key,
        type,
        role,
        uniqueCount,
        sampleValues: samples.slice(0, 5)
      };

      if (type === 'number' || type === 'percentage') {
        // Clean values and filter out non-numbers
        const numbers = allValues
          .map(v => {
            if (typeof v === 'number') return v;
            const clean = String(v).replace(/[^0-9.-]/g, '');
            return clean !== "" ? Number(clean) : NaN;
          })
          .filter(v => !isNaN(v));

        if (numbers.length > 0) {
          const min = Math.min(...numbers);
          const max = Math.max(...numbers);
          const sum = numbers.reduce((a, b) => a + b, 0);
          const avg = sum / numbers.length;

          meta.min = Number(min.toFixed(4));
          meta.max = Number(max.toFixed(4));
          meta.sum = Number(sum.toFixed(4));
          meta.avg = Number(avg.toFixed(4));
        }
      }

      metadataList.push(meta);
    }

    return metadataList;
  },

  /**
   * Automatically calculates general KPIs based on numerical/categorical metadata.
   */
  calculateKPIs(data: any[], columns: ColumnMetadata[]): KPICardData[] {
    const kpis: KPICardData[] = [];
    if (data.length === 0) return [];

    // 1. Total Records (Always generate this)
    kpis.push({
      id: 'total_records',
      title: 'Total Records',
      value: data.length.toLocaleString(),
      rawValue: data.length,
      type: 'count',
      icon: 'Database',
      description: 'Total loaded records'
    });

    // Find main financial columns
    const metrics = columns.filter(c => c.role === 'metric');
    
    // Helper to search columns by keyword
    const findMetric = (keywords: string[]) => {
      return metrics.find(m => keywords.some(kw => m.name.toLowerCase().includes(kw)));
    };

    // 2. Turnover / Sales (Total Volume)
    const turnoverCol = findMetric(['turnover', 'sales', 'volume', 'amount', 'turn.']);
    if (turnoverCol && turnoverCol.sum !== undefined) {
      kpis.push({
        id: 'total_turnover',
        title: `Total ${turnoverCol.name}`,
        value: this.formatValue(turnoverCol.sum, turnoverCol.type, turnoverCol.name),
        rawValue: turnoverCol.sum,
        type: 'total',
        icon: 'TrendingUp',
        description: `Sum of ${turnoverCol.name}`
      });
    }

    // 3. Brokerage / Revenue / Profit (Total Profitability)
    const revenueCol = findMetric(['brokerage', 'revenue', 'profit', 'income', 'brok.']);
    if (revenueCol && revenueCol.sum !== undefined) {
      kpis.push({
        id: 'total_revenue',
        title: `Total ${revenueCol.name}`,
        value: this.formatValue(revenueCol.sum, revenueCol.type, revenueCol.name),
        rawValue: revenueCol.sum,
        type: 'total',
        icon: 'DollarSign',
        description: `Sum of ${revenueCol.name}`
      });
    }

    // 4. Yield / Margin / Rate (Averages)
    const yieldCol = findMetric(['yield', 'margin', 'rate', 'growth', 'percent']);
    if (yieldCol && yieldCol.avg !== undefined) {
      kpis.push({
        id: 'average_performance',
        title: `Average ${yieldCol.name}`,
        value: this.formatValue(yieldCol.avg, yieldCol.type, yieldCol.name),
        rawValue: yieldCol.avg,
        type: 'average',
        icon: 'Percent',
        description: `Average of ${yieldCol.name}`
      });
    } else {
      // Fallback: Average of any metric available if no yield found
      const fallbackMetric = metrics.find(m => m !== turnoverCol && m !== revenueCol && m.avg !== undefined);
      if (fallbackMetric && fallbackMetric.avg !== undefined) {
        kpis.push({
          id: 'average_metric',
          title: `Average ${fallbackMetric.name}`,
          value: this.formatValue(fallbackMetric.avg, fallbackMetric.type, fallbackMetric.name),
          rawValue: fallbackMetric.avg,
          type: 'average',
          icon: 'Calculator',
          description: `Average of ${fallbackMetric.name}`
        });
      }
    }

    // 5. Unique categories of primary text dimension (e.g. Branch, State, City)
    const dimensions = columns.filter(c => c.type === 'text' && c.role === 'dimension');
    const primaryDim = dimensions.find(d => ['branch', 'city', 'state', 'chnlname', 'category', 'segment'].some(kw => d.name.toLowerCase().includes(kw))) || dimensions[0];
    
    if (primaryDim) {
      kpis.push({
        id: 'categories_count',
        title: `Active ${primaryDim.name}s`,
        value: primaryDim.uniqueCount.toLocaleString(),
        rawValue: primaryDim.uniqueCount,
        type: 'count',
        icon: 'MapPin',
        description: `Unique count of ${primaryDim.name}`
      });
    }

    return kpis;
  },

  formatValue(value: number, type: ColumnType, columnName?: string): string {
    if (type === 'percentage') {
      // If value is already in % form (e.g. 10.5 representing 10.5%), format with % suffix.
      // If value is fractional (e.g. 0.1 representing 10%), format * 100.
      // Heuristic: if max is <= 1.0, multiply by 100.
      if (value >= 0 && value <= 1) {
        return `${(value * 100).toFixed(2)}%`;
      }
      return `${value.toFixed(2)}%`;
    }

    if (columnName) {
      const lowerName = columnName.toLowerCase();
      // Turnover shown in Crore
      if (lowerName.includes('turnover') || lowerName.includes('volume') || lowerName.includes('turn.')) {
        return `${(value / 10000000).toFixed(2)} Cr`;
      }
      // Brokerage, Passout, Net Brokerage shown in Lacs
      if (lowerName.includes('brokerage') || lowerName.includes('passout') || lowerName.includes('payout') || lowerName.includes('brok.') || lowerName.includes('revenue') || lowerName.includes('profit') || lowerName.includes('income')) {
        return `${(value / 100000).toFixed(2)} Lacs`;
      }
    }
    
    // Financial formatting
    if (value >= 1e12) {
      return `${(value / 1e12).toFixed(2)}T`;
    }
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    }
    if (value >= 1e3) {
      return `${(value / 1e3).toFixed(2)}K`;
    }
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
};
