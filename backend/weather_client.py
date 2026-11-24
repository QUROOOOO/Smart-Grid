"""Meteorological data client using Open-Meteo Archive & Forecast APIs with local caching & offline fallback."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import json
import time
from typing import Any

import httpx
import numpy as np
import pandas as pd

from backend.config import (
    ALL_INDIA_WEATHER_WEIGHTS,
    DATA_CACHE_DIR,
    REGION_ORDER,
    REGIONS,
)

HOURLY_VARS = (
    "temperature_2m,relative_humidity_2m,apparent_temperature,"
    "precipitation,wind_speed_10m,shortwave_radiation"
)
WEATHER_COLUMNS = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "wind_speed_10m",
    "shortwave_radiation",
]

# In-memory TTL cache for live forecast API responses: (region, horizon_days) -> (epoch_sec, df, source)
_FORECAST_CACHE: dict[tuple[str, int], tuple[float, pd.DataFrame, str]] = {}
FORECAST_CACHE_TTL_SEC = 1800.0

# Seasonal climate baselines (mean temp C, seasonal amp C, diurnal amp C, mean RH %) for deterministic fallback
_FALLBACK_CLIMATE = {
    "NR": {"t_mean": 25.5, "t_amp": 10.5, "diurnal": 6.0, "rh_base": 54.0, "rain_peak_m": 7.5},
    "WR": {"t_mean": 28.0, "t_amp": 5.5, "diurnal": 5.0, "rh_base": 66.0, "rain_peak_m": 7.0},
    "SR": {"t_mean": 27.5, "t_amp": 4.0, "diurnal": 4.8, "rh_base": 65.0, "rain_peak_m": 7.5},
    "ER": {"t_mean": 27.5, "t_amp": 6.5, "diurnal": 4.5, "rh_base": 72.0, "rain_peak_m": 7.5},
    "NER": {"t_mean": 24.5, "t_amp": 6.0, "diurnal": 4.2, "rh_base": 78.0, "rain_peak_m": 7.0},
}


def synthesize_fallback_weather(
    region: str,
    start_ts: str | pd.Timestamp,
    periods: int,
) -> pd.DataFrame:
    """Generate realistic deterministic Indian regional hourly weather if Open-Meteo is unreachable."""
    if region == "All_India":
        dfs = [synthesize_fallback_weather(r, start_ts, periods) for r in REGION_ORDER]
        return _blend_all_india_weather(dfs)

    cfg = _FALLBACK_CLIMATE[region]
    seed = REGIONS[region]["seed"] + 500
    rng = np.random.default_rng(seed)

    times = pd.date_range(start=start_ts, periods=periods, freq="h")
    doy = times.dayofyear.to_numpy(dtype=float)
    hour = times.hour.to_numpy(dtype=float)

    # Peak summer heat around mid-May (day ~140)
    seasonal = -cfg["t_amp"] * np.cos(2 * np.pi * (doy - 15) / 365.0)
    diurnal = cfg["diurnal"] * np.sin(2 * np.pi * (hour - 9.0) / 24.0)
    monsoon_cool = -2.8 * np.exp(-0.5 * ((doy - 205.0) / 35.0) ** 2)
    noise = rng.normal(0.0, 0.8, size=periods)

    temp = np.clip(cfg["t_mean"] + seasonal + diurnal + monsoon_cool + noise, 6.0, 47.0)
    monsoon_rh = 20.0 * np.exp(-0.5 * ((doy - 210.0) / 40.0) ** 2)
    rh = np.clip(cfg["rh_base"] + monsoon_rh - 0.55 * diurnal + rng.normal(0.0, 3.0, size=periods), 18.0, 98.0)
    apparent = temp + 0.08 * (rh - 50.0) + 0.05 * np.maximum(0.0, temp - 25.0)

    solar_raw = np.maximum(0.0, np.sin(np.pi * (hour - 6.0) / 12.0))
    cloud_factor = np.clip(1.0 - 0.35 * np.exp(-0.5 * ((doy - 205.0) / 35.0) ** 2), 0.45, 1.0)
    radiation = np.round(880.0 * solar_raw * cloud_factor, 1)

    rain_prob = 0.25 * np.exp(-0.5 * ((doy - 205.0) / 35.0) ** 2) + 0.02
    rain_mask = rng.random(periods) < rain_prob
    precip = np.where(rain_mask, np.round(rng.exponential(2.2, size=periods), 2), 0.0)
    wind = np.clip(9.0 + 4.0 * solar_raw + rng.normal(0.0, 1.5, size=periods), 1.0, 35.0)

    return pd.DataFrame(
        {
            "timestamp": times,
            "temperature_2m": np.round(temp, 2),
            "relative_humidity_2m": np.round(rh, 1),
            "apparent_temperature": np.round(apparent, 2),
            "precipitation": precip,
            "wind_speed_10m": np.round(wind, 1),
            "shortwave_radiation": radiation,
        }
    )


def _blend_all_india_weather(regional_dfs: list[pd.DataFrame]) -> pd.DataFrame:
    base = pd.DataFrame({"timestamp": regional_dfs[0]["timestamp"]})
    for col in WEATHER_COLUMNS:
        acc = np.zeros(len(base), dtype=float)
        for region, df_r in zip(REGION_ORDER, regional_dfs):
            acc += ALL_INDIA_WEATHER_WEIGHTS[region] * df_r[col].to_numpy(dtype=float)
        base[col] = np.round(acc, 2)
    return base


def _parse_open_meteo_hourly(payload: dict[str, Any]) -> pd.DataFrame:
    hourly = payload["hourly"]
    df = pd.DataFrame(
        {
            "timestamp": pd.to_datetime(hourly["time"]),
            **{col: pd.to_numeric(hourly[col], errors="coerce") for col in WEATHER_COLUMNS},
        }
    )
    # Linear interpolation for any minor API sensor gaps
    df[WEATHER_COLUMNS] = df[WEATHER_COLUMNS].interpolate(method="linear").ffill().bfill()
    return df


def fetch_historical_weather_2026(
    region: str,
    start_date: str = "2026-01-01",
    end_date: str = "2026-08-31",
) -> pd.DataFrame:
    """Fetch Jan–Aug 2026 hourly weather from Open-Meteo Archive API with JSON disk caching."""
    if region == "All_India":
        regional_dfs = [fetch_historical_weather_2026(r, start_date, end_date) for r in REGION_ORDER]
        return _blend_all_india_weather(regional_dfs)

    cache_path = DATA_CACHE_DIR / f"weather_2026_{region}.json"
    if cache_path.exists():
        with cache_path.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        return _parse_open_meteo_hourly(payload)

    meta = REGIONS[region]
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={meta['lat']}&longitude={meta['lon']}"
        f"&start_date={start_date}&end_date={end_date}"
        f"&hourly={HOURLY_VARS}&timezone=Asia%2FKolkata"
    )
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            payload = resp.json()
        with cache_path.open("w", encoding="utf-8") as f:
            json.dump(payload, f)
        return _parse_open_meteo_hourly(payload)
    except Exception:
        expected_hours = int(
            ((pd.Timestamp(end_date) - pd.Timestamp(start_date)).days + 1) * 24
        )
        return synthesize_fallback_weather(region, f"{start_date} 00:00:00", expected_hours)


def warm_historical_weather_cache() -> dict[str, int]:
    """Fetch and cache historical weather for all 5 regional hubs in parallel."""
    results: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {r: pool.submit(fetch_historical_weather_2026, r) for r in REGION_ORDER}
        for r, fut in futures.items():
            results[r] = len(fut.result())
    return results


def fetch_forecast_weather(
    region: str,
    horizon_hours: int = 48,
    temp_delta_c: float = 0.0,
    humidity_delta_pct: float = 0.0,
) -> tuple[pd.DataFrame, str]:
    """Fetch upcoming hourly forecast weather (or What-If perturbed weather) for a region."""
    if region == "All_India":
        regional_dfs = []
        sources = []
        for r in REGION_ORDER:
            df_r, src_r = fetch_forecast_weather(r, horizon_hours, 0.0, 0.0)
            regional_dfs.append(df_r)
            sources.append(src_r)
        blended = _blend_all_india_weather(regional_dfs)
        source = "open_meteo_live" if all(s == "open_meteo_live" for s in sources) else "synthetic_fallback"
        return _apply_what_if_deltas(blended.head(horizon_hours).copy(), temp_delta_c, humidity_delta_pct), source

    forecast_days = min(7, max(2, (horizon_hours + 23) // 24 + 1))
    cache_key = (region, forecast_days)
    now = time.time()

    if cache_key in _FORECAST_CACHE and (now - _FORECAST_CACHE[cache_key][0]) < FORECAST_CACHE_TTL_SEC:
        _, cached_df, source = _FORECAST_CACHE[cache_key]
        out = cached_df.head(horizon_hours).copy()
        return _apply_what_if_deltas(out, temp_delta_c, humidity_delta_pct), source

    meta = REGIONS[region]
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={meta['lat']}&longitude={meta['lon']}"
        f"&hourly={HOURLY_VARS}&forecast_days={forecast_days}&timezone=Asia%2FKolkata"
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            payload = resp.json()
        df = _parse_open_meteo_hourly(payload)
        # Anchor forecast from current IST hour onwards
        now_ist = pd.Timestamp.now(tz="Asia/Kolkata").tz_localize(None).floor("h")
        future_df = df[df["timestamp"] >= now_ist].reset_index(drop=True)
        if len(future_df) < horizon_hours:
            future_df = df.tail(horizon_hours).reset_index(drop=True)
        _FORECAST_CACHE[cache_key] = (now, future_df, "open_meteo_live")
        out = future_df.head(horizon_hours).copy()
        return _apply_what_if_deltas(out, temp_delta_c, humidity_delta_pct), "open_meteo_live"
    except Exception:
        start_ist = pd.Timestamp.now(tz="Asia/Kolkata").tz_localize(None).floor("h")
        df_fb = synthesize_fallback_weather(region, start_ist, horizon_hours)
        return _apply_what_if_deltas(df_fb, temp_delta_c, humidity_delta_pct), "synthetic_fallback"


def _apply_what_if_deltas(
    df: pd.DataFrame,
    temp_delta_c: float,
    humidity_delta_pct: float,
) -> pd.DataFrame:
    if temp_delta_c == 0.0 and humidity_delta_pct == 0.0:
        return df
    df = df.copy()
    df["temperature_2m"] = np.round(df["temperature_2m"] + temp_delta_c, 2)
    df["relative_humidity_2m"] = np.round(
        np.clip(df["relative_humidity_2m"] + humidity_delta_pct, 10.0, 100.0), 1
    )
    # Shift apparent temperature consistently with temperature & humidity perturbation
    df["apparent_temperature"] = np.round(
        df["apparent_temperature"] + temp_delta_c * 1.08 + humidity_delta_pct * 0.06, 2
    )
    return df
