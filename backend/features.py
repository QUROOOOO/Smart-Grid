"""Leak-free temporal, meteorological, and autoregressive feature engineering for STLF."""

from __future__ import annotations

import math
from typing import Sequence

import numpy as np
import pandas as pd

FEATURE_COLUMNS: list[str] = [
    # Cyclical & discrete temporal features
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
    "is_weekend",
    "is_evening_peak",
    "is_solar_hours",
    # Meteorological & thermal interaction features
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "wind_speed_10m",
    "shortwave_radiation",
    "cdh_24",
    "hdh_18",
    "heat_humidity_interaction",
    "temp_roll_6h",
    "temp_roll_24h",
    "temp_x_evening",
    # Strictly past-only autoregressive load features
    "load_lag_1h",
    "load_lag_2h",
    "load_lag_3h",
    "load_lag_24h",
    "load_lag_48h",
    "load_lag_168h",
    "load_roll_mean_24h",
    "load_roll_std_24h",
    "load_roll_max_24h",
]


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer cyclical time, thermal degree-hours, and strictly shifted load lag features."""
    out = df.sort_values("timestamp").reset_index(drop=True).copy()
    ts = pd.to_datetime(out["timestamp"])

    hour = ts.dt.hour.to_numpy(dtype=float)
    dow = ts.dt.dayofweek.to_numpy(dtype=float)
    month = ts.dt.month.to_numpy(dtype=float)

    out["hour_sin"] = np.sin(2.0 * np.pi * hour / 24.0)
    out["hour_cos"] = np.cos(2.0 * np.pi * hour / 24.0)
    out["dow_sin"] = np.sin(2.0 * np.pi * dow / 7.0)
    out["dow_cos"] = np.cos(2.0 * np.pi * dow / 7.0)
    out["month_sin"] = np.sin(2.0 * np.pi * (month - 1.0) / 12.0)
    out["month_cos"] = np.cos(2.0 * np.pi * (month - 1.0) / 12.0)
    out["is_weekend"] = (dow >= 5).astype(float)
    out["is_evening_peak"] = ((hour >= 18) & (hour <= 22)).astype(float)
    out["is_solar_hours"] = ((hour >= 9) & (hour <= 15)).astype(float)

    temp = out["temperature_2m"].astype(float)
    rh = out["relative_humidity_2m"].astype(float)

    out["cdh_24"] = np.maximum(0.0, temp - 24.0)
    out["hdh_18"] = np.maximum(0.0, 18.0 - temp)
    out["heat_humidity_interaction"] = (temp * rh) / 100.0
    out["temp_roll_6h"] = temp.rolling(window=6, min_periods=1).mean()
    out["temp_roll_24h"] = temp.rolling(window=24, min_periods=1).mean()
    out["temp_x_evening"] = out["cdh_24"] * out["is_evening_peak"]

    # Strictly causal past-only load lags and rolling statistics (shifted by >= 1h)
    load = out["load_mw"].astype(float)
    out["load_lag_1h"] = load.shift(1)
    out["load_lag_2h"] = load.shift(2)
    out["load_lag_3h"] = load.shift(3)
    out["load_lag_24h"] = load.shift(24)
    out["load_lag_48h"] = load.shift(48)
    out["load_lag_168h"] = load.shift(168)

    past_load = load.shift(1)
    out["load_roll_mean_24h"] = past_load.rolling(window=24, min_periods=24).mean()
    out["load_roll_std_24h"] = past_load.rolling(window=24, min_periods=24).std(ddof=0)
    out["load_roll_max_24h"] = past_load.rolling(window=24, min_periods=24).max()

    return out


def build_single_step_feature_row(
    history_loads: Sequence[float],
    weather_row: dict[str, float],
    ts: pd.Timestamp,
    recent_temps: Sequence[float],
) -> np.ndarray:
    """Construct a 1xN feature vector matching FEATURE_COLUMNS for fast recursive forecasting."""
    hour = float(ts.hour)
    dow = float(ts.dayofweek)
    month = float(ts.month)

    temp = float(weather_row["temperature_2m"])
    rh = float(weather_row["relative_humidity_2m"])
    apparent = float(weather_row["apparent_temperature"])
    precip = float(weather_row["precipitation"])
    wind = float(weather_row["wind_speed_10m"])
    radiation = float(weather_row["shortwave_radiation"])

    is_weekend = 1.0 if dow >= 5 else 0.0
    is_evening_peak = 1.0 if 18 <= hour <= 22 else 0.0
    is_solar_hours = 1.0 if 9 <= hour <= 15 else 0.0

    cdh_24 = max(0.0, temp - 24.0)
    hdh_18 = max(0.0, 18.0 - temp)
    heat_hum = (temp * rh) / 100.0

    temps_window = list(recent_temps[-23:]) + [temp]
    temp_roll_6h = float(np.mean(temps_window[-6:]))
    temp_roll_24h = float(np.mean(temps_window[-24:]))
    temp_x_evening = cdh_24 * is_evening_peak

    last_24 = np.asarray(history_loads[-24:], dtype=float)
    row = [
        math.sin(2.0 * math.pi * hour / 24.0),
        math.cos(2.0 * math.pi * hour / 24.0),
        math.sin(2.0 * math.pi * dow / 7.0),
        math.cos(2.0 * math.pi * dow / 7.0),
        math.sin(2.0 * math.pi * (month - 1.0) / 12.0),
        math.cos(2.0 * math.pi * (month - 1.0) / 12.0),
        is_weekend,
        is_evening_peak,
        is_solar_hours,
        temp,
        rh,
        apparent,
        precip,
        wind,
        radiation,
        cdh_24,
        hdh_18,
        heat_hum,
        temp_roll_6h,
        temp_roll_24h,
        temp_x_evening,
        float(history_loads[-1]),
        float(history_loads[-2]),
        float(history_loads[-3]),
        float(history_loads[-24]),
        float(history_loads[-48]),
        float(history_loads[-168]),
        float(np.mean(last_24)),
        float(np.std(last_24, ddof=0)),
        float(np.max(last_24)),
    ]
    return np.asarray(row, dtype=float).reshape(1, -1)
