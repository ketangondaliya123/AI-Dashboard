import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, ArrowRight, Loader2, CheckCircle, ArrowLeftRight, Trash2 } from 'lucide-react';
import { Dataset } from '../../types';

interface DragDropUploadProps {
  onUploadSingle: (file: File) => void;
  onUploadCompare: (fileA: File, fileB: File) => void;
  currentDataset: Dataset | null;
  currentCompareDataset: { datasetA: Dataset; datasetB: Dataset } | null;
  onViewDashboard: () => void;
  onViewCompareDashboard: () => void;
  isLoading: boolean;
  error: string | null;
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onUploadSingle,
  onUploadCompare,
  currentDataset,
  currentCompareDataset,
  onViewDashboard,
  onViewCompareDashboard,
  isLoading,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [isDragActiveSingle, setIsDragActiveSingle] = useState(false);
  const [isDragActiveA, setIsDragActiveA] = useState(false);
  const [isDragActiveB, setIsDragActiveB] = useState(false);

  // Local state for comparison files
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);

  const singleInputRef = useRef<HTMLInputElement>(null);
  const aInputRef = useRef<HTMLInputElement>(null);
  const bInputRef = useRef<HTMLInputElement>(null);

  const handleDragSingle = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActiveSingle(true);
    } else if (e.type === "dragleave") {
      setIsDragActiveSingle(false);
    }
  };

  const handleDropSingle = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActiveSingle(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onUploadSingle(file);
      }
    }
  };

  const handleDragA = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActiveA(true);
    } else if (e.type === "dragleave") {
      setIsDragActiveA(false);
    }
  };

  const handleDropA = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActiveA(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setFileA(file);
      }
    }
  };

  const handleDragB = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActiveB(true);
    } else if (e.type === "dragleave") {
      setIsDragActiveB(false);
    }
  };

  const handleDropB = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActiveB(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setFileB(file);
      }
    }
  };

  const validateFile = (file: File): boolean => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'xlsx' || extension === 'xls') {
      return true;
    } else {
      alert("Invalid file format. Please upload an Excel file (.xlsx, .xls).");
      return false;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUploadDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStartComparison = () => {
    if (fileA && fileB) {
      onUploadCompare(fileA, fileB);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade">
      <div className="w-full max-w-2xl text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-3">
          Excel Dashboard Generator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          Upload operational data to generate an interactive BI dashboard or compare two files side-by-side.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-8 w-full max-w-md border border-slate-200/50 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'single'
              ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-750'
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5">
            <FileSpreadsheet size={16} />
            <span>Single File Analysis</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'compare'
              ? 'bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-750'
          }`}
        >
          <div className="flex items-center justify-center space-x-1.5">
            <ArrowLeftRight size={16} />
            <span>Compare 2 Excels</span>
          </div>
        </button>
      </div>

      <div className="w-full max-w-3xl">
        {/* Single File Upload View */}
        {activeTab === 'single' && (
          <div className="max-w-xl mx-auto">
            <div
              onDragEnter={handleDragSingle}
              onDragOver={handleDragSingle}
              onDragLeave={handleDragSingle}
              onDrop={handleDropSingle}
              onClick={() => singleInputRef.current?.click()}
              className={`glass-panel glass-panel-hover border-2 border-dashed rounded-2xl p-10 cursor-pointer flex flex-col items-center justify-center text-center transition-all min-h-[300px] relative ${
                isDragActiveSingle
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]"
                  : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              <input
                ref={singleInputRef}
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0] && validateFile(e.target.files[0])) {
                    onUploadSingle(e.target.files[0]);
                  }
                }}
                disabled={isLoading}
              />

              {isLoading ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 animate-spin">
                    <Loader2 size={40} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Processing Excel File...</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Detecting sheets, identifying headers, and compiling statistics.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                    <Upload size={36} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                      Drag and drop your Excel file here
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      or click to browse from your computer
                    </p>
                  </div>
                  <div className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-medium">
                    Supports .xlsx and .xls formats
                  </div>
                </div>
              )}
            </div>

            {/* Persistence Banner (Single) */}
            {currentDataset && !isLoading && (
              <div className="mt-6 p-5 glass-panel rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-100 dark:border-blue-950/30 shadow-sm">
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Current Dashboard Generated From
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-base max-w-[250px] truncate">
                      {currentDataset.fileName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Uploaded: {formatUploadDate(currentDataset.uploadTimestamp)} • {formatBytes(currentDataset.fileSize)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onViewDashboard}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-sm hover:shadow active:scale-95"
                >
                  <span>View Dashboard</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Comparison Upload View */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File A Box */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-300">File A: Base / Reference Month</label>
                {fileA ? (
                  <div className="glass-panel border-2 border-emerald-550/40 bg-emerald-50/10 dark:bg-emerald-950/5 rounded-2xl p-6 flex flex-col justify-between min-h-[180px] relative">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <CheckCircle size={24} />
                      </div>
                      <div className="text-left truncate">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-6" title={fileA.name}>
                          {fileA.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Size: {formatBytes(fileA.size)}
                        </p>
                        <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full mt-2 border border-emerald-500/10">
                          Ready
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setFileA(null)}
                      className="absolute top-4 right-4 text-slate-450 hover:text-red-500 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDragA}
                    onDragOver={handleDragA}
                    onDragLeave={handleDragA}
                    onDrop={handleDropA}
                    onClick={() => aInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 cursor-pointer flex flex-col items-center justify-center text-center transition-all min-h-[180px] bg-white dark:bg-slate-900/40 relative ${
                      isDragActiveA
                        ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10 scale-[1.01]"
                        : "border-slate-300 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500"
                    }`}
                  >
                    <input
                      ref={aInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0] && validateFile(e.target.files[0])) {
                          setFileA(e.target.files[0]);
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Upload size={24} className="text-slate-400 dark:text-slate-500 mb-2 animate-pulse" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-350">
                      Drag Excel file here
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      or click to browse File A
                    </span>
                  </div>
                )}
              </div>

              {/* File B Box */}
              <div className="flex flex-col space-y-2">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-300">File B: Comparison Month</label>
                {fileB ? (
                  <div className="glass-panel border-2 border-emerald-550/40 bg-emerald-50/10 dark:bg-emerald-950/5 rounded-2xl p-6 flex flex-col justify-between min-h-[180px] relative">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <CheckCircle size={24} />
                      </div>
                      <div className="text-left truncate">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-6" title={fileB.name}>
                          {fileB.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Size: {formatBytes(fileB.size)}
                        </p>
                        <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full mt-2 border border-emerald-500/10">
                          Ready
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setFileB(null)}
                      className="absolute top-4 right-4 text-slate-450 hover:text-red-500 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDragB}
                    onDragOver={handleDragB}
                    onDragLeave={handleDragB}
                    onDrop={handleDropB}
                    onClick={() => bInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 cursor-pointer flex flex-col items-center justify-center text-center transition-all min-h-[180px] bg-white dark:bg-slate-900/40 relative ${
                      isDragActiveB
                        ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10 scale-[1.01]"
                        : "border-slate-300 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500"
                    }`}
                  >
                    <input
                      ref={bInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0] && validateFile(e.target.files[0])) {
                          setFileB(e.target.files[0]);
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Upload size={24} className="text-slate-400 dark:text-slate-500 mb-2 animate-pulse" />
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-350">
                      Drag Excel file here
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      or click to browse File B
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              {isLoading ? (
                <div className="flex items-center space-x-2.5 px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-650 dark:text-slate-400 font-bold">
                  <Loader2 size={18} className="animate-spin" />
                  <span>Processing comparison files...</span>
                </div>
              ) : (
                <button
                  onClick={handleStartComparison}
                  disabled={!fileA || !fileB}
                  className={`w-full max-w-sm flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold transition-all shadow-md active:scale-98 ${
                    fileA && fileB
                      ? "bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 text-white cursor-pointer hover:shadow-lg"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <ArrowLeftRight size={18} />
                  <span>Compare Datasets</span>
                </button>
              )}

              {/* View Existing Comparison Dashboard */}
              {currentCompareDataset && !isLoading && (
                <button
                  onClick={onViewCompareDashboard}
                  className="flex items-center justify-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-2"
                >
                  <span>Restore previous comparison ({currentCompareDataset.datasetA.fileName} vs {currentCompareDataset.datasetB.fileName})</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start space-x-3 text-red-700 dark:text-red-400 animate-fade">
            <AlertTriangle className="flex-shrink-0 mt-0.5 animate-bounce" size={18} />
            <div className="text-sm">
              <span className="font-semibold">Processing Failed:</span> {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
