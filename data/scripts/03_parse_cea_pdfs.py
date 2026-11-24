"""
03_parse_cea_pdfs.py
Extracts clean monthly peak power supply position data for all States and UTs
from the 8 CEA 2026 PDFs (January 2026 to August 2026).
Outputs: data/processed/cea_2026_states.csv with columns:
  state, region, month, peak_demand_mw, peak_met_mw, deficit_mw, deficit_pct
Validates against known ground-truth:
  - May 2026 All India peak = 270,832 MW
  - March 2026 Karnataka peak = 18,655 MW
"""

import os
import re
import pandas as pd
from pypdf import PdfReader

STATES_CONFIG = [
    # (search_key, canonical_name, region)
    ('Chandigarh', 'Chandigarh', 'Northern'),
    ('Delhi', 'Delhi', 'Northern'),
    ('Haryana', 'Haryana', 'Northern'),
    ('Himachal Pradesh', 'Himachal Pradesh', 'Northern'),
    ('UT of J&K', 'UT of J&K and Ladakh', 'Northern'),
    ('Punjab', 'Punjab', 'Northern'),
    ('Rajasthan', 'Rajasthan', 'Northern'),
    ('Uttar Pradesh', 'Uttar Pradesh', 'Northern'),
    ('Uttarakhand', 'Uttarakhand', 'Northern'),
    ('Chhattisgarh', 'Chhattisgarh', 'Western'),
    ('Gujarat', 'Gujarat', 'Western'),
    ('Madhya Pradesh', 'Madhya Pradesh', 'Western'),
    ('Maharashtra', 'Maharashtra', 'Western'),
    ('Dadra & Nagar Haveli', 'Dadra and Nagar Haveli and Daman and Diu', 'Western'),
    ('Goa', 'Goa', 'Western'),
    ('Andhra Pradesh', 'Andhra Pradesh', 'Southern'),
    ('Telangana', 'Telangana', 'Southern'),
    ('Karnataka', 'Karnataka', 'Southern'),
    ('Kerala', 'Kerala', 'Southern'),
    ('Tamil Nadu', 'Tamil Nadu', 'Southern'),
    ('Puducherry', 'Puducherry', 'Southern'),
    ('Lakshadweep', 'Lakshadweep', 'Southern'),
    ('Bihar', 'Bihar', 'Eastern'),
    ('DVC', 'DVC', 'Eastern'),
    ('Jharkhand', 'Jharkhand', 'Eastern'),
    ('Odisha', 'Odisha', 'Eastern'),
    ('West Bengal', 'West Bengal', 'Eastern'),
    ('Sikkim', 'Sikkim', 'Eastern'),
    ('Andaman', 'Andaman and Nicobar', 'Eastern'),
    ('Arunachal Pradesh', 'Arunachal Pradesh', 'North-Eastern'),
    ('Assam', 'Assam', 'North-Eastern'),
    ('Manipur', 'Manipur', 'North-Eastern'),
    ('Meghalaya', 'Meghalaya', 'North-Eastern'),
    ('Mizoram', 'Mizoram', 'North-Eastern'),
    ('Nagaland', 'Nagaland', 'North-Eastern'),
    ('Tripura', 'Tripura', 'North-Eastern'),
    ('All India', 'All India', 'All India')
]

MONTH_DICT = {
    'january': '2026-01', 'february': '2026-02', 'march': '2026-03', 'april': '2026-04',
    'may': '2026-05', 'june': '2026-06', 'july': '2026-07', 'august': '2026-08'
}

num_pattern = re.compile(r'([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d\.]+)')

def parse_all_pdfs(raw_dir: str) -> pd.DataFrame:
    records = []
    pdf_files = sorted([f for f in os.listdir(raw_dir) if f.endswith('.pdf')])
    print(f"[03_parse_cea] Found {len(pdf_files)} PDF files in {raw_dir}")
    
    for f in pdf_files:
        filepath = os.path.join(raw_dir, f)
        reader = PdfReader(filepath)
        text = reader.pages[0].extract_text()
        lines = text.split('\n')
        
        # Detect single month
        month = None
        for line in lines:
            m = re.search(r'(?:/|\s|^)(January|February|March|April|May|June|July|August)\s*,\s*2026', line, re.IGNORECASE)
            if m and 'to' not in line[:m.end()+5]:
                month = MONTH_DICT[m.group(1).lower()]
                break
                
        if not month:
            print(f"[03_parse_cea] Warning: Could not detect month for {f}")
            continue
            
        print(f"  Parsing {f} -> Month {month}...")
        
        seen_states = set()
        for i, line in enumerate(lines):
            # Exclude regional subtotals
            if any(sub in line for sub in ['Northern Region', 'Western Region', 'Southern Region', 'Eastern Region', 'North-Eastern Region']):
                continue
                
            for pattern_str, canonical_name, region in STATES_CONFIG:
                if pattern_str.lower() in line.lower() and canonical_name not in seen_states:
                    nums = num_pattern.findall(line)
                    if not nums and i + 1 < len(lines):
                        nums = num_pattern.findall(lines[i+1])
                    if nums:
                        demand_str, met_str, def_str, def_pct_str = nums[0]
                        records.append({
                            'state': canonical_name,
                            'region': region,
                            'month': month,
                            'peak_demand_mw': float(demand_str.replace(',', '')),
                            'peak_met_mw': float(met_str.replace(',', '')),
                            'deficit_mw': float(def_str.replace(',', '')),
                            'deficit_pct': float(def_pct_str)
                        })
                        seen_states.add(canonical_name)
                    break
                    
    df = pd.DataFrame(records)
    return df

def validate_ground_truth(df: pd.DataFrame):
    # May 2026 All India Peak: 270,832 MW
    may_ai = df[(df['state'] == 'All India') & (df['month'] == '2026-05')]
    if may_ai.empty:
        raise ValueError("Sanity Check Failed: Missing All India record for 2026-05!")
    actual_may_peak = may_ai.iloc[0]['peak_demand_mw']
    if actual_may_peak != 270832.0:
        raise ValueError(f"Sanity Check Failed: Expected May 2026 All India peak 270,832 MW, got {actual_may_peak} MW")
    print(f"[03_parse_cea] PASS: May 2026 All India Peak = {actual_may_peak:,.0f} MW (Exact Ground Truth Match)")

    # March 2026 Karnataka Peak: 18,655 MW
    mar_kar = df[(df['state'] == 'Karnataka') & (df['month'] == '2026-03')]
    if mar_kar.empty:
        raise ValueError("Sanity Check Failed: Missing Karnataka record for 2026-03!")
    actual_mar_kar = mar_kar.iloc[0]['peak_demand_mw']
    if actual_mar_kar != 18655.0:
        raise ValueError(f"Sanity Check Failed: Expected March 2026 Karnataka peak 18,655 MW, got {actual_mar_kar} MW")
    print(f"[03_parse_cea] PASS: March 2026 Karnataka Peak = {actual_mar_kar:,.0f} MW (Exact Ground Truth Match)")

def main():
    raw_dir = os.path.join(os.path.dirname(__file__), "..", "raw")
    proc_dir = os.path.join(os.path.dirname(__file__), "..", "processed")
    os.makedirs(proc_dir, exist_ok=True)
    
    df = parse_all_pdfs(raw_dir)
    print(f"[03_parse_cea] Total records extracted: {len(df)}")
    
    validate_ground_truth(df)
    
    out_csv = os.path.join(proc_dir, "cea_2026_states.csv")
    df.to_csv(out_csv, index=False)
    print(f"[03_parse_cea] Saved clean CEA dataset to {out_csv}")
    print(df.head(5))

if __name__ == "__main__":
    main()
