"""FastAPI application for Project #58: Smart Grid Energy Consumption Forecaster."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
import sys
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.analytics import compute_carbon_abatement_scorecard, compute_peak_charging_plan
from backend.cea_parser import (
    get_entity_metadata_lists,
    get_entity_monthly_series,
    get_regional_diversity_summary,
    get_top_shortage_events,
    load_cea_ground_truth,
)
from backend.config import ALL_MACRO_ENTITIES, REGIONS, STATE_BY_ID, resolve_entity_id
from backend.forecaster import forecaster_registry
from backend.load_generator import build_hourly_grid_dataset, compute_dataset_audit
from backend.schemas import (
    CEASummaryResponse,
    CarbonScorecardRequest,
    CarbonScorecardResponse,
    DatasetAuditResponse,
    ForecastRequest,
    ForecastResponse,
    HealthResponse,
    ModelMetricsResponse,
    PeakChargingRequest,
    PeakChargingResponse,
    RegionsResponse,
)

_STATE: dict[str, Any] = {
    "cea_data": None,
    "dataset_df": None,
}


def ensure_initialized() -> None:
    """Lazy-or-lifespan initialization of CEA ground truth, hourly dataset, and XGBoost models."""
    if forecaster_registry.initialized and _STATE["cea_data"] is not None:
        return
    cea_data = load_cea_ground_truth()
    dataset_df = build_hourly_grid_dataset(cea_data)
    forecaster_registry.initialize(cea_data, dataset_df)
    _STATE["cea_data"] = cea_data
    _STATE["dataset_df"] = dataset_df


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_initialized()
    yield


app = FastAPI(
    title="Smart Grid Energy Consumption Forecaster API (Project #58)",
    description=(
        "XGBoost short-term electrical load forecaster, CEA Peak Supply benchmark explorer, "
        "ToD Peak Load Charging Visualizer, and Industrial Carbon Footprint Abatement Scorecard."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_macro_or_400(region: str) -> str:
    try:
        eid = resolve_entity_id(region)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if eid not in ALL_MACRO_ENTITIES:
        raise HTTPException(
            status_code=400,
            detail=f"'{region}' is a state entity; dataset audit and model metrics operate at regional/national level ({ALL_MACRO_ENTITIES}).",
        )
    return eid


def _resolve_any_or_400(entity: str) -> str:
    try:
        return resolve_entity_id(entity)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/", response_model=HealthResponse)
@app.get("/api/v1/health", response_model=HealthResponse)
def get_health() -> dict[str, Any]:
    ensure_initialized()
    cea_data = _STATE["cea_data"]
    df = _STATE["dataset_df"]
    return {
        "status": "ok",
        "models_ready": forecaster_registry.initialized,
        "cea_months_loaded": cea_data["months"],
        "total_states_tracked": len(STATE_BY_ID),
        "macro_entities": ALL_MACRO_ENTITIES,
        "dataset_rows": int(len(df)),
        "version": "1.0.0",
    }


@app.get("/api/v1/regions", response_model=RegionsResponse)
def list_regions() -> dict[str, Any]:
    ensure_initialized()
    macros, states = get_entity_metadata_lists(_STATE["cea_data"])
    return {"macro_entities": macros, "states": states}


@app.get("/api/v1/cea/summary", response_model=CEASummaryResponse)
def get_cea_summary(entity: str = Query(default="All_India")) -> dict[str, Any]:
    ensure_initialized()
    eid = _resolve_any_or_400(entity)
    cea_data = _STATE["cea_data"]

    if eid == "All_India":
        name, level = "All India", "national"
    elif eid in REGIONS:
        name, level = REGIONS[eid]["name"], "region"
    else:
        name, level = STATE_BY_ID[eid]["name"], "state"

    return {
        "entity_id": eid,
        "entity_name": name,
        "level": level,
        "monthly_series": get_entity_monthly_series(cea_data, eid),
        "regional_diversity": get_regional_diversity_summary(cea_data),
        "top_shortage_events": get_top_shortage_events(cea_data, limit=15),
        "data_quality_notes": cea_data["notes"],
    }


@app.get("/api/v1/dataset/audit", response_model=DatasetAuditResponse)
def get_dataset_audit(region: str = Query(default="All_India")) -> dict[str, Any]:
    ensure_initialized()
    rid = _resolve_macro_or_400(region)
    return compute_dataset_audit(_STATE["dataset_df"], _STATE["cea_data"], region=rid)


@app.get("/api/v1/models/metrics", response_model=ModelMetricsResponse)
def get_model_metrics(region: str = Query(default="All_India")) -> dict[str, Any]:
    ensure_initialized()
    rid = _resolve_macro_or_400(region)
    return forecaster_registry.get_metrics(rid)


@app.get("/api/v1/forecast", response_model=ForecastResponse)
def get_forecast(
    entity: str = Query(default="All_India"),
    horizon_hours: int = Query(default=48, ge=6, le=168),
    temp_delta_c: float = Query(default=0.0, ge=-10.0, le=10.0),
    humidity_delta_pct: float = Query(default=0.0, ge=-30.0, le=30.0),
) -> dict[str, Any]:
    ensure_initialized()
    eid = _resolve_any_or_400(entity)
    return forecaster_registry.forecast(
        eid,
        horizon_hours=horizon_hours,
        temp_delta_c=temp_delta_c,
        humidity_delta_pct=humidity_delta_pct,
    )


@app.post("/api/v1/forecast", response_model=ForecastResponse)
def post_forecast(req: ForecastRequest) -> dict[str, Any]:
    ensure_initialized()
    eid = _resolve_any_or_400(req.entity)
    return forecaster_registry.forecast(
        eid,
        horizon_hours=req.horizon_hours,
        temp_delta_c=req.temp_delta_c,
        humidity_delta_pct=req.humidity_delta_pct,
    )


@app.post("/api/v1/analytics/peak-charging", response_model=PeakChargingResponse)
def post_peak_charging(req: PeakChargingRequest) -> dict[str, Any]:
    ensure_initialized()
    eid = _resolve_any_or_400(req.entity)
    forecast_res = forecaster_registry.forecast(
        eid,
        horizon_hours=req.horizon_hours,
        temp_delta_c=req.temp_delta_c,
        humidity_delta_pct=req.humidity_delta_pct,
    )
    return compute_peak_charging_plan(
        forecast_res,
        base_tariff_inr=req.base_tariff_inr,
        shiftable_mw=req.shiftable_mw,
    )


@app.post("/api/v1/analytics/carbon-scorecard", response_model=CarbonScorecardResponse)
def post_carbon_scorecard(req: CarbonScorecardRequest) -> dict[str, Any]:
    ensure_initialized()
    eid = _resolve_any_or_400(req.entity)
    forecast_res = forecaster_registry.forecast(
        eid,
        horizon_hours=req.horizon_hours,
        temp_delta_c=req.temp_delta_c,
        humidity_delta_pct=req.humidity_delta_pct,
    )
    return compute_carbon_abatement_scorecard(
        forecast_res,
        facility_mw=req.facility_mw,
        shiftable_pct=req.shiftable_pct,
        solar_capacity_mw=req.solar_capacity_mw,
        battery_capacity_mwh=req.battery_capacity_mwh,
        base_tariff_inr=req.base_tariff_inr,
    )
