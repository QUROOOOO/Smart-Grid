"""Automated parser for CEA Peak Power Supply Position Reports (Revised) PDFs."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from backend.config import (
    ALL_MACRO_ENTITIES,
    DATA_CACHE_DIR,
    DEFAULT_CEA_PDF_DIR,
    REGION_ORDER,
    REGIONS,
    STATE_BY_ID,
    STATE_SPECS,
)

MONTH_NAME_TO_NUM = {
    "january": "01",
    "february": "02",
    "march": "03",
    "april": "04",
    "may": "05",
    "june": "06",
    "july": "07",
    "august": "08",
    "september": "09",
    "october": "10",
    "november": "11",
    "december": "12",
}

MONTH_NUM_TO_LABEL = {
    "2026-01": "January, 2026",
    "2026-02": "February, 2026",
    "2026-03": "March, 2026",
    "2026-04": "April, 2026",
    "2026-05": "May, 2026",
    "2026-06": "June, 2026",
    "2026-07": "July, 2026",
    "2026-08": "August, 2026",
}

# Verified embedded fallback (All_India + 5 Regions) in case C:\pdf is absent on another machine
EMBEDDED_REGIONAL_FALLBACK: dict[str, dict[str, dict[str, float]]] = {
    "All_India": {
        "2026-01": {"peak_demand_mw": 245444.0, "peak_met_mw": 245416.0, "demand_not_met_mw": 28.0, "demand_not_met_pct": 0.0},
        "2026-02": {"peak_demand_mw": 244209.0, "peak_met_mw": 244206.0, "demand_not_met_mw": 3.0, "demand_not_met_pct": 0.0},
        "2026-03": {"peak_demand_mw": 238379.0, "peak_met_mw": 238378.0, "demand_not_met_mw": 1.0, "demand_not_met_pct": 0.0},
        "2026-04": {"peak_demand_mw": 256117.0, "peak_met_mw": 256117.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-05": {"peak_demand_mw": 270832.0, "peak_met_mw": 270820.0, "demand_not_met_mw": 12.0, "demand_not_met_pct": 0.0},
        "2026-06": {"peak_demand_mw": 264768.0, "peak_met_mw": 264768.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-07": {"peak_demand_mw": 270209.0, "peak_met_mw": 270203.0, "demand_not_met_mw": 6.0, "demand_not_met_pct": 0.0},
        "2026-08": {"peak_demand_mw": 258276.0, "peak_met_mw": 258270.0, "demand_not_met_mw": 6.0, "demand_not_met_pct": 0.0},
    },
    "NR": {
        "2026-01": {"peak_demand_mw": 75554.0, "peak_met_mw": 75554.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-02": {"peak_demand_mw": 68098.0, "peak_met_mw": 68098.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-03": {"peak_demand_mw": 63286.0, "peak_met_mw": 63286.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-04": {"peak_demand_mw": 76862.0, "peak_met_mw": 76611.0, "demand_not_met_mw": 251.0, "demand_not_met_pct": 0.3},
        "2026-05": {"peak_demand_mw": 87675.0, "peak_met_mw": 87675.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-06": {"peak_demand_mw": 94416.0, "peak_met_mw": 93981.0, "demand_not_met_mw": 435.0, "demand_not_met_pct": 0.5},
        "2026-07": {"peak_demand_mw": 95048.0, "peak_met_mw": 95048.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-08": {"peak_demand_mw": 87251.0, "peak_met_mw": 87251.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
    },
    "WR": {
        "2026-01": {"peak_demand_mw": 82724.0, "peak_met_mw": 82695.0, "demand_not_met_mw": 29.0, "demand_not_met_pct": 0.0},
        "2026-02": {"peak_demand_mw": 83081.0, "peak_met_mw": 83081.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-03": {"peak_demand_mw": 78712.0, "peak_met_mw": 78712.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-04": {"peak_demand_mw": 81355.0, "peak_met_mw": 81355.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-05": {"peak_demand_mw": 82114.0, "peak_met_mw": 82000.0, "demand_not_met_mw": 114.0, "demand_not_met_pct": 0.1},
        "2026-06": {"peak_demand_mw": 80330.0, "peak_met_mw": 80330.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-07": {"peak_demand_mw": 74692.0, "peak_met_mw": 74692.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-08": {"peak_demand_mw": 77169.0, "peak_met_mw": 77142.0, "demand_not_met_mw": 27.0, "demand_not_met_pct": 0.0},
    },
    "SR": {
        "2026-01": {"peak_demand_mw": 64892.0, "peak_met_mw": 64892.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-02": {"peak_demand_mw": 68282.0, "peak_met_mw": 68246.0, "demand_not_met_mw": 36.0, "demand_not_met_pct": 0.1},
        "2026-03": {"peak_demand_mw": 73805.0, "peak_met_mw": 73805.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-04": {"peak_demand_mw": 74473.0, "peak_met_mw": 74469.0, "demand_not_met_mw": 4.0, "demand_not_met_pct": 0.0},
        "2026-05": {"peak_demand_mw": 68234.0, "peak_met_mw": 68234.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-06": {"peak_demand_mw": 64266.0, "peak_met_mw": 64266.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-07": {"peak_demand_mw": 72602.0, "peak_met_mw": 72471.0, "demand_not_met_mw": 131.0, "demand_not_met_pct": 0.2},
        "2026-08": {"peak_demand_mw": 70328.0, "peak_met_mw": 70328.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
    },
    "ER": {
        "2026-01": {"peak_demand_mw": 24916.0, "peak_met_mw": 24878.0, "demand_not_met_mw": 38.0, "demand_not_met_pct": 0.2},
        "2026-02": {"peak_demand_mw": 24991.0, "peak_met_mw": 24986.0, "demand_not_met_mw": 5.0, "demand_not_met_pct": 0.0},
        "2026-03": {"peak_demand_mw": 28391.0, "peak_met_mw": 27876.0, "demand_not_met_mw": 515.0, "demand_not_met_pct": 1.8},
        "2026-04": {"peak_demand_mw": 32832.0, "peak_met_mw": 32758.0, "demand_not_met_mw": 74.0, "demand_not_met_pct": 0.2},
        "2026-05": {"peak_demand_mw": 34908.0, "peak_met_mw": 34875.0, "demand_not_met_mw": 33.0, "demand_not_met_pct": 0.1},
        "2026-06": {"peak_demand_mw": 35916.0, "peak_met_mw": 35911.0, "demand_not_met_mw": 5.0, "demand_not_met_pct": 0.0},
        "2026-07": {"peak_demand_mw": 32541.0, "peak_met_mw": 32541.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-08": {"peak_demand_mw": 35635.0, "peak_met_mw": 35635.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
    },
    "NER": {
        "2026-01": {"peak_demand_mw": 3021.0, "peak_met_mw": 3021.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-02": {"peak_demand_mw": 3076.0, "peak_met_mw": 3076.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-03": {"peak_demand_mw": 3021.0, "peak_met_mw": 3021.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-04": {"peak_demand_mw": 3752.0, "peak_met_mw": 3743.0, "demand_not_met_mw": 9.0, "demand_not_met_pct": 0.2},
        "2026-05": {"peak_demand_mw": 3952.0, "peak_met_mw": 3952.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-06": {"peak_demand_mw": 4018.0, "peak_met_mw": 4018.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-07": {"peak_demand_mw": 4106.0, "peak_met_mw": 4106.0, "demand_not_met_mw": 0.0, "demand_not_met_pct": 0.0},
        "2026-08": {"peak_demand_mw": 4308.0, "peak_met_mw": 4306.0, "demand_not_met_mw": 2.0, "demand_not_met_pct": 0.0},
    },
}


def _parse_indian_number(token: str) -> float:
    return float(token.replace(",", "").strip())


def _detect_report_month(text: str, filename: str) -> tuple[str, str]:
    match = re.search(
        r"/\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*,\s*(\d{4})",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        match = re.search(
            r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s*,\s*(\d{4})",
            text,
            flags=re.IGNORECASE,
        )
    if not match:
        raise ValueError(f"Could not detect report month/year in {filename}")
    month_name = match.group(1).capitalize()
    year = match.group(2)
    month_num = MONTH_NAME_TO_NUM[month_name.lower()]
    return f"{year}-{month_num}", f"{month_name}, {year}"


def _extract_row_metrics(normalized_text: str, aliases: list[str]) -> dict[str, float] | None:
    """Extract the first 4 numeric values (Monthly Peak Demand, Peak Met, Shortage MW, Shortage %) after an alias."""
    num_pat = r"(\d[\d,]*(?:\.\d+)?)"
    for alias in aliases:
        escaped = re.escape(alias)
        # Allow optional footnote markers like (#), (##), (*), (**), ($) between label and numbers
        pattern = (
            rf"{escaped}"
            rf"(?:\s*\([^)]*\))*"
            rf"\s+{num_pat}\s+{num_pat}\s+{num_pat}\s+{num_pat}"
        )
        m = re.search(pattern, normalized_text)
        if m:
            return {
                "peak_demand_mw": _parse_indian_number(m.group(1)),
                "peak_met_mw": _parse_indian_number(m.group(2)),
                "demand_not_met_mw": _parse_indian_number(m.group(3)),
                "demand_not_met_pct": _parse_indian_number(m.group(4)),
            }
    return None


def parse_cea_pdf(pdf_path: Path) -> dict[str, Any]:
    """Parse a single CEA Peak Power Supply Position Report PDF into structured monthly records."""
    reader = PdfReader(str(pdf_path))
    raw_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    month_key, month_label = _detect_report_month(raw_text, pdf_path.name)
    normalized = re.sub(r"\s+", " ", raw_text)

    entities: dict[str, dict[str, float]] = {}

    # 5 Regional Grids + All India
    macro_aliases = {
        "NR": ["Northern Region (##)", "Northern Region"],
        "WR": ["Western Region (##)", "Western Region"],
        "SR": ["Southern Region (##)", "Southern Region"],
        "ER": ["Eastern Region (##)", "Eastern Region"],
        "NER": ["North-Eastern Region (##)", "North-Eastern Region"],
        "All_India": ["All India"],
    }
    for entity_id, aliases in macro_aliases.items():
        metrics = _extract_row_metrics(normalized, aliases)
        if metrics is None:
            raise ValueError(f"Failed to extract macro entity '{entity_id}' from {pdf_path.name}")
        entities[entity_id] = metrics

    # All 36 States / UTs / DVC
    for state in STATE_SPECS:
        metrics = _extract_row_metrics(normalized, state["aliases"])
        if metrics is None:
            raise ValueError(f"Failed to extract state '{state['id']}' from {pdf_path.name}")
        entities[state["id"]] = metrics

    return {
        "month": month_key,
        "month_label": month_label,
        "source_file": pdf_path.name,
        "entities": entities,
    }


def load_cea_ground_truth(
    pdf_dir: Path = DEFAULT_CEA_PDF_DIR,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """Load and cache all 8 monthly CEA Peak Power Supply Position Reports."""
    cache_path = DATA_CACHE_DIR / "cea_peaks_2026.json"
    if cache_path.exists() and not force_refresh:
        with cache_path.open("r", encoding="utf-8") as f:
            cached = json.load(f)
        if cached.get("months") and len(cached.get("records", {})) >= 40:
            return cached

    pdf_files = sorted(pdf_dir.glob("Power_Supply_Position_-_Peak_*.pdf")) if pdf_dir.exists() else []
    records: dict[str, dict[str, dict[str, Any]]] = {}
    month_labels: dict[str, str] = {}

    if pdf_files:
        for pdf_path in pdf_files:
            parsed = parse_cea_pdf(pdf_path)
            mkey = parsed["month"]
            month_labels[mkey] = parsed["month_label"]
            for entity_id, metrics in parsed["entities"].items():
                records.setdefault(entity_id, {})[mkey] = {
                    **metrics,
                    "month_label": parsed["month_label"],
                    "source_file": parsed["source_file"],
                }
    else:
        month_labels = dict(MONTH_NUM_TO_LABEL)
        for entity_id, months_map in EMBEDDED_REGIONAL_FALLBACK.items():
            records[entity_id] = {
                mkey: {**vals, "month_label": month_labels[mkey], "source_file": "embedded_cea_2026"}
                for mkey, vals in months_map.items()
            }

    months = sorted(month_labels.keys())
    payload = {
        "months": months,
        "month_labels": month_labels,
        "records": records,
        "notes": [
            "CEA Note 1: MW figures are net values rounded to the nearest integer MW from State Utilities / Electricity Departments.",
            "CEA Note 2 (##): Regional figures include miscellaneous entities drawing power directly from ISTS.",
            "CEA Note 3: Peak Met is matched (clipped) to Peak Demand whenever available supply exceeds Peak Demand.",
            "CEA Note 4 (**): Andaman & Nicobar Islands carried forward prior month values in Mar-2026, Jul-2026, and Aug-2026 due to non-receipt.",
        ],
    }

    with cache_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return payload


def get_entity_monthly_series(cea_data: dict[str, Any], entity_id: str) -> list[dict[str, Any]]:
    """Return chronological monthly peak records for any national, regional, or state entity."""
    entity_map = cea_data["records"].get(entity_id, {})
    series = []
    for mkey in cea_data["months"]:
        if mkey in entity_map:
            row = entity_map[mkey]
            series.append(
                {
                    "month": mkey,
                    "month_label": row.get("month_label", mkey),
                    "peak_demand_mw": float(row["peak_demand_mw"]),
                    "peak_met_mw": float(row["peak_met_mw"]),
                    "demand_not_met_mw": float(row["demand_not_met_mw"]),
                    "demand_not_met_pct": float(row["demand_not_met_pct"]),
                    "source_file": row.get("source_file", ""),
                }
            )
    return series


def get_regional_diversity_summary(cea_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Compare sum of non-coincident regional peaks vs coincident All-India peak per month."""
    summary = []
    records = cea_data["records"]
    for mkey in cea_data["months"]:
        regional_vals = {r: float(records[r][mkey]["peak_demand_mw"]) for r in REGION_ORDER}
        sum_regional = sum(regional_vals.values())
        all_india = float(records["All_India"][mkey]["peak_demand_mw"])
        summary.append(
            {
                "month": mkey,
                "month_label": cea_data["month_labels"].get(mkey, mkey),
                **{f"{r}_mw": val for r, val in regional_vals.items()},
                "sum_regional_mw": round(sum_regional, 1),
                "all_india_coincident_mw": round(all_india, 1),
                "grid_diversity_benefit_mw": round(sum_regional - all_india, 1),
            }
        )
    return summary


def get_top_shortage_events(cea_data: dict[str, Any], limit: int = 15) -> list[dict[str, Any]]:
    """Return the highest state-level peak shortage events across all parsed CEA months."""
    events: list[dict[str, Any]] = []
    records = cea_data["records"]
    for st in STATE_SPECS:
        st_id = st["id"]
        if st_id not in records:
            continue
        for mkey, row in records[st_id].items():
            shortage = float(row["demand_not_met_mw"])
            if shortage > 0:
                events.append(
                    {
                        "month": mkey,
                        "entity_id": st_id,
                        "entity_name": st["name"],
                        "region": st["region"],
                        "peak_demand_mw": float(row["peak_demand_mw"]),
                        "peak_met_mw": float(row["peak_met_mw"]),
                        "demand_not_met_mw": shortage,
                        "demand_not_met_pct": float(row["demand_not_met_pct"]),
                    }
                )
    events.sort(key=lambda x: (x["demand_not_met_mw"], x["demand_not_met_pct"]), reverse=True)
    return events[:limit]


def get_entity_metadata_lists(cea_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build metadata summaries for macro entities and all 36 states/UTs."""
    records = cea_data["records"]
    months = cea_data["months"]
    latest_month = months[-1]

    def _summarize(entity_id: str, name: str, level: str, parent_region: str | None) -> dict[str, Any]:
        series = records.get(entity_id, {})
        max_m = max(series.keys(), key=lambda m: series[m]["peak_demand_mw"])
        max_short_m = max(series.keys(), key=lambda m: series[m]["demand_not_met_mw"])
        return {
            "id": entity_id,
            "name": name,
            "level": level,
            "parent_region": parent_region,
            "latest_peak_demand_mw": float(series[latest_month]["peak_demand_mw"]),
            "max_2026_peak_demand_mw": float(series[max_m]["peak_demand_mw"]),
            "max_2026_peak_month": max_m,
            "max_shortage_mw": float(series[max_short_m]["demand_not_met_mw"]),
            "max_shortage_pct": float(series[max_short_m]["demand_not_met_pct"]),
        }

    macros = []
    for eid in ALL_MACRO_ENTITIES:
        level = "national" if eid == "All_India" else "region"
        parent = None if eid == "All_India" else eid
        macros.append(_summarize(eid, REGIONS[eid]["name"], level, parent))

    states = []
    for st in STATE_SPECS:
        sid = st["id"]
        if sid in records:
            states.append(_summarize(sid, st["name"], "state", st["region"]))

    return macros, states


def get_state_parent_region(state_id: str) -> str:
    return STATE_BY_ID[state_id]["region"]
