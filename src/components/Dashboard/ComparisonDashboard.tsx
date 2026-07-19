import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ArrowLeftRight, Download, Search, TrendingUp, TrendingDown, 
  ChevronUp, ChevronDown, ChevronsUpDown, 
  ArrowUpRight, ArrowDownRight, AlertCircle 
} from 'lucide-react';
import { Dataset } from '../../types';
import { dataAnalyzer } from '../../services/dataAnalyzer';

interface ComparisonDashboardProps {
  datasetA: Dataset;
  datasetB: Dataset;
  darkMode: boolean;
  onBackToSingle: () => void;
  onUploadNew: () => void;
}

type GroupByDimension = 'Branch' | 'Channel' | 'City' | 'State';

interface GroupedComparisonRow {
  key: string;
  countA: number;
  countB: number;
  turnoverA: number;
  turnoverB: number;
  brokerageA: number;
  brokerageB: number;
  passoutA: number;
  passoutB: number;
  yieldA: number;
  yieldB: number;
  status: 'active' | 'new' | 'closed';
}

export const ComparisonDashboard: React.FC<ComparisonDashboardProps> = ({
  datasetA,
  datasetB,
  darkMode,
  onBackToSingle,
  onUploadNew,
}) => {
  // Find common sheets
  const commonSheets = useMemo(() => {
    return datasetA.sheets.filter(s => datasetB.sheets.includes(s));
  }, [datasetA, datasetB]);

  const [activeSheet, setActiveSheet] = useState<string>(() => {
    return commonSheets[0] || datasetA.sheets[0] || '';
  });

  const [groupBy, setGroupBy] = useState<GroupByDimension>('Branch');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof GroupedComparisonRow | string; direction: 'asc' | 'desc' } | null>(null);

  // Extract columns/data for current sheet
  const colsA = useMemo(() => datasetA.metadata[activeSheet] || [], [datasetA, activeSheet]);
  const rowsA = useMemo(() => datasetA.data[activeSheet] || [], [datasetA, activeSheet]);
  const rowsB = useMemo(() => datasetB.data[activeSheet] || [], [datasetB, activeSheet]);

  // Dynamically detect keys based on format
  const keys = useMemo(() => {
    const dimensionNames = colsA.filter(c => c.role === 'dimension').map(c => c.name);
    
    const findKey = (keywords: string[]) => {
      return dimensionNames.find(name => 
        keywords.some(kw => name.toLowerCase().includes(kw))
      ) || null;
    };

    return {
      branchId: findKey(['branch id', 'branch_id', 'branchid']),
      branchName: findKey(['branch name', 'branch_name', 'branchname']),
      branch: findKey(['branch']) || findKey(['branch id']) || findKey(['branch name']) || dimensionNames[0] || 'Branch ID',
      
      channelId: findKey(['channel id', 'channel_id', 'channelid', 'cp id', 'cpid']),
      channelName: findKey(['channel name', 'channel_name', 'channelname', 'cp name', 'cpname', 'chnl name', 'chnlname']),
      channel: findKey(['channel name']) || findKey(['channel id']) || findKey(['channel']) || findKey(['channel name']) || findKey(['cp']) || dimensionNames[1] || 'Channel ID',
      
      city: findKey(['city', 'location', 'town']),
      state: findKey(['state', 'region', 'zone']),

      // Metrics keys mapping
      turnover: colsA.find(c => c.role === 'metric' && ['turnover', 'turn.', 'volume'].some(kw => c.name.toLowerCase().includes(kw)))?.name || 'Turnover',
      brokerage: colsA.find(c => c.role === 'metric' && ['brokerage', 'brok.', 'revenue'].some(kw => c.name.toLowerCase().includes(kw)))?.name || 'Brokerage',
      passout: colsA.find(c => c.role === 'metric' && ['passout', 'cppassout', 'payout'].some(kw => c.name.toLowerCase().includes(kw)))?.name || 'Passout',
      yield: colsA.find(c => c.role === 'metric' && ['yield', 'margin', 'rate'].some(kw => c.name.toLowerCase().includes(kw)))?.name || 'Yield'
    };
  }, [colsA]);

  // Determine actual column name for the current active grouping selection
  const activeGroupingKey = useMemo(() => {
    switch (groupBy) {
      case 'Branch': return keys.branch;
      case 'Channel': return keys.channel;
      case 'City': return keys.city || 'City';
      case 'State': return keys.state || 'State';
    }
  }, [groupBy, keys]);

  // Compile comparison data
  const comparisonData = useMemo((): GroupedComparisonRow[] => {
    if (!activeGroupingKey) return [];

    const mapA: Record<string, any[]> = {};
    const mapB: Record<string, any[]> = {};

    // Group rows from File A
    rowsA.forEach(row => {
      const keyVal = String(row[activeGroupingKey] || 'UNKNOWN').trim();
      if (!mapA[keyVal]) mapA[keyVal] = [];
      mapA[keyVal].push(row);
    });

    // Group rows from File B
    rowsB.forEach(row => {
      const keyVal = String(row[activeGroupingKey] || 'UNKNOWN').trim();
      if (!mapB[keyVal]) mapB[keyVal] = [];
      mapB[keyVal].push(row);
    });

    const allKeys = Array.from(new Set([...Object.keys(mapA), ...Object.keys(mapB)]));

    return allKeys.map(key => {
      const groupA = mapA[key] || [];
      const groupB = mapB[key] || [];

      // Sum metrics for Group A
      const countA = groupA.length;
      const turnoverA = groupA.reduce((sum, r) => sum + (Number(r[keys.turnover]) || 0), 0);
      const brokerageA = groupA.reduce((sum, r) => sum + (Number(r[keys.brokerage]) || 0), 0);
      const passoutA = groupA.reduce((sum, r) => sum + (Number(r[keys.passout]) || 0), 0);
      
      // Yield average
      const yieldA = groupA.length > 0
        ? groupA.reduce((sum, r) => sum + (Number(r[keys.yield]) || 0), 0) / groupA.length
        : 0;

      // Sum metrics for Group B
      const countB = groupB.length;
      const turnoverB = groupB.reduce((sum, r) => sum + (Number(r[keys.turnover]) || 0), 0);
      const brokerageB = groupB.reduce((sum, r) => sum + (Number(r[keys.brokerage]) || 0), 0);
      const passoutB = groupB.reduce((sum, r) => sum + (Number(r[keys.passout]) || 0), 0);
      
      const yieldB = groupB.length > 0
        ? groupB.reduce((sum, r) => sum + (Number(r[keys.yield]) || 0), 0) / groupB.length
        : 0;

      let status: 'active' | 'new' | 'closed' = 'active';
      if (countA === 0) status = 'new';
      else if (countB === 0) status = 'closed';

      return {
        key,
        countA,
        countB,
        turnoverA: Number(turnoverA.toFixed(2)),
        turnoverB: Number(turnoverB.toFixed(2)),
        brokerageA: Number(brokerageA.toFixed(2)),
        brokerageB: Number(brokerageB.toFixed(2)),
        passoutA: Number(passoutA.toFixed(2)),
        passoutB: Number(passoutB.toFixed(2)),
        yieldA: Number(yieldA.toFixed(4)),
        yieldB: Number(yieldB.toFixed(4)),
        status
      };
    });
  }, [rowsA, rowsB, activeGroupingKey, keys]);

  // Overall sums and counts
  const summary = useMemo(() => {
    const recordsA = rowsA.length;
    const recordsB = rowsB.length;

    const tA = rowsA.reduce((sum, r) => sum + (Number(r[keys.turnover]) || 0), 0);
    const tB = rowsB.reduce((sum, r) => sum + (Number(r[keys.turnover]) || 0), 0);

    const bA = rowsA.reduce((sum, r) => sum + (Number(r[keys.brokerage]) || 0), 0);
    const bB = rowsB.reduce((sum, r) => sum + (Number(r[keys.brokerage]) || 0), 0);

    const pA = rowsA.reduce((sum, r) => sum + (Number(r[keys.passout]) || 0), 0);
    const pB = rowsB.reduce((sum, r) => sum + (Number(r[keys.passout]) || 0), 0);

    // Yield averages
    const yA = rowsA.length > 0 ? rowsA.reduce((sum, r) => sum + (Number(r[keys.yield]) || 0), 0) / rowsA.length : 0;
    const yB = rowsB.length > 0 ? rowsB.reduce((sum, r) => sum + (Number(r[keys.yield]) || 0), 0) / rowsB.length : 0;

    // Unique Categories counts
    const catsA = new Set(rowsA.map(r => r[activeGroupingKey]).filter(Boolean)).size;
    const catsB = new Set(rowsB.map(r => r[activeGroupingKey]).filter(Boolean)).size;

    return {
      recordsA, recordsB, recordsDiff: recordsB - recordsA, recordsPct: recordsA > 0 ? ((recordsB - recordsA) / recordsA) * 100 : 0,
      turnoverA: tA, turnoverB: tB, turnoverDiff: tB - tA, turnoverPct: tA > 0 ? ((tB - tA) / tA) * 100 : 0,
      brokerageA: bA, brokerageB: bB, brokerageDiff: bB - bA, brokeragePct: bA > 0 ? ((bB - bA) / bA) * 100 : 0,
      passoutA: pA, passoutB: pB, passoutDiff: pB - pA, passoutPct: pA > 0 ? ((pB - pA) / pA) * 100 : 0,
      yieldA: yA, yieldB: yB, yieldDiff: yB - yA,
      catsA, catsB, catsDiff: catsB - catsA, catsPct: catsA > 0 ? ((catsB - catsA) / catsA) * 100 : 0
    };
  }, [rowsA, rowsB, keys, activeGroupingKey]);

  // Sort and Filter logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...comparisonData];

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(row => row.key.toLowerCase().includes(term));
    }

    // Sort config
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        let valA = a[key as keyof GroupedComparisonRow];
        let valB = b[key as keyof GroupedComparisonRow];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }

        // Numeric comparison
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return direction === 'asc' ? numA - numB : numB - numA;
      });
    } else {
      // By default sort by Brokerage Difference descending to show biggest shifts first
      result.sort((a, b) => {
        const diffA = a.brokerageB - a.brokerageA;
        const diffB = b.brokerageB - b.brokerageA;
        return diffB - diffA; // largest increase first
      });
    }

    return result;
  }, [comparisonData, searchTerm, sortConfig]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedData.slice(start, start + rowsPerPage);
  }, [filteredAndSortedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);

  // Top gainers and decliners for Brokerage delta
  const { topGainers, topDecliners } = useMemo(() => {
    const scored = comparisonData
      .map(row => ({
        key: row.key,
        diff: row.brokerageB - row.brokerageA,
        valA: row.brokerageA,
        valB: row.brokerageB,
        pct: row.brokerageA > 0 ? ((row.brokerageB - row.brokerageA) / row.brokerageA) * 100 : null
      }))
      .filter(row => row.diff !== 0 && row.key !== 'UNKNOWN');

    const gainers = [...scored]
      .filter(r => r.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 5);

    const decliners = [...scored]
      .filter(r => r.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    return { topGainers: gainers, topDecliners: decliners };
  }, [comparisonData]);

  // Data for Side-by-Side Chart (Top 8 categories by File B Brokerage)
  const chartData = useMemo(() => {
    return [...comparisonData]
      .sort((a, b) => b.brokerageB - a.brokerageB)
      .slice(0, 8)
      .map(row => ({
        name: row.key.length > 15 ? row.key.substring(0, 15) + '...' : row.key,
        fullName: row.key,
        [datasetA.fileName.substring(0, 15)]: row.brokerageA,
        [datasetB.fileName.substring(0, 15)]: row.brokerageB,
      }));
  }, [comparisonData, datasetA, datasetB]);

  // Export CSV
  const handleCSVExport = () => {
    if (comparisonData.length === 0) return;

    const headers = [
      `${groupBy} Name`, 
      `File A Record Count`, `File B Record Count`, 
      `File A Turnover`, `File B Turnover`, `Turnover Delta`, `Turnover Pct Change`,
      `File A Brokerage`, `File B Brokerage`, `Brokerage Delta`, `Brokerage Pct Change`,
      `File A Passout`, `File B Passout`, `Passout Delta`, `Passout Pct Change`,
      `File A Avg Yield`, `File B Avg Yield`, `Yield Delta`, `Status`
    ];

    const csvRows = [headers.join(',')];

    comparisonData.forEach(row => {
      const tDiff = row.turnoverB - row.turnoverA;
      const tPct = row.turnoverA > 0 ? ((row.turnoverB - row.turnoverA) / row.turnoverA) * 100 : 0;
      const bDiff = row.brokerageB - row.brokerageA;
      const bPct = row.brokerageA > 0 ? ((row.brokerageB - row.brokerageA) / row.brokerageA) * 100 : 0;
      const pDiff = row.passoutB - row.passoutA;
      const pPct = row.passoutA > 0 ? ((row.passoutB - row.passoutA) / row.passoutA) * 100 : 0;
      const yDiff = row.yieldB - row.yieldA;

      const fields = [
        `"${row.key.replace(/"/g, '""')}"`,
        row.countA, row.countB,
        row.turnoverA, row.turnoverB, tDiff, `${tPct.toFixed(2)}%`,
        row.brokerageA, row.brokerageB, bDiff, `${bPct.toFixed(2)}%`,
        row.passoutA, row.passoutB, pDiff, `${pPct.toFixed(2)}%`,
        row.yieldA.toFixed(4), row.yieldB.toFixed(4), yDiff.toFixed(4),
        row.status
      ];
      csvRows.push(fields.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `excel_comparison_by_${groupBy.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSortClick = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ChevronsUpDown size={12} className="text-slate-400 opacity-60 ml-1 inline" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="text-blue-500 ml-1 inline" />
      : <ChevronDown size={14} className="text-blue-500 ml-1 inline" />;
  };

  const formatDelta = (value: number, type: 'number' | 'percentage' | 'currency' = 'number', metricName?: string) => {
    const formatted = dataAnalyzer.formatValue(Math.abs(value), type === 'percentage' ? 'percentage' : 'number', metricName);
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted}`;
  };

  const renderDeltaBadge = (value: number, pct: number | null, inverse = false, metricName?: string) => {
    if (value === 0) {
      return <span className="text-slate-400 font-semibold text-xs">—</span>;
    }
    
    const isPositive = value > 0;
    const isGood = inverse ? !isPositive : isPositive;

    const bgClass = isGood 
      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-450 border-emerald-500/10' 
      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-450 border-rose-500/10';
    
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
      <div className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-extrabold ${bgClass}`}>
        <Icon size={13} className="flex-shrink-0" />
        <span>{formatDelta(value, 'number', metricName)}</span>
        {pct !== null && (
          <span className="font-semibold text-[10px] opacity-85">({formatDelta(pct, 'percentage')})</span>
        )}
      </div>
    );
  };

  const renderKPIComparison = (
    title: string, 
    valA: number, 
    valB: number, 
    diff: number, 
    pct: number | null, 
    type: 'number' | 'percentage' | 'text' = 'number',
    inverse = false
  ) => {
    const isGood = inverse ? diff < 0 : diff > 0;
    const diffColor = diff === 0 
      ? 'text-slate-500 dark:text-slate-400' 
      : isGood 
        ? 'text-emerald-600 dark:text-emerald-400' 
        : 'text-rose-600 dark:text-rose-400';

    return (
      <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-full border hover:border-slate-300 dark:hover:border-slate-800 transition-all shadow-sm">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{title}</div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Ref (A)</div>
            <div className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-0.5 truncate">
              {dataAnalyzer.formatValue(valA, type === 'percentage' ? 'percentage' : 'number', title)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight font-sans">Comp (B)</div>
            <div className="text-sm font-extrabold text-slate-800 dark:text-white mt-0.5 truncate">
              {dataAnalyzer.formatValue(valB, type === 'percentage' ? 'percentage' : 'number', title)}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500">Difference</span>
          <span className={`text-xs font-black flex items-center space-x-1 ${diffColor}`}>
            {diff > 0 ? '+' : ''}{dataAnalyzer.formatValue(diff, type === 'percentage' ? 'percentage' : 'number', title)}
            {pct !== null && (
              <span className="text-[10px] font-semibold ml-1">
                ({diff > 0 ? '+' : ''}{pct.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      </div>
    );
  };

  if (commonSheets.length === 0) {
    return (
      <div className="glass-panel p-10 rounded-2xl text-center space-y-4 max-w-xl mx-auto border border-red-200 dark:border-red-950/30">
        <AlertCircle className="text-red-500 mx-auto" size={48} />
        <h3 className="text-lg font-bold">No Matching Sheets Found</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The uploaded Excel files must contain at least one sheet with the same name to compare. 
        </p>
        <div className="text-left text-xs bg-slate-100 dark:bg-slate-900 p-4 rounded-xl space-y-1">
          <div><strong className="text-slate-650 dark:text-slate-400">File A Sheets:</strong> {datasetA.sheets.join(', ')}</div>
          <div><strong className="text-slate-650 dark:text-slate-400">File B Sheets:</strong> {datasetB.sheets.join(', ')}</div>
        </div>
        <button
          onClick={onUploadNew}
          className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          Upload Different Files
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection controls */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-4">
          {/* Back button */}
          <button
            onClick={onBackToSingle}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-355 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <span>Back to Dashboard</span>
          </button>

          {/* Sheet Selector */}
          {commonSheets.length > 1 && (
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="text-slate-450 dark:text-slate-500">Sheet:</span>
              <select
                value={activeSheet}
                onChange={(e) => {
                  setActiveSheet(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none outline-none font-extrabold cursor-pointer text-slate-800 dark:text-slate-100"
              >
                {commonSheets.map(sheet => (
                  <option key={sheet} value={sheet} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group By selector */}
          <div className="flex items-center bg-slate-150/60 dark:bg-slate-850 p-1 rounded-xl text-xs font-bold">
            <span className="px-3.5 text-slate-500 dark:text-slate-400">Group By:</span>
            {(['Branch', 'Channel', 'City', 'State'] as GroupByDimension[]).map(dim => {
              // Ensure dynamic checks if data actually has this column (except Fallback)
              const hasCol = dim === 'Branch' || 
                             (dim === 'Channel' && keys.channel) || 
                             (dim === 'City' && keys.city) || 
                             (dim === 'State' && keys.state);
              if (!hasCol) return null;

              return (
                <button
                  key={dim}
                  onClick={() => {
                    setGroupBy(dim);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    groupBy === dim
                      ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-750 dark:text-slate-400'
                  }`}
                >
                  {dim}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info label */}
        <div className="text-xs text-slate-450 dark:text-slate-500 font-bold flex items-center space-x-1.5">
          <ArrowLeftRight size={14} className="text-blue-500" />
          <span>Comparing: <span className="text-slate-700 dark:text-slate-300 font-black">{datasetA.fileName}</span> vs <span className="text-slate-700 dark:text-slate-300 font-black">{datasetB.fileName}</span></span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {renderKPIComparison("Total Records", summary.recordsA, summary.recordsB, summary.recordsDiff, summary.recordsPct)}
        {renderKPIComparison(`Total ${keys.turnover}`, summary.turnoverA, summary.turnoverB, summary.turnoverDiff, summary.turnoverPct)}
        {renderKPIComparison(`Total ${keys.brokerage}`, summary.brokerageA, summary.brokerageB, summary.brokerageDiff, summary.brokeragePct)}
        {rowsA[0] && rowsA[0][keys.passout] !== undefined && 
          renderKPIComparison(`Total ${keys.passout}`, summary.passoutA, summary.passoutB, summary.passoutDiff, summary.passoutPct, 'number', true)}
        {renderKPIComparison(`Avg ${keys.yield}`, summary.yieldA, summary.yieldB, summary.yieldDiff, null, 'percentage')}
        {renderKPIComparison(`Active ${groupBy}s`, summary.catsA, summary.catsB, summary.catsDiff, summary.catsPct)}
      </div>

      {/* Visual Charts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 8 Net Brokerage comparison bar chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
              Brokerage Comparison (Top 8 {groupBy}s)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Side-by-side performance comparison for the highest revenue-generating categories.
            </p>
          </div>
          <div className="h-64 mt-4 w-full text-xs font-semibold">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">No chart data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#334155" : "#e2e8f0"} />
                  <XAxis dataKey="name" stroke={darkMode ? "#94a3b8" : "#64748b"} tickLine={false} axisLine={false} />
                  <YAxis stroke={darkMode ? "#94a3b8" : "#64748b"} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                      borderColor: darkMode ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      color: darkMode ? '#f8fafc' : '#0f172a'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey={datasetA.fileName.substring(0, 15)} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={datasetB.fileName.substring(0, 15)} fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Shifts (Gainers & Decliners) */}
        <div className="glass-panel p-5 rounded-2xl border shadow-sm space-y-5">
          {/* Gainers */}
          <div>
            <div className="flex items-center space-x-2 text-emerald-650 dark:text-emerald-400 font-extrabold text-sm mb-3">
              <TrendingUp size={16} />
              <span>Top Gainers (by Brokerage)</span>
            </div>
            <div className="space-y-2">
              {topGainers.length === 0 ? (
                <div className="text-xs text-slate-450 dark:text-slate-500 py-4 text-center">No gainers found.</div>
              ) : (
                topGainers.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={item.key}>
                      {item.key}
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-600 dark:text-emerald-450">+{dataAnalyzer.formatValue(item.diff, 'number', keys.brokerage)}</span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 ml-1.5 block">
                        {dataAnalyzer.formatValue(item.valA, 'number', keys.brokerage)} → {dataAnalyzer.formatValue(item.valB, 'number', keys.brokerage)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decliners */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-rose-650 dark:text-rose-455 font-extrabold text-sm mb-3">
              <TrendingDown size={16} />
              <span>Top Decliners (by Brokerage)</span>
            </div>
            <div className="space-y-2">
              {topDecliners.length === 0 ? (
                <div className="text-xs text-slate-455 dark:text-slate-500 py-4 text-center">No decliners found.</div>
              ) : (
                topDecliners.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={item.key}>
                      {item.key}
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-600 dark:text-rose-450">{dataAnalyzer.formatValue(item.diff, 'number', keys.brokerage)}</span>
                      <span className="text-[10px] text-slate-455 dark:text-slate-500 ml-1.5 block">
                        {dataAnalyzer.formatValue(item.valA, 'number', keys.brokerage)} → {dataAnalyzer.formatValue(item.valB, 'number', keys.brokerage)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed comparison table */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col space-y-4 border shadow-sm">
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${groupBy.toLowerCase()}s...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border-none outline-none text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <button
            onClick={handleCSVExport}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
          >
            <Download size={14} />
            <span>Export Comparison CSV</span>
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-800/60 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200/50 dark:border-slate-800/60">
                <th
                  onClick={() => handleSortClick('key')}
                  className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                >
                  {groupBy} {renderSortIndicator('key')}
                </th>
                <th
                  onClick={() => handleSortClick('status')}
                  className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-center"
                >
                  Status {renderSortIndicator('status')}
                </th>
                <th
                  onClick={() => handleSortClick('turnoverB')}
                  className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-right"
                >
                  {keys.turnover} (A → B) {renderSortIndicator('turnoverB')}
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">
                  {keys.turnover} Change
                </th>
                <th
                  onClick={() => handleSortClick('yieldB')}
                  className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors text-right"
                >
                  {keys.yield} (A → B) {renderSortIndicator('yieldB')}
                </th>
                <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 text-right">
                  {keys.yield} Delta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-semibold text-sm">
                    No matching categories found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const tDiff = row.turnoverB - row.turnoverA;
                  const tPct = row.turnoverA > 0 ? ((row.turnoverB - row.turnoverA) / row.turnoverA) * 100 : null;

                  const yDiff = row.yieldB - row.yieldA;

                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-500/10 uppercase">
                      Active
                    </span>
                  );

                  if (row.status === 'new') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 uppercase">
                        New
                      </span>
                    );
                  } else if (row.status === 'closed') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-500/10 uppercase">
                        Closed
                      </span>
                    );
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-350 max-w-[180px] truncate" title={row.key}>
                        {row.key}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {statusBadge}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-350">
                        <div className="flex flex-col items-end text-right">
                          <span className="font-bold text-xs">{dataAnalyzer.formatValue(row.turnoverB, 'number', keys.turnover)}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500">Ref: {dataAnalyzer.formatValue(row.turnoverA, 'number', keys.turnover)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end">
                          {renderDeltaBadge(tDiff, tPct, false, keys.turnover)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-350">
                        <div className="flex flex-col items-end text-right">
                          <span className="font-bold text-xs">{dataAnalyzer.formatValue(row.yieldB, 'percentage')}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500">Ref: {dataAnalyzer.formatValue(row.yieldA, 'percentage')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-black text-xs inline-block ${
                          yDiff === 0 
                            ? 'text-slate-400' 
                            : yDiff > 0 
                              ? 'text-emerald-600 dark:text-emerald-450' 
                              : 'text-rose-600 dark:text-rose-450'
                        }`}>
                          {yDiff > 0 ? '+' : ''}{yDiff.toFixed(3)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAndSortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              Showing <span className="text-slate-700 dark:text-slate-200">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="text-slate-700 dark:text-slate-200">{Math.min(filteredAndSortedData.length, currentPage * rowsPerPage)}</span> of <span className="text-slate-700 dark:text-slate-200">{filteredAndSortedData.length.toLocaleString()}</span> categories
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold">
                <span>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border-none outline-none font-extrabold cursor-pointer"
                >
                  {[5, 10, 20, 50, 100].map(val => (
                    <option key={val} value={val} className="bg-white dark:bg-slate-900">{val}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition-all disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                <span className="px-3 text-slate-600 dark:text-slate-350">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition-all disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
