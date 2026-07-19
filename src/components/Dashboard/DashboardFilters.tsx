import React, { useState, useMemo } from 'react';
import { Filter, X, Calendar, Search } from 'lucide-react';
import { ColumnMetadata } from '../../types';

interface DashboardFiltersProps {
  data: any[];
  columns: ColumnMetadata[];
  activeFilters: Record<string, string[]>; // Column -> Selected values
  onFilterChange: (columnName: string, selectedValues: string[]) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onReset: () => void;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  data,
  columns,
  activeFilters,
  onFilterChange,
  dateRange,
  onDateRangeChange,
  onReset,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Extract dimensions that make sense for dropdown filters (e.g., text type with low-to-medium unique count)
  // We prioritize columns like STATE, City, Branch, segment, etc.
  const filterableDimensions = useMemo(() => {
    return columns.filter(c => 
      c.role === 'dimension' && 
      c.type === 'text' && 
      c.uniqueCount > 1 && 
      c.uniqueCount <= 150 // Prevent rendering massive lists
    );
  }, [columns]);

  // Find if there is a date column in metadata
  const hasDateColumn = useMemo(() => {
    return columns.some(c => c.type === 'date');
  }, [columns]);

  // Extract all unique values for a column from raw data
  const getColumnUniqueValues = (colName: string) => {
    const vals = new Set<string>();
    data.forEach(row => {
      const v = row[colName];
      if (v !== null && v !== undefined && v !== "") {
        vals.add(String(v).trim());
      }
    });
    return Array.from(vals).sort();
  };

  const handleSelectToggle = (colName: string, value: string) => {
    const currentSelected = activeFilters[colName] || [];
    let updated: string[];

    if (currentSelected.includes(value)) {
      updated = currentSelected.filter(v => v !== value);
    } else {
      updated = [...currentSelected, value];
    }

    onFilterChange(colName, updated);
  };

  const hasActiveFilters = useMemo(() => {
    const hasDropdowns = Object.values(activeFilters).some(arr => arr.length > 0);
    const hasDates = dateRange.start !== '' || dateRange.end !== '';
    return hasDropdowns || hasDates;
  }, [activeFilters, dateRange]);

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/60 shadow-sm animate-fade no-print relative z-30">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-blue-500" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Dashboard Filters</h4>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center space-x-1 text-xs text-red-500 hover:text-red-650 font-bold transition-all"
          >
            <X size={12} />
            <span>Reset All</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {/* Dropdown Filters for Text Dimensions */}
        {filterableDimensions.map(dim => {
          const uniqueValues = getColumnUniqueValues(dim.name);
          const selected = activeFilters[dim.name] || [];
          const isOpen = openDropdown === dim.name;
          
          // Filter list values based on inner dropdown search
          const filteredValues = uniqueValues.filter(val => 
            val.toLowerCase().includes(dropdownSearch.toLowerCase())
          );

          return (
            <div key={dim.name} className="relative flex-col">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                {dim.name}
              </label>
              
              <button
                onClick={() => {
                  setOpenDropdown(isOpen ? null : dim.name);
                  setDropdownSearch('');
                }}
                className={`flex items-center justify-between w-48 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all select-none border border-transparent ${
                  selected.length > 0 ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400" : ""
                }`}
              >
                <span className="truncate max-w-[120px]">
                  {selected.length === 0 
                    ? `All ${dim.name}s` 
                    : selected.length === 1 
                      ? selected[0] 
                      : `${selected.length} selected`}
                </span>
                <span className="text-slate-400 font-bold ml-1.5">▼</span>
              </button>

              {isOpen && (
                <>
                  <div className="fixed inset-0 z-25" onClick={() => setOpenDropdown(null)} />
                  <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-2 animate-fade">
                    {/* Inner dropdown search */}
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input
                        type="text"
                        placeholder="Search values..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none"
                      />
                    </div>
                    {/* Checkbox list */}
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {filteredValues.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-450 dark:text-slate-550">
                          No matches
                        </div>
                      ) : (
                        filteredValues.map(val => {
                          const isChecked = selected.includes(val);
                          return (
                            <button
                              key={val}
                              onClick={() => handleSelectToggle(dim.name, val)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all"
                            >
                              <span className="truncate mr-2">{val}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // click handles toggle
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Date Range Selector */}
        {hasDateColumn && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center space-x-1">
              <Calendar size={12} />
              <span>Trading Date Range</span>
            </span>
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-transparent">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                title="Start Date"
              />
              <span className="text-slate-400 text-xs font-bold">—</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                title="End Date"
              />
              {(dateRange.start !== '' || dateRange.end !== '') && (
                <button 
                  onClick={() => onDateRangeChange({ start: '', end: '' })}
                  className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
