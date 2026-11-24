"""
01_download_data.py
Downloads or copies the Kaggle dataset 'shubhamvashisht/hourly-load-india-electrical-load-forecasting',
dynamically inspects columns, standardizes timestamps to Asia/Kolkata, cleans load_mw,
and saves to data/raw/india_hourly_load.csv.
"""

import os
import shutil
import pandas as pd

def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    os.makedirs(raw_dir, exist_ok=True)
    
    excel_source = None
    
    # Try kagglehub first
    try:
        import kagglehub
        print("[01_download] Fetching dataset via kagglehub...")
        cache_path = kagglehub.dataset_download("shubhamvashisht/hourly-load-india-electrical-load-forecasting")
        candidate = os.path.join(cache_path, "hourlyLoadDataIndia.xlsx")
        if os.path.exists(candidate):
            excel_source = candidate
            print(f"[01_download] Successfully downloaded via kagglehub: {excel_source}")
    except Exception as e:
        print(f"[01_download] Warning: kagglehub fetch threw {e}")
        
    # Check if raw dir already has it or fallback
    if not excel_source:
        local_raw = os.path.join(raw_dir, "hourlyLoadDataIndia.xlsx")
        if os.path.exists(local_raw):
            excel_source = local_raw
            print(f"[01_download] Using existing file at {excel_source}")
            
    if not excel_source or not os.path.exists(excel_source):
        raise FileNotFoundError("Could not find or download hourlyLoadDataIndia.xlsx")
        
    # Copy to raw_dir if not there
    target_excel = os.path.join(raw_dir, "hourlyLoadDataIndia.xlsx")
    if os.path.abspath(excel_source) != os.path.abspath(target_excel):
        shutil.copy2(excel_source, target_excel)
        print(f"[01_download] Copied {excel_source} -> {target_excel}")

    print("[01_download] Dynamically inspecting Excel structure...")
    xl = pd.ExcelFile(target_excel)
    print(f"  Sheets found: {xl.sheet_names}")
    
    df = pd.read_excel(target_excel, sheet_name=0)
    print(f"  Original columns: {df.columns.tolist()}")
    print(f"  Shape: {df.shape}")
    
    # Find timestamp column
    time_col = None
    for c in df.columns:
        if any(k in str(c).lower() for k in ['datetime', 'time', 'date', 'timestamp']):
            time_col = c
            break
    if not time_col:
        time_col = df.columns[0]
    print(f"  Selected timestamp column: '{time_col}'")
    
    # Find National Hourly Demand / load column
    load_col = None
    for c in df.columns:
        if 'national' in str(c).lower() and 'demand' in str(c).lower():
            load_col = c
            break
    if not load_col:
        for c in df.columns:
            if 'demand' in str(c).lower() or 'load' in str(c).lower():
                load_col = c
                break
    if not load_col:
        load_col = df.columns[1]
    print(f"  Selected load column: '{load_col}'")
    
    # Standardize
    clean_df = pd.DataFrame()
    clean_df['timestamp'] = pd.to_datetime(df[time_col])
    # Format to standard YYYY-MM-DD HH:MM:SS
    clean_df['timestamp'] = clean_df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
    clean_df['load_mw'] = pd.to_numeric(df[load_col], errors='coerce')
    
    # Drop duplicates & sort chronologically
    clean_df = clean_df.drop_duplicates(subset=['timestamp']).sort_values('timestamp').reset_index(drop=True)
    
    output_csv = os.path.join(raw_dir, "india_hourly_load.csv")
    clean_df.to_csv(output_csv, index=False)
    print(f"[01_download] Exported cleaned hourly load to {output_csv}")
    print(f"  Total records: {len(clean_df)}")
    print(f"  Date range: {clean_df['timestamp'].min()} to {clean_df['timestamp'].max()}")
    print(f"  Load MW range: {clean_df['load_mw'].min():.1f} MW to {clean_df['load_mw'].max():.1f} MW")
    print(f"  Missing load values: {clean_df['load_mw'].isnull().sum()}")
    print(clean_df.head(3))

if __name__ == "__main__":
    main()
