import { useState, useEffect, useMemo } from 'react';
import { excelParser } from './services/excelParser';
import { dataAnalyzer } from './services/dataAnalyzer';
import { storageService } from './services/storageService';
import { DragDropUpload } from './components/Upload/DragDropUpload';
import { DashboardHeader } from './components/Dashboard/DashboardHeader';
import { DashboardFilters } from './components/Dashboard/DashboardFilters';
import { DashboardGrid } from './components/Dashboard/DashboardGrid';
import { ComparisonDashboard } from './components/Dashboard/ComparisonDashboard';
import { Dataset, FilterState, ColumnMetadata } from './types';
import { RefreshCw } from 'lucide-react';

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [compareDataset, setCompareDataset] = useState<{ datasetA: Dataset; datasetB: Dataset } | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync dark mode HTML classes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Load dataset from IndexedDB on startup
  useEffect(() => {
    const loadStored = async () => {
      try {
        const storedSingle = await storageService.getDataset('active_dataset');
        const storedA = await storageService.getDataset('compare_dataset_a');
        const storedB = await storageService.getDataset('compare_dataset_b');

        if (storedA && storedB) {
          setCompareDataset({ datasetA: storedA, datasetB: storedB });
          setViewMode('compare');
        } else if (storedSingle) {
          setDataset(storedSingle);
          setViewMode('single');
        }
      } catch (e) {
        console.error("Failed to restore stored datasets", e);
      } finally {
        setIsInitializing(false);
      }
    };
    loadStored();
  }, []);

  const handleExcelUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await excelParser.parseExcel(file);
      const sheets = parsed.sheetNames;
      const dataMap: Record<string, any[]> = {};
      const metaMap: Record<string, ColumnMetadata[]> = {};

      let hasRows = false;
      sheets.forEach(sheetName => {
        const sheetInfo = parsed.sheetsData[sheetName];
        dataMap[sheetName] = sheetInfo.rows;
        metaMap[sheetName] = dataAnalyzer.analyzeColumns(sheetInfo.rows);
        if (sheetInfo.rows.length > 0) {
          hasRows = true;
        }
      });

      if (!hasRows) {
        throw new Error("Excel sheets do not contain any valid data rows.");
      }

      const newDataset: Dataset = {
        id: 'active_dataset',
        fileName: file.name,
        fileSize: file.size,
        uploadTimestamp: Date.now(),
        sheets,
        activeSheet: sheets[0],
        data: dataMap,
        metadata: metaMap
      };

      await storageService.saveDataset(newDataset, 'active_dataset');

      setDataset(newDataset);
      setCompareDataset(null);
      setViewMode('single');
      setActiveFilters({});
      setDateRange({ start: '', end: '' });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An error occurred while parsing the Excel file. Verify its structure.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelCompareUpload = async (fileA: File, fileB: File) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Parse File A
      const parsedA = await excelParser.parseExcel(fileA);
      const dataMapA: Record<string, any[]> = {};
      const metaMapA: Record<string, ColumnMetadata[]> = {};
      parsedA.sheetNames.forEach(sheetName => {
        const sheetInfo = parsedA.sheetsData[sheetName];
        dataMapA[sheetName] = sheetInfo.rows;
        metaMapA[sheetName] = dataAnalyzer.analyzeColumns(sheetInfo.rows);
      });

      const datasetObjA: Dataset = {
        id: 'compare_dataset_a',
        fileName: fileA.name,
        fileSize: fileA.size,
        uploadTimestamp: Date.now(),
        sheets: parsedA.sheetNames,
        activeSheet: parsedA.sheetNames[0],
        data: dataMapA,
        metadata: metaMapA
      };

      // 2. Parse File B
      const parsedB = await excelParser.parseExcel(fileB);
      const dataMapB: Record<string, any[]> = {};
      const metaMapB: Record<string, ColumnMetadata[]> = {};
      parsedB.sheetNames.forEach(sheetName => {
        const sheetInfo = parsedB.sheetsData[sheetName];
        dataMapB[sheetName] = sheetInfo.rows;
        metaMapB[sheetName] = dataAnalyzer.analyzeColumns(sheetInfo.rows);
      });

      const datasetObjB: Dataset = {
        id: 'compare_dataset_b',
        fileName: fileB.name,
        fileSize: fileB.size,
        uploadTimestamp: Date.now(),
        sheets: parsedB.sheetNames,
        activeSheet: parsedB.sheetNames[0],
        data: dataMapB,
        metadata: metaMapB
      };

      // 3. Save to storage
      await storageService.saveDataset(datasetObjA, 'compare_dataset_a');
      await storageService.saveDataset(datasetObjB, 'compare_dataset_b');

      setCompareDataset({ datasetA: datasetObjA, datasetB: datasetObjB });
      setDataset(null);
      setViewMode('compare');
      setActiveFilters({});
      setDateRange({ start: '', end: '' });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An error occurred while parsing the comparison Excel files.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (viewMode === 'single' && dataset) {
      const updated: Dataset = {
        ...dataset,
        activeSheet: sheetName
      };
      await storageService.saveDataset(updated, 'active_dataset');
      setDataset(updated);
      setActiveFilters({});
      setDateRange({ start: '', end: '' });
    } else if (viewMode === 'compare' && compareDataset) {
      const updatedA = { ...compareDataset.datasetA, activeSheet: sheetName };
      const updatedB = { ...compareDataset.datasetB, activeSheet: sheetName };
      await storageService.saveDataset(updatedA, 'compare_dataset_a');
      await storageService.saveDataset(updatedB, 'compare_dataset_b');
      setCompareDataset({ datasetA: updatedA, datasetB: updatedB });
    }
  };

  const handleFilterChange = (columnName: string, selectedValues: string[]) => {
    setActiveFilters(prev => ({
      ...prev,
      [columnName]: selectedValues
    }));
  };

  const handleDateRangeChange = (range: { start: string; end: string }) => {
    setDateRange(range);
  };

  const handleResetFilters = () => {
    setActiveFilters({});
    setDateRange({ start: '', end: '' });
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleUploadNew = async () => {
    setDataset(null);
    setCompareDataset(null);
    setActiveFilters({});
    setDateRange({ start: '', end: '' });
    setError(null);
    await storageService.clearDataset();
  };

  // Extract metadata of the current active sheet (Single Mode)
  const activeSheetMetadata = useMemo(() => {
    if (!dataset) return [];
    return dataset.metadata[dataset.activeSheet] || [];
  }, [dataset]);

  // Extract raw rows of the active sheet (Single Mode)
  const activeSheetRawRows = useMemo(() => {
    if (!dataset) return [];
    return dataset.data[dataset.activeSheet] || [];
  }, [dataset]);

  // Apply filters and date ranges dynamically (Single Mode)
  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    let rows = activeSheetRawRows;

    // 1. Dropdown Filters
    Object.keys(activeFilters).forEach(colName => {
      const selected = activeFilters[colName];
      if (selected && selected.length > 0) {
        rows = rows.filter(row => {
          const val = row[colName];
          return val !== null && val !== undefined && selected.includes(String(val).trim());
        });
      }
    });

    // 2. Date Range Filter
    const dateCol = activeSheetMetadata.find(c => c.type === 'date');
    if (dateCol && (dateRange.start !== '' || dateRange.end !== '')) {
      const start = dateRange.start ? new Date(dateRange.start).getTime() : -Infinity;
      const adjustedEnd = dateRange.end 
        ? new Date(new Date(dateRange.end).setHours(23, 59, 59, 999)).getTime() 
        : Infinity;

      rows = rows.filter(row => {
        const val = row[dateCol.name];
        if (!val) return false;
        const time = new Date(val).getTime();
        return !isNaN(time) && time >= start && time <= adjustedEnd;
      });
    }

    return rows;
  }, [dataset, activeSheetRawRows, activeFilters, dateRange, activeSheetMetadata]);

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <RefreshCw className="animate-spin text-blue-600 dark:text-blue-400" size={32} />
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-3">
          Restoring previous dashboard...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      {dataset || compareDataset ? (
        /* Dashboard view */
        <div className="space-y-6">
          <DashboardHeader
            dataset={dataset}
            compareDataset={compareDataset}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            darkMode={darkMode}
            onThemeToggle={handleThemeToggle}
            onUploadNew={handleUploadNew}
            onSheetChange={handleSheetChange}
          />
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {viewMode === 'single' && dataset ? (
              <>
                <DashboardFilters
                  data={activeSheetRawRows}
                  columns={activeSheetMetadata}
                  activeFilters={activeFilters}
                  onFilterChange={handleFilterChange}
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  onReset={handleResetFilters}
                />

                <DashboardGrid
                  data={filteredRows}
                  columns={activeSheetMetadata}
                  darkMode={darkMode}
                />
              </>
            ) : (
              compareDataset && (
                <ComparisonDashboard
                  datasetA={compareDataset.datasetA}
                  datasetB={compareDataset.datasetB}
                  darkMode={darkMode}
                  onBackToSingle={() => {
                    if (dataset) {
                      setViewMode('single');
                    } else {
                      // Treat comparison File A as single active dataset to allow exploring it
                      const tempDataset = { ...compareDataset.datasetA, id: 'active_dataset' };
                      storageService.saveDataset(tempDataset, 'active_dataset').then(() => {
                        setDataset(tempDataset);
                        setViewMode('single');
                      });
                    }
                  }}
                  onUploadNew={handleUploadNew}
                />
              )
            )}
          </main>
        </div>
      ) : (
        /* Landing Page Upload screen */
        <div className="max-w-5xl mx-auto py-12">
          <DragDropUpload
            onUploadSingle={handleExcelUpload}
            onUploadCompare={handleExcelCompareUpload}
            currentDataset={dataset}
            currentCompareDataset={compareDataset}
            onViewDashboard={() => setViewMode('single')}
            onViewCompareDashboard={() => setViewMode('compare')}
            isLoading={isLoading}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

export default App;
