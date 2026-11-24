export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  emission_factor_source: string;
}

export type ZoneType = "off_peak" | "standard" | "peak";

export interface HourlyForecastItem {
  timestamp: string;
  hour_label: string;
  predicted_mw: number;
  lower_bound_mw: number;
  upper_bound_mw: number;
  temp_c: number;
  humidity_pct: number;
  rain_mm: number;
  zone: ZoneType;
}

export interface ForecastSummary {
  peak_load_mw: number;
  peak_hour: string;
  off_peak_hour: string;
  min_load_mw: number;
  avg_load_mw: number;
  peak_threshold_mw: number;
  peak_alert_active: boolean;
  peak_window: string;
  optimal_charging_window: string;
}

export interface ForecastSimulationRequest {
  region: string;
  temp_offset_c: number;
  humidity_offset_pct: number;
  rain_mm: number;
  is_weekend: boolean;
  use_live_weather: boolean;
}

export interface ForecastSimulationResponse {
  summary: ForecastSummary;
  hourly_forecast: HourlyForecastItem[];
}

export interface CarbonScorecardRequest {
  daily_load_mwh: number;
  peak_window_mwh: number;
  peak_shave_pct: number;
  renewable_shift_pct: number;
  efficiency_gain_pct: number;
}

export interface CarbonBreakdown {
  peak_shaving_tonnes: number;
  renewable_shift_tonnes: number;
  efficiency_gain_tonnes: number;
}

export interface CarbonEquivalents {
  trees_planted_annual: number;
  cars_removed_daily: number;
}

export interface CarbonEmissionFactors {
  weighted_avg: number;
  operating_margin: number;
  combined_margin: number;
}

export interface CarbonScorecardResponse {
  baseline_co2_tonnes: number;
  projected_co2_tonnes: number;
  total_abated_tonnes: number;
  abatement_pct: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  breakdown: CarbonBreakdown;
  equivalents: CarbonEquivalents;
  emission_factors: CarbonEmissionFactors;
}

export interface AllIndiaTrendItem {
  month: string;
  peak_demand_mw: number;
  peak_met_mw: number;
  deficit_mw: number;
}

export interface CeaStateRecord {
  state: string;
  region: string;
  month: string;
  peak_demand_mw: number;
  peak_met_mw: number;
  deficit_mw: number;
  deficit_pct: number;
}

export interface CeaStatesResponse {
  months_available: string[];
  all_india_trend: AllIndiaTrendItem[];
  state_records: CeaStateRecord[];
}

export interface ModelBenchmark {
  name: string;
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
}

export interface PeakMetrics {
  peak_magnitude_mae_mw: number;
  peak_timing_error_hrs: number;
}

export interface ShapItem {
  feature: string;
  importance: number;
}

export interface BacktestItem {
  timestamp: string;
  actual_mw: number;
  predicted_mw: number;
}

export interface ModelMetricsResponse {
  models: ModelBenchmark[];
  peak_metrics: PeakMetrics;
  shap_importance: ShapItem[];
  backtest_sample: BacktestItem[];
}
