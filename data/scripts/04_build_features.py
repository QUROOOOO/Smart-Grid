"""
04_build_features.py
Merges hourly load and historical weather data, interpolates gaps (<= 3h) to ensure zero NaNs,
and engineers strict chronological features (lags, rolling stats, cyclical time, weather proxies).
Outputs: data/processed/merged_hourly_load.csv
"""

import os
import numpy as np
import pandas as pd

def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    proc_dir = os.path.join(os.path.dirname(__file__), "..", "processed")
    
    load_csv = os.path.join(raw_dir, "india_hourly_load.csv")
    weather_csv = os.path.join(raw_dir, "historical_weather.csv")
    
    if not os.path.exists(load_csv):
        raise FileNotFoundError(f"Missing {load_csv}. Please run 01_download_data.py first.")
    if not os.path.exists(weather_csv):
        raise FileNotFoundError(f"Missing {weather_csv}. Please run 02_fetch_weather.py first.")
        
    print("[04_build_features] Loading raw hourly load and historical weather...")
    load_df = pd.read_csv(load_csv)
    weather_df = pd.read_csv(weather_csv)
    
    # Ensure datetime format
    load_df['timestamp'] = pd.to_datetime(load_df['timestamp'])
    weather_df['timestamp'] = pd.to_datetime(weather_df['timestamp'])
    
    # Sort
    load_df = load_df.sort_values('timestamp').drop_duplicates('timestamp')
    weather_df = weather_df.sort_values('timestamp').drop_duplicates('timestamp')
    
    # Create complete hourly date range from min load to max load
    start_dt = load_df['timestamp'].min()
    end_dt = load_df['timestamp'].max()
    print(f"  Target timeline: {start_dt} to {end_dt}")
    
    full_idx = pd.date_range(start=start_dt, end=end_dt, freq='h', name='timestamp')
    full_df = pd.DataFrame(index=full_idx).reset_index()
    
    # Merge
    merged = full_df.merge(load_df, on='timestamp', how='left')
    merged = merged.merge(weather_df, on='timestamp', how='left')
    
    # Interpolate short gaps (<= 3h) for load_mw
    merged['load_mw'] = merged['load_mw'].interpolate(method='linear', limit=3).bfill().ffill()
    
    # Interpolate weather variables
    for w_col in ['temp_c', 'humidity_pct', 'rain_mm', 'cloud_cover_pct']:
        merged[w_col] = merged[w_col].interpolate(method='linear').bfill().ffill()
        
    # Feature Engineering (Strictly chronological, zero future leakage)
    dt = merged['timestamp'].dt
    merged['hour'] = dt.hour
    merged['day_of_week'] = dt.dayofweek
    merged['month'] = dt.month
    merged['is_weekend'] = (dt.dayofweek >= 5).astype(int)
    
    # Cyclical sin/cos encodings
    merged['hour_sin'] = np.sin(2 * np.pi * merged['hour'] / 24.0)
    merged['hour_cos'] = np.cos(2 * np.pi * merged['hour'] / 24.0)
    merged['month_sin'] = np.sin(2 * np.pi * merged['month'] / 12.0)
    merged['month_cos'] = np.cos(2 * np.pi * merged['month'] / 12.0)
    
    # Weather interaction features
    merged['cooling_degree_hour'] = np.maximum(0.0, merged['temp_c'] - 24.0)
    merged['heat_index_proxy'] = merged['temp_c'] * (merged['humidity_pct'] / 100.0)
    
    # Historical Lags strictly shifted into the past
    merged['lag_1h'] = merged['load_mw'].shift(1)
    merged['lag_24h'] = merged['load_mw'].shift(24)
    merged['lag_168h'] = merged['load_mw'].shift(168)
    
    # Rolling Statistics strictly on past values
    # shift(1) ensures the current row's target is excluded from the rolling window
    shifted_load = merged['load_mw'].shift(1)
    merged['rolling_mean_24h'] = shifted_load.rolling(window=24, min_periods=1).mean()
    merged['rolling_std_24h'] = shifted_load.rolling(window=24, min_periods=1).std().fillna(0.0)
    merged['rolling_max_24h'] = shifted_load.rolling(window=24, min_periods=1).max()
    
    # Format timestamp to string YYYY-MM-DD HH:MM:SS
    merged['timestamp'] = merged['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
    
    # Drop warm-up rows (first 168 hours = 7 days) to ensure zero NaNs across all lag features
    clean_merged = merged.iloc[168:].reset_index(drop=True)
    
    out_csv = os.path.join(proc_dir, "merged_hourly_load.csv")
    clean_merged.to_csv(out_csv, index=False)
    
    print("\n" + "="*70)
    print("DATA AUDIT REPORT: merged_hourly_load.csv")
    print("="*70)
    print(f"Shape: {clean_merged.shape}")
    print(f"Date Range: {clean_merged['timestamp'].min()} to {clean_merged['timestamp'].max()}")
    print("Missing Values Check:")
    print(clean_merged.isnull().sum())
    print("\nFirst 3 rows:")
    print(clean_merged[['timestamp', 'load_mw', 'temp_c', 'humidity_pct', 'rain_mm', 'cloud_cover_pct', 'lag_1h', 'lag_24h', 'lag_168h']].head(3))
    print("="*70)

if __name__ == "__main__":
    main()
