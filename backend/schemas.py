"""Pydantic v2 request and response schemas for the Smart Grid Forecaster API."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    models_ready: bool
    cea_months_loaded: list[str]
    total_states_tracked: int
    macro_entities: list[str]
    dataset_rows: int
    version: str = "1.0.0"


class EntityMetadata(BaseModel):
    id: str
    name: str
    level: Literal["national", "region", "state"]
    parent_region: str | None = None
    latest_peak_demand_mw: float
    max_2026_peak_demand_mw: float
    max_2026_peak_month: str
    max_shortage_mw: float
    max_shortage_pct: float


class RegionsResponse(BaseModel):
    macro_entities: list[EntityMetadata]
    states: list[EntityMetadata]


class MonthlyCEARecord(BaseModel):
    month: str
    month_label: str
    peak_demand_mw: float
    peak_met_mw: float
    demand_not_met_mw: float
    demand_not_met_pct: float
    source_file: str


class ShortageEvent(BaseModel):
    month: str
    entity_id: str
    entity_name: str
    region: str
    peak_demand_mw: float
    peak_met_mw: float
    demand_not_met_mw: float
    demand_not_met_pct: float


class CEASummaryResponse(BaseModel):
    entity_id: str
    entity_name: str
    level: str
    monthly_series: list[MonthlyCEARecord]
    regional_diversity: list[dict[str, Any]]
    top_shortage_events: list[ShortageEvent]
    data_quality_notes: list[str]


class DatasetAuditResponse(BaseModel):
    region: str
    rows: int
    columns: int
    start_timestamp: str
    end_timestamp: str
    frequency: str
    missing_values: dict[str, int]
    duplicate_timestamps: int
    load_stats_mw: dict[str, float]
    weather_stats: dict[str, dict[str, float]]
    weather_load_correlations: dict[str, float]
    cea_peak_calibration_check: list[dict[str, Any]]
    audit_observations: list[str]


class ModelScore(BaseModel):
    model_name: str
    mae_mw: float
    rmse_mw: float
    mape_pct: float
    r2_score: float
    daily_peak_mae_mw: float
    daily_peak_mape_pct: float
    peak_timing_hit_rate_1h_pct: float
    peak_alert_f1: float


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class HoldoutPoint(BaseModel):
    timestamp: str
    actual_mw: float
    xgboost_mw: float
    ridge_mw: float
    naive_24h_mw: float


class ModelMetricsResponse(BaseModel):
    region: str
    train_period: str
    test_period: str
    train_rows: int
    test_rows: int
    models: list[ModelScore]
    feature_importances: list[FeatureImportanceItem]
    holdout_sample: list[HoldoutPoint]


class ForecastRequest(BaseModel):
    entity: str = Field(default="All_India", description="Region ID (All_India, NR, WR, SR, ER, NER) or State name/ID")
    horizon_hours: int = Field(default=48, ge=6, le=168)
    temp_delta_c: float = Field(default=0.0, ge=-10.0, le=10.0)
    humidity_delta_pct: float = Field(default=0.0, ge=-30.0, le=30.0)


class ForecastPoint(BaseModel):
    timestamp: str
    predicted_mw: float
    lower_bound_mw: float
    upper_bound_mw: float
    temperature_c: float
    apparent_temp_c: float
    relative_humidity_pct: float
    shortwave_radiation_wm2: float
    precipitation_mm: float
    utilization_pct: float
    is_flagged_peak: bool


class ForecastResponse(BaseModel):
    entity_id: str
    entity_name: str
    parent_region: str
    horizon_hours: int
    weather_source: str
    temp_delta_c: float
    humidity_delta_pct: float
    capacity_reference_mw: float
    peak_threshold_mw: float
    predicted_peak_mw: float
    predicted_peak_timestamp: str
    predicted_min_mw: float
    avg_load_mw: float
    flagged_peak_hours: int
    points: list[ForecastPoint]


class PeakChargingRequest(BaseModel):
    entity: str = Field(default="All_India")
    horizon_hours: int = Field(default=48, ge=6, le=168)
    temp_delta_c: float = Field(default=0.0, ge=-10.0, le=10.0)
    humidity_delta_pct: float = Field(default=0.0, ge=-30.0, le=30.0)
    base_tariff_inr: float = Field(default=7.50, gt=0.5, le=30.0)
    shiftable_mw: float = Field(default=5.0, ge=0.1, le=500.0)


class ChargingHourPoint(BaseModel):
    timestamp: str
    predicted_grid_mw: float
    utilization_pct: float
    tariff_zone: Literal["solar_rebate", "normal", "morning_ramp", "evening_peak", "critical_surge"]
    tariff_multiplier: float
    effective_tariff_inr_kwh: float
    grid_stress_status: Literal["normal", "elevated", "critical_peak"]


class LoadShiftRecommendation(BaseModel):
    date: str
    from_peak_hour: str
    to_solar_hour: str
    shifted_mw: float
    from_tariff_inr_kwh: float
    to_tariff_inr_kwh: float
    estimated_savings_inr: float


class PeakChargingResponse(BaseModel):
    entity_id: str
    entity_name: str
    horizon_hours: int
    base_tariff_inr_kwh: float
    shiftable_mw: float
    total_baseline_cost_inr: float
    total_optimized_cost_inr: float
    total_savings_inr: float
    savings_pct: float
    critical_surge_hours: int
    solar_rebate_hours: int
    hourly_schedule: list[ChargingHourPoint]
    recommendations: list[LoadShiftRecommendation]


class CarbonScorecardRequest(BaseModel):
    entity: str = Field(default="All_India")
    horizon_hours: int = Field(default=48, ge=6, le=168)
    temp_delta_c: float = Field(default=0.0, ge=-10.0, le=10.0)
    humidity_delta_pct: float = Field(default=0.0, ge=-30.0, le=30.0)
    facility_mw: float = Field(default=10.0, gt=0.1, le=1000.0)
    shiftable_pct: float = Field(default=25.0, ge=0.0, le=80.0)
    solar_capacity_mw: float = Field(default=2.0, ge=0.0, le=500.0)
    battery_capacity_mwh: float = Field(default=4.0, ge=0.0, le=1000.0)
    base_tariff_inr: float = Field(default=7.50, gt=0.5, le=30.0)


class CarbonHourPoint(BaseModel):
    timestamp: str
    grid_ef_tco2_mwh: float
    marginal_ef_tco2_mwh: float
    baseline_facility_mw: float
    optimized_grid_draw_mw: float
    rooftop_solar_used_mw: float
    battery_action_mw: float
    baseline_emissions_tco2: float
    optimized_emissions_tco2: float


class CarbonScorecardSummary(BaseModel):
    baseline_emissions_tco2: float
    optimized_emissions_tco2: float
    abated_tco2: float
    annualized_abated_tco2: float
    abatement_pct: float
    baseline_cost_inr: float
    optimized_cost_inr: float
    cost_savings_inr: float
    annualized_savings_inr: float
    coal_avoided_tonnes: float
    equivalent_trees_annual: int
    sustainability_grade: Literal["A+", "A", "B", "C", "D"]


class CarbonScorecardResponse(BaseModel):
    entity_id: str
    entity_name: str
    horizon_hours: int
    cea_baseline_ef_tco2_mwh: float
    summary: CarbonScorecardSummary
    hourly_breakdown: list[CarbonHourPoint]
