import { DatasetPayload, TableDataResponse, ChartDataResult } from '../types';

const API_BASE = '/api';

export async function uploadExcelFile(file: File): Promise<DatasetPayload> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${res.status}`);
  }

  return res.json();
}

export async function loadSample(sampleName: 'sales' | 'employee'): Promise<DatasetPayload> {
  const res = await fetch(`${API_BASE}/sample/${sampleName}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load sample dataset: ${sampleName}`);
  }
  return res.json();
}

export async function switchSheet(datasetId: string, sheetName: string): Promise<DatasetPayload> {
  const res = await fetch(`${API_BASE}/select-sheet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId, sheet_name: sheetName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to switch sheet');
  }

  return res.json();
}

export async function filterDataset(datasetId: string, filters: Record<string, any>) {
  const res = await fetch(`${API_BASE}/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId, filters }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to apply filters');
  }

  return res.json();
}

export interface ChartQueryParams {
  dataset_id: string;
  x_col: string;
  y_col?: string;
  group_col?: string;
  chart_type: string;
  aggregation: string;
  filters?: Record<string, any>;
  limit?: number;
}

export async function queryChart(params: ChartQueryParams): Promise<ChartDataResult> {
  const res = await fetch(`${API_BASE}/query-chart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      filters: params.filters || {},
      limit: params.limit || 50,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to query chart data');
  }

  return res.json();
}

export interface TableQueryParams {
  dataset_id: string;
  page: number;
  page_size: number;
  sort_by?: string;
  sort_desc?: boolean;
  search?: string;
  filters?: Record<string, any>;
  visible_columns?: string[];
}

export async function fetchTableData(params: TableQueryParams): Promise<TableDataResponse> {
  const res = await fetch(`${API_BASE}/table-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      filters: params.filters || {},
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch table data');
  }

  return res.json();
}

export async function exportDataset(
  datasetId: string,
  format: 'excel' | 'csv',
  filters: Record<string, any> = {},
  fallbackFilename: string = 'export'
) {
  const res = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      filters,
      export_format: format,
    }),
  });

  if (!res.ok) {
    throw new Error('Export failed');
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'csv' ? `${fallbackFilename}.csv` : `${fallbackFilename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
