"""Central configuration, regional metadata, state mappings, tariff & emission constants."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_CACHE_DIR = BACKEND_DIR / "data_cache"
DEFAULT_CEA_PDF_DIR = Path(r"C:\pdf")

DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 5 Indian Regional Grids + All_India macro entity
REGIONS: dict[str, dict] = {
    "NR": {
        "id": "NR",
        "name": "Northern Region",
        "cea_label": "Northern Region",
        "lat": 28.61,
        "lon": 77.21,
        "weather_hub": "Delhi / NCR",
        "cooling_threshold_c": 24.0,
        "heating_threshold_c": 16.0,
        "solar_share": 0.14,
        "thermal_share": 0.62,
        "hydro_nuclear_share": 0.24,
        "seed": 101,
    },
    "WR": {
        "id": "WR",
        "name": "Western Region",
        "cea_label": "Western Region",
        "lat": 20.50,
        "lon": 72.85,
        "weather_hub": "Mumbai / Surat Corridor",
        "cooling_threshold_c": 25.0,
        "heating_threshold_c": 14.0,
        "solar_share": 0.18,
        "thermal_share": 0.69,
        "hydro_nuclear_share": 0.13,
        "seed": 102,
    },
    "SR": {
        "id": "SR",
        "name": "Southern Region",
        "cea_label": "Southern Region",
        "lat": 13.02,
        "lon": 78.93,
        "weather_hub": "Bengaluru / Chennai Corridor",
        "cooling_threshold_c": 24.5,
        "heating_threshold_c": 15.0,
        "solar_share": 0.24,
        "thermal_share": 0.54,
        "hydro_nuclear_share": 0.22,
        "seed": 103,
    },
    "ER": {
        "id": "ER",
        "name": "Eastern Region",
        "cea_label": "Eastern Region",
        "lat": 22.90,
        "lon": 88.00,
        "weather_hub": "Kolkata / Durgapur Corridor",
        "cooling_threshold_c": 24.5,
        "heating_threshold_c": 15.0,
        "solar_share": 0.08,
        "thermal_share": 0.80,
        "hydro_nuclear_share": 0.12,
        "seed": 104,
    },
    "NER": {
        "id": "NER",
        "name": "North-Eastern Region",
        "cea_label": "North-Eastern Region",
        "lat": 26.14,
        "lon": 91.74,
        "weather_hub": "Guwahati",
        "cooling_threshold_c": 23.5,
        "heating_threshold_c": 15.5,
        "solar_share": 0.06,
        "thermal_share": 0.44,
        "hydro_nuclear_share": 0.50,
        "seed": 105,
    },
    "All_India": {
        "id": "All_India",
        "name": "All India",
        "cea_label": "All India",
        "lat": 23.26,
        "lon": 77.41,
        "weather_hub": "National Load-Weighted Composite",
        "cooling_threshold_c": 24.5,
        "heating_threshold_c": 15.0,
        "solar_share": 0.17,
        "thermal_share": 0.65,
        "hydro_nuclear_share": 0.18,
        "seed": 100,
    },
}

REGION_ORDER = ["NR", "WR", "SR", "ER", "NER"]
ALL_MACRO_ENTITIES = ["All_India", "NR", "WR", "SR", "ER", "NER"]

# Weights for load-weighted All-India composite weather
ALL_INDIA_WEATHER_WEIGHTS = {
    "NR": 0.34,
    "WR": 0.30,
    "SR": 0.23,
    "ER": 0.115,
    "NER": 0.015,
}

# All 36 States / UTs / Systems in CEA Peak Power Supply Position Reports
STATE_SPECS: list[dict] = [
    # Northern Region (9)
    {"id": "Chandigarh", "name": "Chandigarh", "region": "NR", "aliases": ["Chandigarh"]},
    {"id": "Delhi", "name": "Delhi", "region": "NR", "aliases": ["Delhi"]},
    {"id": "Haryana", "name": "Haryana", "region": "NR", "aliases": ["Haryana"]},
    {"id": "Himachal_Pradesh", "name": "Himachal Pradesh", "region": "NR", "aliases": ["Himachal Pradesh"]},
    {"id": "JK_Ladakh", "name": "UT of J&K and Ladakh", "region": "NR", "aliases": ["UT of J&K and Ladakh"]},
    {"id": "Punjab", "name": "Punjab", "region": "NR", "aliases": ["Punjab"]},
    {"id": "Rajasthan", "name": "Rajasthan", "region": "NR", "aliases": ["Rajasthan"]},
    {"id": "Uttar_Pradesh", "name": "Uttar Pradesh", "region": "NR", "aliases": ["Uttar Pradesh"]},
    {"id": "Uttarakhand", "name": "Uttarakhand", "region": "NR", "aliases": ["Uttarakhand"]},
    # Western Region (6)
    {"id": "Chhattisgarh", "name": "Chhattisgarh", "region": "WR", "aliases": ["Chhattisgarh"]},
    {"id": "Gujarat", "name": "Gujarat", "region": "WR", "aliases": ["Gujarat"]},
    {"id": "Madhya_Pradesh", "name": "Madhya Pradesh", "region": "WR", "aliases": ["Madhya Pradesh"]},
    {"id": "Maharashtra", "name": "Maharashtra", "region": "WR", "aliases": ["Maharashtra"]},
    {
        "id": "DNH_DD",
        "name": "Dadra & Nagar Haveli and Daman & Diu",
        "region": "WR",
        "aliases": ["Dadra & Nagar Haveli and Daman & Diu"],
    },
    {"id": "Goa", "name": "Goa", "region": "WR", "aliases": ["Goa"]},
    # Southern Region (7)
    {"id": "Andhra_Pradesh", "name": "Andhra Pradesh", "region": "SR", "aliases": ["Andhra Pradesh"]},
    {"id": "Telangana", "name": "Telangana", "region": "SR", "aliases": ["Telangana"]},
    {"id": "Karnataka", "name": "Karnataka", "region": "SR", "aliases": ["Karnataka"]},
    {"id": "Kerala", "name": "Kerala", "region": "SR", "aliases": ["Kerala"]},
    {"id": "Tamil_Nadu", "name": "Tamil Nadu", "region": "SR", "aliases": ["Tamil Nadu"]},
    {"id": "Puducherry", "name": "Puducherry", "region": "SR", "aliases": ["Puducherry"]},
    {"id": "Lakshadweep", "name": "Lakshadweep", "region": "SR", "aliases": ["Lakshadweep (#)", "Lakshadweep"]},
    # Eastern Region (7)
    {"id": "Bihar", "name": "Bihar", "region": "ER", "aliases": ["Bihar"]},
    {"id": "DVC", "name": "DVC", "region": "ER", "aliases": ["DVC"]},
    {"id": "Jharkhand", "name": "Jharkhand", "region": "ER", "aliases": ["Jharkhand"]},
    {"id": "Odisha", "name": "Odisha", "region": "ER", "aliases": ["Odisha"]},
    {"id": "West_Bengal", "name": "West Bengal", "region": "ER", "aliases": ["West Bengal"]},
    {"id": "Sikkim", "name": "Sikkim", "region": "ER", "aliases": ["Sikkim"]},
    {
        "id": "Andaman_Nicobar",
        "name": "Andaman- Nicobar",
        "region": "ER",
        "aliases": ["Andaman- Nicobar (#) (**)", "Andaman- Nicobar (#)", "Andaman- Nicobar"],
    },
    # North-Eastern Region (7)
    {"id": "Arunachal_Pradesh", "name": "Arunachal Pradesh", "region": "NER", "aliases": ["Arunachal Pradesh"]},
    {"id": "Assam", "name": "Assam", "region": "NER", "aliases": ["Assam"]},
    {"id": "Manipur", "name": "Manipur", "region": "NER", "aliases": ["Manipur"]},
    {"id": "Meghalaya", "name": "Meghalaya", "region": "NER", "aliases": ["Meghalaya"]},
    {"id": "Mizoram", "name": "Mizoram", "region": "NER", "aliases": ["Mizoram"]},
    {"id": "Nagaland", "name": "Nagaland", "region": "NER", "aliases": ["Nagaland"]},
    {"id": "Tripura", "name": "Tripura", "region": "NER", "aliases": ["Tripura (*)", "Tripura"]},
]

STATE_TO_REGION: dict[str, str] = {s["id"]: s["region"] for s in STATE_SPECS}
STATE_BY_ID: dict[str, dict] = {s["id"]: s for s in STATE_SPECS}

# Lookup index (case-insensitive / space-insensitive) -> canonical entity id
ENTITY_LOOKUP: dict[str, str] = {}
for _macro in ALL_MACRO_ENTITIES:
    ENTITY_LOOKUP[_macro.lower()] = _macro
    ENTITY_LOOKUP[REGIONS[_macro]["name"].lower()] = _macro
ENTITY_LOOKUP["all india"] = "All_India"
ENTITY_LOOKUP["northern region"] = "NR"
ENTITY_LOOKUP["western region"] = "WR"
ENTITY_LOOKUP["southern region"] = "SR"
ENTITY_LOOKUP["eastern region"] = "ER"
ENTITY_LOOKUP["north-eastern region"] = "NER"
for _st in STATE_SPECS:
    ENTITY_LOOKUP[_st["id"].lower()] = _st["id"]
    ENTITY_LOOKUP[_st["name"].lower()] = _st["id"]
    for _al in _st["aliases"]:
        ENTITY_LOOKUP[_al.lower()] = _st["id"]


def resolve_entity_id(entity: str) -> str:
    """Resolve user-supplied region/state string to a canonical entity ID."""
    cleaned = entity.strip().lower()
    if cleaned in ENTITY_LOOKUP:
        return ENTITY_LOOKUP[cleaned]
    underscored = cleaned.replace(" ", "_").replace("-", "_")
    if underscored in ENTITY_LOOKUP:
        return ENTITY_LOOKUP[underscored]
    raise ValueError(f"Unknown region or state entity: '{entity}'")


# Indian Ministry of Power Time-of-Day (ToD) Tariff Rules
DEFAULT_BASE_TARIFF_INR = 7.50
TOD_SOLAR_REBATE_MULT = 0.85       # 09:00 - 15:59 (-15% solar-hour rebate)
TOD_MORNING_RAMP_MULT = 1.10       # 06:00 - 08:59 (+10%)
TOD_EVENING_PEAK_MULT = 1.20       # 18:00 - 21:59 (+20%)
TOD_CRITICAL_SURGE_MULT = 1.30     # When grid utilization >= 92%
CRITICAL_UTILIZATION_THRESHOLD = 0.92
ELEVATED_UTILIZATION_THRESHOLD = 0.85

# CEA CO2 Baseline Database Constants (tCO2 / MWh)
CEA_AVG_GRID_EF = 0.716            # Weighted average grid emission factor
CARBON_SOLAR_FLOOR_EF = 0.54       # Mid-day high-solar average emission factor
CARBON_NORMAL_EF = 0.74            # Normal thermal + hydro mix
CARBON_EVENING_PEAKER_EF = 0.94    # Evening peak thermal/gas ramp factor
CARBON_CRITICAL_MARGINAL_EF = 1.04 # Marginal coal/diesel peaker stress factor
COAL_TONNES_PER_MWH_MARGINAL = 0.55
TREE_ABSORPTION_TCO2_PER_YEAR = 0.022
