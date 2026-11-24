"""XGBoost short-term load forecasting registry, baseline benchmarking, and recursive multi-step inference."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import f1_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from backend.config import ALL_MACRO_ENTITIES, CRITICAL_UTILIZATION_THRESHOLD, REGIONS
from backend.features import FEATURE_COLUMNS, build_single_step_feature_row, create_features
from backend.load_generator import get_entity_calibration_ratio
from backend.weather_client import fetch_forecast_weather


def _compute_eval_metrics(
    model_name: str,
    test_df: pd.DataFrame,
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> dict[str, Any]:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(math.sqrt(mean_squared_error(y_true, y_pred)))
    mape = float(np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1.0))) * 100.0)
    r2 = float(r2_score(y_true, y_pred))

    # Daily Peak Magnitude MAE & Timing Hit Rate (+/- 1 hour)
    eval_frame = pd.DataFrame(
        {
            "date": pd.to_datetime(test_df["timestamp"]).dt.date,
            "hour": pd.to_datetime(test_df["timestamp"]).dt.hour,
            "actual": y_true,
            "pred": y_pred,
        }
    )
    daily_peak_errs = []
    daily_peak_rel_errs = []
    timing_hits = 0
    total_days = 0
    for _, grp in eval_frame.groupby("date"):
        if len(grp) < 12:
            continue
        total_days += 1
        act_idx = grp["actual"].idxmax()
        pred_idx = grp["pred"].idxmax()
        act_max = float(grp.loc[act_idx, "actual"])
        pred_max = float(grp.loc[pred_idx, "pred"])
        daily_peak_errs.append(abs(act_max - pred_max))
        daily_peak_rel_errs.append(abs(act_max - pred_max) / max(act_max, 1.0) * 100.0)
        act_hr = int(grp.loc[act_idx, "hour"])
        pred_hr = int(grp.loc[pred_idx, "hour"])
        if abs(act_hr - pred_hr) <= 1 or abs(act_hr - pred_hr) >= 23:
            timing_hits += 1

    daily_peak_mae = float(np.mean(daily_peak_errs)) if daily_peak_errs else mae
    daily_peak_mape = float(np.mean(daily_peak_rel_errs)) if daily_peak_rel_errs else mape
    timing_hit_pct = float(timing_hits / max(total_days, 1) * 100.0)

    # Peak alert F1 (top 15% hours flagged as peak)
    thresh = float(np.quantile(y_true, 0.85))
    peak_f1 = float(f1_score(y_true >= thresh, y_pred >= thresh, zero_division=0))

    return {
        "model_name": model_name,
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "mape_pct": round(mape, 3),
        "r2_score": round(r2, 4),
        "daily_peak_mae_mw": round(daily_peak_mae, 2),
        "daily_peak_mape_pct": round(daily_peak_mape, 3),
        "peak_timing_hit_rate_1h_pct": round(timing_hit_pct, 1),
        "peak_alert_f1": round(peak_f1, 4),
    }


class GridForecasterRegistry:
    """Manages trained XGBoost models, baseline evaluations, and recursive forecasts for all regions."""

    SPLIT_TIMESTAMP = pd.Timestamp("2026-07-16 00:00:00")

    def __init__(self) -> None:
        self.initialized: bool = False
        self.cea_data: dict[str, Any] = {}
        self.dataset_df: pd.DataFrame = pd.DataFrame()
        self.models: dict[str, XGBRegressor] = {}
        self.metrics_reports: dict[str, dict[str, Any]] = {}
        self.residual_quantiles: dict[str, tuple[float, float]] = {}
        self.history_tails: dict[str, tuple[list[float], list[float]]] = {}
        self.capacity_refs: dict[str, float] = {}

    def initialize(self, cea_data: dict[str, Any], dataset_df: pd.DataFrame) -> None:
        self.cea_data = cea_data
        self.dataset_df = dataset_df
        self.models.clear()
        self.metrics_reports.clear()
        self.residual_quantiles.clear()
        self.history_tails.clear()
        self.capacity_refs.clear()

        for region in ALL_MACRO_ENTITIES:
            self._train_region(region)
        self.initialized = True

    def _train_region(self, region: str) -> None:
        reg_raw = (
            self.dataset_df[self.dataset_df["region"] == region]
            .sort_values("timestamp")
            .reset_index(drop=True)
        )
        feat_df = create_features(reg_raw).dropna(subset=FEATURE_COLUMNS).reset_index(drop=True)

        train_df = feat_df[feat_df["timestamp"] < self.SPLIT_TIMESTAMP].reset_index(drop=True)
        test_df = feat_df[feat_df["timestamp"] >= self.SPLIT_TIMESTAMP].reset_index(drop=True)

        X_train = train_df[FEATURE_COLUMNS].to_numpy(dtype=float)
        y_train = train_df["load_mw"].to_numpy(dtype=float)
        X_test = test_df[FEATURE_COLUMNS].to_numpy(dtype=float)
        y_test = test_df["load_mw"].to_numpy(dtype=float)

        # 1. Primary Model: XGBoost Regressor
        xgb_model = XGBRegressor(
            n_estimators=220,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=-1,
        )
        xgb_model.fit(X_train, y_train)
        y_pred_xgb = xgb_model.predict(X_test)

        # 2. Baseline 1: Random Forest Regressor
        rf_model = RandomForestRegressor(
            n_estimators=60,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )
        rf_model.fit(X_train, y_train)
        y_pred_rf = rf_model.predict(X_test)

        # 3. Baseline 2: Ridge Linear Regression
        ridge_model = make_pipeline(StandardScaler(), Ridge(alpha=1.0))
        ridge_model.fit(X_train, y_train)
        y_pred_ridge = ridge_model.predict(X_test)

        # 4. Baseline 3: Naive 24-hour persistence
        y_pred_naive = test_df["load_lag_24h"].to_numpy(dtype=float)

        # Residual quantiles for prediction intervals
        residuals = y_test - y_pred_xgb
        q10 = float(np.quantile(residuals, 0.10))
        q90 = float(np.quantile(residuals, 0.90))
        self.residual_quantiles[region] = (q10, q90)

        # Evaluate all 4 models
        scores = [
            _compute_eval_metrics("XGBoost", test_df, y_test, y_pred_xgb),
            _compute_eval_metrics("RandomForest", test_df, y_test, y_pred_rf),
            _compute_eval_metrics("Ridge", test_df, y_test, y_pred_ridge),
            _compute_eval_metrics("Naive24h", test_df, y_test, y_pred_naive),
        ]

        # Feature importances (top 12)
        importances = xgb_model.feature_importances_
        feat_imp = sorted(
            [
                {"feature": fname, "importance": round(float(imp), 4)}
                for fname, imp in zip(FEATURE_COLUMNS, importances)
            ],
            key=lambda x: x["importance"],
            reverse=True,
        )[:12]

        # Last 168 hours of holdout for frontend visualization
        sample_len = min(168, len(test_df))
        tail_idx = slice(len(test_df) - sample_len, len(test_df))
        holdout_sample = [
            {
                "timestamp": str(ts),
                "actual_mw": round(float(a), 2),
                "xgboost_mw": round(float(x), 2),
                "ridge_mw": round(float(r), 2),
                "naive_24h_mw": round(float(n), 2),
            }
            for ts, a, x, r, n in zip(
                test_df["timestamp"].iloc[tail_idx],
                y_test[tail_idx],
                y_pred_xgb[tail_idx],
                y_pred_ridge[tail_idx],
                y_pred_naive[tail_idx],
            )
        ]

        self.metrics_reports[region] = {
            "region": region,
            "train_period": f"{train_df['timestamp'].iloc[0]} to {train_df['timestamp'].iloc[-1]}",
            "test_period": f"{test_df['timestamp'].iloc[0]} to {test_df['timestamp'].iloc[-1]}",
            "train_rows": int(len(train_df)),
            "test_rows": int(len(test_df)),
            "models": scores,
            "feature_importances": feat_imp,
            "holdout_sample": holdout_sample,
        }

        # Refit final production XGBoost on full Jan–Aug 2026 dataset for live forecasting
        X_full = feat_df[FEATURE_COLUMNS].to_numpy(dtype=float)
        y_full = feat_df["load_mw"].to_numpy(dtype=float)
        prod_model = XGBRegressor(
            n_estimators=220,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            n_jobs=-1,
        )
        prod_model.fit(X_full, y_full)
        self.models[region] = prod_model

        # Store trailing 168h loads & 24h temps for recursive seeding
        self.history_tails[region] = (
            reg_raw["load_mw"].tail(168).astype(float).tolist(),
            reg_raw["temperature_2m"].tail(24).astype(float).tolist(),
        )
        max_cea_peak = max(
            float(rec["peak_demand_mw"])
            for rec in self.cea_data["records"][region].values()
        )
        self.capacity_refs[region] = max_cea_peak

    def get_metrics(self, region: str) -> dict[str, Any]:
        if region not in self.metrics_reports:
            raise ValueError(f"No trained model metrics available for '{region}'")
        return self.metrics_reports[region]

    def forecast(
        self,
        entity_id: str,
        horizon_hours: int = 48,
        temp_delta_c: float = 0.0,
        humidity_delta_pct: float = 0.0,
    ) -> dict[str, Any]:
        """Run recursive multi-step XGBoost load forecast for any region, All_India, or state."""
        parent_region, scale_ratio, latest_entity_peak = get_entity_calibration_ratio(
            self.cea_data, entity_id
        )
        model = self.models[parent_region]
        q10, q90 = self.residual_quantiles[parent_region]

        hist_loads_orig, hist_temps_orig = self.history_tails[parent_region]
        history_loads = list(hist_loads_orig)
        recent_temps = list(hist_temps_orig)

        weather_df, weather_source = fetch_forecast_weather(
            parent_region,
            horizon_hours=horizon_hours,
            temp_delta_c=temp_delta_c,
            humidity_delta_pct=humidity_delta_pct,
        )

        # Parent region capacity reference and entity-scaled capacity reference
        parent_cap_mw = self.capacity_refs[parent_region]
        entity_cap_mw = (
            parent_cap_mw
            if entity_id in REGIONS
            else max(latest_entity_peak, parent_cap_mw * scale_ratio)
        )
        peak_threshold_mw = round(entity_cap_mw * CRITICAL_UTILIZATION_THRESHOLD, 2)

        points: list[dict[str, Any]] = []
        preds_entity: list[float] = []

        for step_idx, row in weather_df.iterrows():
            ts = pd.Timestamp(row["timestamp"])
            w_dict = {
                "temperature_2m": float(row["temperature_2m"]),
                "relative_humidity_2m": float(row["relative_humidity_2m"]),
                "apparent_temperature": float(row["apparent_temperature"]),
                "precipitation": float(row["precipitation"]),
                "wind_speed_10m": float(row["wind_speed_10m"]),
                "shortwave_radiation": float(row["shortwave_radiation"]),
            }
            X_step = build_single_step_feature_row(history_loads, w_dict, ts, recent_temps)
            pred_region_mw = max(1.0, float(model.predict(X_step)[0]))

            history_loads.append(pred_region_mw)
            recent_temps.append(w_dict["temperature_2m"])

            horizon_spread = math.sqrt(1.0 + step_idx / 48.0)
            pred_scaled = pred_region_mw * scale_ratio
            low_scaled = max(0.0, (pred_region_mw + q10 * horizon_spread) * scale_ratio)
            high_scaled = max(pred_scaled, (pred_region_mw + q90 * horizon_spread) * scale_ratio)

            util_pct = (pred_scaled / entity_cap_mw * 100.0) if entity_cap_mw > 0 else 0.0
            is_flagged = pred_scaled >= peak_threshold_mw

            preds_entity.append(pred_scaled)
            points.append(
                {
                    "timestamp": ts.isoformat(),
                    "predicted_mw": round(pred_scaled, 2),
                    "lower_bound_mw": round(low_scaled, 2),
                    "upper_bound_mw": round(high_scaled, 2),
                    "temperature_c": round(w_dict["temperature_2m"], 2),
                    "apparent_temp_c": round(w_dict["apparent_temperature"], 2),
                    "relative_humidity_pct": round(w_dict["relative_humidity_2m"], 1),
                    "shortwave_radiation_wm2": round(w_dict["shortwave_radiation"], 1),
                    "precipitation_mm": round(w_dict["precipitation"], 2),
                    "utilization_pct": round(util_pct, 2),
                    "is_flagged_peak": bool(is_flagged),
                }
            )

        peak_idx = int(np.argmax(preds_entity))
        entity_name = REGIONS[entity_id]["name"] if entity_id in REGIONS else entity_id.replace("_", " ")
        # Preserve exact display name for states when available
        from backend.config import STATE_BY_ID
        if entity_id in STATE_BY_ID:
            entity_name = STATE_BY_ID[entity_id]["name"]

        return {
            "entity_id": entity_id,
            "entity_name": entity_name,
            "parent_region": parent_region,
            "horizon_hours": int(len(points)),
            "weather_source": weather_source,
            "temp_delta_c": float(temp_delta_c),
            "humidity_delta_pct": float(humidity_delta_pct),
            "capacity_reference_mw": round(entity_cap_mw, 2),
            "peak_threshold_mw": peak_threshold_mw,
            "predicted_peak_mw": round(float(preds_entity[peak_idx]), 2),
            "predicted_peak_timestamp": points[peak_idx]["timestamp"],
            "predicted_min_mw": round(float(min(preds_entity)), 2),
            "avg_load_mw": round(float(np.mean(preds_entity)), 2),
            "flagged_peak_hours": int(sum(1 for p in points if p["is_flagged_peak"])),
            "points": points,
        }


forecaster_registry = GridForecasterRegistry()
