import React from 'react';
import { Sun, Moon, Upload, Printer, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';
import { Dataset } from '../../types';

interface DashboardHeaderProps {
  dataset: Dataset | null;
  compareDataset: { datasetA: Dataset; datasetB: Dataset } | null;
  viewMode: 'single' | 'compare';
  onViewModeChange: (mode: 'single' | 'compare') => void;
  darkMode: boolean;
  onThemeToggle: () => void;
  onUploadNew: () => void;
  onSheetChange: (sheetName: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dataset,
  compareDataset,
  viewMode,
  onViewModeChange,
  darkMode,
  onThemeToggle,
  onUploadNew,
  onSheetChange,
}) => {
  const triggerPDFPrint = () => {
    window.print();
  };

  const activeSheet = viewMode === 'single' 
    ? dataset?.activeSheet 
    : compareDataset?.datasetA.activeSheet || '';

  const sheets = viewMode === 'single'
    ? dataset?.sheets || []
    : (compareDataset 
        ? compareDataset.datasetA.sheets.filter(s => compareDataset.datasetB.sheets.includes(s))
        : []);

  return (
    <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b rounded-b-2xl shadow-sm no-print">
      {/* Title & Metadata Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/10 hidden sm:block">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              Business BI Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate max-w-[280px] sm:max-w-[400px] lg:max-w-none">
              {viewMode === 'single' && dataset ? (
                <>
                  Active file: <span className="text-blue-600 dark:text-blue-400 font-bold">{dataset.fileName}</span> (Sheet: {activeSheet})
                </>
              ) : compareDataset ? (
                <>
                  Comparing: <span className="text-blue-600 dark:text-blue-400 font-bold">{compareDataset.datasetA.fileName}</span> vs <span className="text-indigo-600 dark:text-indigo-400 font-bold">{compareDataset.datasetB.fileName}</span>
                </>
              ) : (
                'Operational analysis and comparison tool'
              )}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        {(dataset || compareDataset) && (
          <nav className="flex space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold sm:ml-4">
            {dataset && (
              <button
                onClick={() => onViewModeChange('single')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'single'
                    ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                Analytics Dashboard
              </button>
            )}
            {compareDataset && (
              <button
                onClick={() => onViewModeChange('compare')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'compare'
                    ? 'bg-white dark:bg-slate-700 text-blue-650 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <ArrowLeftRight size={12} />
                  <span>Comparison View</span>
                </div>
              </button>
            )}
          </nav>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto w-full md:w-auto justify-end">
        {/* Sheet Selector (Multiple sheets support) */}
        {viewMode === 'single' && sheets.length > 1 && (
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Sheet:</span>
            <select
              value={activeSheet}
              onChange={(e) => onSheetChange(e.target.value)}
              className="bg-transparent border-none outline-none font-bold cursor-pointer text-slate-800 dark:text-slate-200"
            >
              {sheets.map(sheetName => (
                <option key={sheetName} value={sheetName} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {sheetName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Print Report */}
        <button
          onClick={triggerPDFPrint}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm hover:shadow"
          title="Print or Save PDF report"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Print Report</span>
        </button>

        {/* Dark Mode */}
        <button
          onClick={onThemeToggle}
          className="p-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-355 rounded-xl transition-all active:scale-95 shadow-sm"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun size={15} className="stroke-[2.5]" /> : <Moon size={15} className="stroke-[2.5]" />}
        </button>

        {/* Upload New File */}
        <button
          onClick={onUploadNew}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow hover:scale-[1.01] active:scale-95 transition-all"
        >
          <Upload size={14} />
          <span>Upload New</span>
        </button>
      </div>
    </header>
  );
};
