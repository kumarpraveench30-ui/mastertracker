export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'boolean';

export interface NumericStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  q25: number;
  q75: number;
  iqr: number;
  outliers_count: number;
  outlier_lower_bound: number;
  outlier_upper_bound: number;
}

export interface CategoricalTopValue {
  value: string;
  count: number;
  percentage: number;
}

export interface CategoricalStats {
  unique_count: number;
  top_values: CategoricalTopValue[];
  distribution: { category: string; count: number }[];
}

export interface DatetimeStats {
  count: number;
  min_date: string | null;
  max_date: string | null;
  span_days: number;
  by_year: { year: string; count: number }[];
  by_month: { period: string; count: number }[];
}

export interface ColumnQuality {
  column: string;
  type: ColumnType;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  is_empty: boolean;
  is_constant: boolean;
  outliers_count: number;
  status: 'GOOD' | 'WARNING' | 'ATTENTION';
}

export interface DataQuality {
  health_score: number;
  health_status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' | 'EMPTY';
  duplicate_rows_count: number;
  duplicate_rows_pct: number;
  total_missing_cells: number;
  total_missing_pct: number;
  total_outliers_count: number;
  empty_columns_count: number;
  columns: ColumnQuality[];
}

export interface KPI {
  id: string;
  label: string;
  value: string;
  raw_value: number;
  type: string;
  icon: string;
  subtitle: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  column: string;
  type: ColumnType;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ChartDataResult {
  data: any[];
  series_keys: string[];
  chart_type: string;
  x_col?: string;
  y_col?: string;
  group_col?: string;
  aggregation?: string;
}

export interface RecommendedChart {
  id: string;
  title: string;
  description: string;
  chart_type: 'line' | 'bar' | 'horizontal_bar' | 'donut' | 'grouped_bar' | 'scatter';
  x_col: string;
  y_col: string;
  group_col?: string;
  aggregation: string;
  chart_data: ChartDataResult;
}

export interface SheetAnalysis {
  sheet_name: string;
  total_rows: number;
  total_cols: number;
  columns: string[];
  column_types: Record<string, ColumnType>;
  numeric_stats: Record<string, NumericStats>;
  categorical_stats: Record<string, CategoricalStats>;
  datetime_stats: Record<string, DatetimeStats>;
  data_quality: DataQuality;
  kpis: KPI[];
  summary: string[];
  filter_definitions: FilterDefinition[];
}

export interface DatasetPayload {
  dataset_id: string;
  filename: string;
  sheets: string[];
  active_sheet: string;
  analysis: SheetAnalysis;
  kpis: KPI[];
  summary: string[];
  recommended_charts: RecommendedChart[];
  privacy_notice?: string;
}

export interface TableDataResponse {
  rows: Record<string, any>[];
  total_rows: number;
  filtered_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
  columns: string[];
}
