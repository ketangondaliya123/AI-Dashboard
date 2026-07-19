export type ColumnType = 'text' | 'number' | 'date' | 'percentage';
export type ColumnRole = 'dimension' | 'metric';

export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  role: ColumnRole;
  uniqueCount: number;
  sampleValues: any[];
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
}

export interface Dataset {
  id: string;
  fileName: string;
  fileSize: number;
  uploadTimestamp: number;
  sheets: string[];
  activeSheet: string;
  data: Record<string, any[]>; // SheetName -> Row objects
  metadata: Record<string, ColumnMetadata[]>; // SheetName -> ColumnMetadata list
}

export interface KPICardData {
  id: string;
  title: string;
  value: string | number;
  rawValue?: string | number;
  description?: string;
  type: 'total' | 'average' | 'count' | 'percentage';
  icon: string;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'horizontal-bar' | 'line' | 'pie' | 'progress' | 'table';
  title: string;
  dimensionKey: string;
  metricKey: string;
}

export interface FilterState {
  [columnName: string]: string[]; // Selected values
}

export interface ComparisonDataset {
  datasetA: Dataset;
  datasetB: Dataset;
}

