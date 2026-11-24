export interface HealthResponse {
  status: string;
  models_ready: boolean;
  cea_months_loaded: string[];
  total_states_tracked: number;
  macro_entities: string[];
  dataset_rows: number;
  version: string;
}

export interface EntityMetadata {
  id: string;
  name: string;
  level: "national" | "region" | "state";
  parent_region: string | null;
  latest_peak_demand_mw: number;
  max_2026_peak_demand_mw: number;
  max_2026_peak_month: string;
  max_shortage_mw: number;
  max_shortage_pct: number;
}

export interface RegionsResponse {
  macro_entities: EntityMetadata[];
  states: EntityMetadata[];
}

export interface MonthlyCEARecord {
  month: string;
  month_label: string;
  peak_demand_mw: number;
  peak_met_mw: number;
  demand_not_met_mw: number;
  demand_not_met_pct: number;
  source_file: string;
}

export interface ShortageEvent {
  month: string;
  entity_id: string;
  entity_name: string;
  region: string;
  peak_demand_mw: number;
  peak_met_mw: number;
  demand_not_met_mw: number;
  demand_not_met_pct: number;
}

export interface CEASummaryResponse {
  entity_id: string;
  entity_name: string;
  level: string;
  monthly_series: MonthlyCEARecord[];
  regional_diversity: Record<string, any>[];
  top_shortage_events: ShortageEvent[];
  data_quality_notes: string[];
}

export interface DatasetAuditResponse {
  region: string;
  rows: number;
  columns: number;
  start_timestamp: string;
  end_timestamp: string;
  frequency: string;
  missing_values: Record<string, number>;
  duplicate_timestamps: number;
  load_stats_mw: Record<string, number>;
  weather_stats: Record<string, Record<string, number>>;
  weather_load_correlations: Record<string, number>;
  cea_peak_calibration_check: Record<string, any>[];
  audit_observations: string[];
}

export interface ModelScore {
  model_name: string;
  mae_mw: number;
  rmse_mw: number;
  mape_pct: number;
  r2_score: number;
  daily_peak_mae_mw: number;
  daily_peak_mape_pct: number;
  peak_timing_hit_rate_1h_pct: number;
  peak_alert_f1: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface HoldoutPoint {
  timestamp: string;
  actual_mw: number;
  xgboost_mw: number;
  ridge_mw: number;
  naive_24h_mw: number;
}

export interface ModelMetricsResponse {
  region: string;
  train_period: string;
  test_period: string;
  train_rows: number;
  test_rows: number;
  models: ModelScore[];
  feature_importances: FeatureImportanceItem[];
  holdout_sample: HoldoutPoint[];
}

export interface ForecastRequest {
  entity: string;
  horizon_hours: number;
  temp_delta_c: number;
  humidity_delta_pct: number;
}

export interface ForecastPoint {
  timestamp: string;
  predicted_mw: number;
  lower_bound_mw: number;
  upper_bound_mw: number;
  temperature_c: number;
  apparent_temp_c: number;
  relative_humidity_pct: number;
  shortwave_radiation_wm2: number;
  precipitation_mm: number;
  utilization_pct: number;
  is_flagged_peak: boolean;
}

export interface ForecastResponse {
  entity_id: string;
  entity_name: string;
  parent_region: string;
  horizon_hours: number;
  weather_source: string;
  temp_delta_c: number;
  humidity_delta_pct: number;
  capacity_reference_mw: number;
  peak_threshold_mw: number;
  predicted_peak_mw: number;
  predicted_peak_timestamp: string;
  predicted_min_mw: number;
  avg_load_mw: number;
  flagged_peak_hours: number;
  points: ForecastPoint[];
}

export interface PeakChargingRequest {
  entity: string;
  horizon_hours: number;
  temp_delta_c: number;
  humidity_delta_pct: number;
  base_tariff_inr: number;
  shiftable_mw: number;
}

export interface ChargingHourPoint {
  timestamp: string;
  predicted_grid_mw: number;
  utilization_pct: number;
  tariff_zone: "solar_rebate" | "normal" | "morning_ramp" | "evening_peak" | "critical_surge";
  tariff_multiplier: number;
  effective_tariff_inr_kwh: number;
  grid_stress_status: "normal" | "elevated" | "critical_peak";
}

export interface LoadShiftRecommendation {
  date: string;
  from_peak_hour: string;
  to_solar_hour: string;
  shifted_mw: number;
  from_tariff_inr_kwh: number;
  to_tariff_inr_kwh: number;
  estimated_savings_inr: number;
}

export interface PeakChargingResponse {
  entity_id: string;
  entity_name: string;
  horizon_hours: number;
  base_tariff_inr_kwh: number;
  shiftable_mw: number;
  total_baseline_cost_inr: number;
  total_optimized_cost_inr: number;
  total_savings_inr: number;
  savings_pct: number;
  critical_surge_hours: number;
  solar_rebate_hours: number;
  hourly_schedule: ChargingHourPoint[];
  recommendations: LoadShiftRecommendation[];
}

export interface CarbonScorecardRequest {
  entity: string;
  horizon_hours: number;
  temp_delta_c: number;
  humidity_delta_pct: number;
  facility_mw: number;
  shiftable_pct: number;
  solar_capacity_mw: number;
  battery_capacity_mwh: number;
  base_tariff_inr: number;
}

export interface CarbonHourPoint {
  timestamp: string;
  grid_ef_tco2_mwh: number;
  marginal_ef_tco2_mwh: number;
  baseline_facility_mw: number;
  optimized_grid_draw_mw: number;
  rooftop_solar_used_mw: number;
  battery_action_mw: number;
  baseline_emissions_tco2: number;
  optimized_emissions_tco2: number;
}

export interface CarbonScorecardSummary {
  baseline_emissions_tco2: number;
  optimized_emissions_tco2: number;
  abated_tco2: number;
  annualized_abated_tco2: number;
  abatement_pct: number;
  baseline_cost_inr: number;
  optimized_cost_inr: number;
  cost_savings_inr: number;
  annualized_savings_inr: number;
  coal_avoided_tonnes: number;
  equivalent_trees_annual: number;
  sustainability_grade: "A+" | "A" | "B" | "C" | "D";
}

export interface CarbonScorecardResponse {
  entity_id: string;
  entity_name: string;
  horizon_hours: number;
  cea_baseline_ef_tco2_mwh: number;
  summary: CarbonScorecardSummary;
  hourly_breakdown: CarbonHourPoint[];
}

export type ApiMode = "live" | "mock";

export interface ApiClientConfig {
  baseUrl: string;
  mode: ApiMode;
  onModeChange?: (mode: ApiMode) => void;
}