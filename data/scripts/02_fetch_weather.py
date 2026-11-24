"""
02_fetch_weather.py
Fetches historical hourly weather (temperature_2m, relative_humidity_2m, rain, cloud_cover)
from Open-Meteo Archive API matching the load dataset date range (chunked by year).
Also fetches a live 72-hour forecast snapshot and saves:
- data/raw/historical_weather.csv
- data/processed/sample_72h_weather.csv
- data/processed/fallback_weather.json
"""

import os
import json
import time
import requests
import pandas as pd

LATITUDE = 28.6139   # New Delhi Centroid
LONGITUDE = 77.2090
TIMEZONE = "Asia/Kolkata"

def fetch_weather_chunk(start_date: str, end_date: str, retries: int = 3) -> pd.DataFrame:
    url = (
        f"https://archive-api.open-meteo.com/v1/archive?"
        f"latitude={LATITUDE}&longitude={LONGITUDE}&start_date={start_date}&end_date={end_date}&"
        f"hourly=temperature_2m,relative_humidity_2m,rain,cloud_cover&timezone=Asia%2FKolkata"
    )
    for attempt in range(1, retries + 1):
        try:
            print(f"  Fetching Open-Meteo archive {start_date} to {end_date} (attempt {attempt})...")
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                hourly = data.get("hourly", {})
                df = pd.DataFrame({
                    "timestamp": pd.to_datetime(hourly["time"]).strftime('%Y-%m-%d %H:%M:%S'),
                    "temp_c": hourly.get("temperature_2m", []),
                    "humidity_pct": hourly.get("relative_humidity_2m", []),
                    "rain_mm": hourly.get("rain", []),
                    "cloud_cover_pct": hourly.get("cloud_cover", [])
                })
                return df
            else:
                print(f"  HTTP error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"  Error on attempt {attempt}: {e}")
        time.sleep(2 * attempt)
    raise RuntimeError(f"Failed to fetch weather for {start_date} to {end_date}")

def fetch_live_forecast_72h() -> dict:
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={LATITUDE}&longitude={LONGITUDE}&hourly=temperature_2m,relative_humidity_2m,rain,cloud_cover&"
        f"forecast_days=3&timezone=Asia%2FKolkata"
    )
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
        print(f"  Forecast API status {resp.status_code}")
    except Exception as e:
        print(f"  Warning: live forecast fetch failed ({e})")
    # Fallback structure
    return {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "timezone": TIMEZONE,
        "hourly": {
            "time": [f"2026-11-25T{h:02d}:00" for h in range(72)],
            "temperature_2m": [22.0 + (5.0 if 12 <= (h % 24) <= 16 else 0.0) for h in range(72)],
            "relative_humidity_2m": [55.0 for _ in range(72)],
            "rain": [0.0 for _ in range(72)],
            "cloud_cover": [20.0 for _ in range(72)]
        }
    }

def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    proc_dir = os.path.join(os.path.dirname(__file__), "..", "processed")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(proc_dir, exist_ok=True)
    
    # 1. Fetch live 72h forecast snapshot
    print("[02_weather] Fetching 72-hour live forecast for offline fallback...")
    forecast_data = fetch_live_forecast_72h()
    fallback_json_path = os.path.join(proc_dir, "fallback_weather.json")
    with open(fallback_json_path, "w", encoding="utf-8") as f:
        json.dump(forecast_data, f, indent=2)
    print(f"[02_weather] Saved {fallback_json_path}")
    
    # 2. Fetch historical weather chunks from 2019 to 2024
    chunks = [
        ("2019-01-01", "2019-12-31"),
        ("2020-01-01", "2020-12-31"),
        ("2021-01-01", "2021-12-31"),
        ("2022-01-01", "2022-12-31"),
        ("2023-01-01", "2023-12-31"),
        ("2024-01-01", "2024-04-30")
    ]
    
    dfs = []
    print("[02_weather] Fetching historical weather from Open-Meteo Archive API...")
    for s_date, e_date in chunks:
        df_chunk = fetch_weather_chunk(s_date, e_date)
        dfs.append(df_chunk)
        time.sleep(0.5)
        
    full_weather_df = pd.concat(dfs, ignore_index=True)
    full_weather_df = full_weather_df.drop_duplicates(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
    
    hist_csv = os.path.join(raw_dir, "historical_weather.csv")
    full_weather_df.to_csv(hist_csv, index=False)
    print(f"[02_weather] Saved historical weather to {hist_csv} ({len(full_weather_df)} records)")
    
    # 3. Save sample 72h weather CSV
    sample_72h = full_weather_df.tail(72).copy()
    sample_csv = os.path.join(proc_dir, "sample_72h_weather.csv")
    sample_72h.to_csv(sample_csv, index=False)
    print(f"[02_weather] Saved sample 72h weather to {sample_csv}")
    print(sample_72h.head(3))

if __name__ == "__main__":
    main()
