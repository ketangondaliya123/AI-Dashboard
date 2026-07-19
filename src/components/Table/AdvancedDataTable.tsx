import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Search, SlidersHorizontal } from 'lucide-react';
import { ColumnMetadata } from '../../types';
import { dataAnalyzer } from '../../services/dataAnalyzer';

interface AdvancedDataTableProps {
  data: any[];
  columns: ColumnMetadata[];
}

export const AdvancedDataTable: React.FC<AdvancedDataTableProps> = ({ data, columns }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    // Show all columns by default
    const visibility: Record<string, boolean> = {};
    columns.forEach(col => {
      visibility[col.name] = true;
    });
    return visibility;
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Toggle column visibility
  const toggleColumn = (colName: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [colName]: !prev[colName]
    }));
  };

  // Handle Sort Click
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Export Filtered Data as CSV
  const exportToCSV = () => {
    if (!filteredAndSortedData.length) return;

    // Get only visible headers
    const headers = columns.filter(c => visibleColumns[c.name]).map(c => c.name);
    
    // Create CSV rows
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add header row

    filteredAndSortedData.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) {
          return '""';
        }
        
        // Escape quotes and commas in strings
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      });
      csvRows.push(values.join(','));
    });

    // Create and trigger download blob
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dashboard_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort logic
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // 1. Search filter
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(row => {
        return Object.keys(row).some(key => {
          if (!visibleColumns[key]) return false;
          const val = row[key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(searchLower);
        });
      });
    }

    // 2. Sorting
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return direction === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();

        if (strA < strB) return direction === 'asc' ? -1 : 1;
        if (strA > strB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, visibleColumns]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedData.slice(startIdx, startIdx + rowsPerPage);
  }, [filteredAndSortedData, currentPage, rowsPerPage]);

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col space-y-4 shadow-sm animate-fade">
      {/* Control Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border-none outline-none text-sm text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Column Visibility Selector */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu(!showColMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all active:scale-95"
            >
              <SlidersHorizontal size={14} />
              <span>Columns</span>
            </button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 p-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-bold text-slate-400 px-3 py-1.5 uppercase">Toggle Visibility</div>
                  {columns.map(col => (
                    <button
                      key={col.name}
                      onClick={() => toggleColumn(col.name)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
                    >
                      <span className="truncate mr-2">{col.name}</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.name]}
                        onChange={() => {}} // handled by click
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* CSV Export */}
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-800/60 rounded-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/20 border-b border-slate-200/50 dark:border-slate-800/60">
              {columns
                .filter(col => visibleColumns[col.name])
                .map(col => (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className={`py-3 px-4 font-bold text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors whitespace-nowrap ${
                      col.type === 'number' || col.type === 'percentage' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div className={`flex items-center space-x-1.5 ${
                      col.type === 'number' || col.type === 'percentage' ? 'justify-end' : ''
                    }`}>
                      <span>{col.name}</span>
                      {sortConfig?.key === col.name ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp size={14} className="text-blue-500" />
                        ) : (
                          <ChevronDown size={14} className="text-blue-500" />
                        )
                      ) : (
                        <ChevronsUpDown size={12} className="text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.filter(c => visibleColumns[c.name]).length}
                  className="py-10 text-center text-slate-450 dark:text-slate-500 font-medium"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                >
                  {columns
                    .filter(col => visibleColumns[col.name])
                    .map(col => {
                      const value = row[col.name];
                      let displayVal = '';

                      // Formatter
                      if (value === null || value === undefined) {
                        displayVal = '—';
                      } else if (col.type === 'percentage') {
                        const numericVal = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
                        const pctVal = numericVal >= 0 && numericVal <= 1 ? numericVal * 100 : numericVal;
                        displayVal = isNaN(pctVal) ? String(value) : `${pctVal.toFixed(2)}%`;
                      } else if (col.type === 'number') {
                        const numericVal = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
                        displayVal = isNaN(numericVal) ? String(value) : dataAnalyzer.formatValue(numericVal, 'number', col.name);
                      } else if (col.type === 'date') {
                        const d = new Date(value);
                        displayVal = isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
                      } else {
                        displayVal = String(value);
                      }

                      return (
                        <td key={col.name} className={`py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate ${
                          col.type === 'number' || col.type === 'percentage' ? 'text-right' : 'text-left'
                        }`}>
                          {displayVal}
                        </td>
                      );
                    })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredAndSortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Record summary */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-700 dark:text-slate-200">
              {Math.min(filteredAndSortedData.length, (currentPage - 1) * rowsPerPage + 1)}
            </span> to <span className="font-bold text-slate-700 dark:text-slate-200">
              {Math.min(filteredAndSortedData.length, currentPage * rowsPerPage)}
            </span> of <span className="font-bold text-slate-700 dark:text-slate-200">
              {filteredAndSortedData.length.toLocaleString()}
            </span> records
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-4">
            {/* Rows Per Page */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Rows:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border-none outline-none font-semibold cursor-pointer"
              >
                {[5, 10, 20, 50, 100].map(val => (
                  <option key={val} value={val} className="bg-white dark:bg-slate-900">{val}</option>
                ))}
              </select>
            </div>

            {/* Prev/Next Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
              >
                Previous
              </button>
              <span className="px-3 text-slate-600 dark:text-slate-350">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
