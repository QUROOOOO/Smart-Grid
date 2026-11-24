"""Data Analytics Core: Peak Load Charging Visualizer & Industrial Carbon Footprint Abatement Scorecard."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import pandas as pd

from backend.config import (
    CARBON_CRITICAL_MARGINAL_EF,
    CARBON_EVENING_PEAKER_EF,
    CARBON_NORMAL_EF,
    CARBON_SOLAR_FLOOR_EF,
    CEA_AVG_GRID_EF,
    COAL_TONNES_PER_MWH_MARGINAL,
    CRITICAL_UTILIZATION_THRESHOLD,
    ELEVATED_UTILIZATION_THRESHOLD,
    REGIONS,
    TOD_CRITICAL_SURGE_MULT,
    TOD_EVENING_PEAK_MULT,
    TOD_MORNING_RAMP_MULT,
    TOD_SOLAR_REBATE_MULT,
    TREE_ABSORPTION_TCO2_PER_YEAR,
)


def _classify_tariff_and_stress(hour: int, utilization_ratio: float) -> tuple[str, float, str]:
    """Classify hour into Indian MoP Time-of-Day tariff zone and grid stress level."""
    if utilization_ratio >= CRITICAL_UTILIZATION_THRESHOLD:
        stress = "critical_peak"
        return "critical_surge", TOD_CRITICAL_SURGE_MULT, stress

    stress = "elevated" if utilization_ratio >= ELEVATED_UTILIZATION_THRESHOLD else "normal"
    if 9 <= hour <= 15:
        return "solar_rebate", TOD_SOLAR_REBATE_MULT, stress
    if 18 <= hour <= 21:
        return "evening_peak", TOD_EVENING_PEAK_MULT, stress
    if 6 <= hour <= 8:
        return "morning_ramp", TOD_MORNING_RAMP_MULT, stress
    return "normal", 1.0, stress


def compute_peak_charging_plan(
    forecast_result: dict[str, Any],
    base_tariff_inr: float = 7.50,
    shiftable_mw: float = 5.0,
) -> dict[str, Any]:
    """Compute hourly ToD tariff schedule and optimal peak-to-solar industrial load-shifting savings."""
    points = forecast_result["points"]
    cap_ref = max(float(forecast_result["capacity_reference_mw"]), 1.0)

    schedule: list[dict[str, Any]] = []
    by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for pt in points:
        ts = pd.Timestamp(pt["timestamp"])
        util_ratio = float(pt["predicted_mw"]) / cap_ref
        zone, mult, stress = _classify_tariff_and_stress(ts.hour, util_ratio)
        eff_tariff = round(base_tariff_inr * mult, 3)

        item = {
            "timestamp": pt["timestamp"],
            "predicted_grid_mw": float(pt["predicted_mw"]),
            "utilization_pct": round(util_ratio * 100.0, 2),
            "tariff_zone": zone,
            "tariff_multiplier": mult,
            "effective_tariff_inr_kwh": eff_tariff,
            "grid_stress_status": stress,
        }
        schedule.append(item)
        by_date[str(ts.date())].append(item)

    # Calculate daily baseline vs shifted cost for the shiftable_mw block
    # Baseline: consumes shiftable_mw during high-tariff evening/surge hours (up to 4h/day)
    # Optimized: shifts those blocks to the cheapest solar_rebate / off-peak hours of the same day
    total_baseline_cost = 0.0
    total_optimized_cost = 0.0
    recommendations: list[dict[str, Any]] = []

    for date_str, day_hours in sorted(by_date.items()):
        # Sort candidate expensive hours (descending tariff, then descending grid MW)
        expensive = sorted(
            day_hours,
            key=lambda x: (x["effective_tariff_inr_kwh"], x["predicted_grid_mw"]),
            reverse=True,
        )
        cheap = sorted(
            day_hours,
            key=lambda x: (x["effective_tariff_inr_kwh"], x["predicted_grid_mw"]),
        )

        # Pair up to 4 peak hours with 4 lowest-tariff hours per day when spread > 0
        pair_count = min(4, len(day_hours) // 2)
        for i in range(pair_count):
            src = expensive[i]
            dst = cheap[i]
            spread = src["effective_tariff_inr_kwh"] - dst["effective_tariff_inr_kwh"]
            if spread <= 0:
                continue
            # 1 MW for 1 hour = 1,000 kWh
            kwh_shifted = shiftable_mw * 1000.0
            src_cost = kwh_shifted * src["effective_tariff_inr_kwh"]
            dst_cost = kwh_shifted * dst["effective_tariff_inr_kwh"]
            total_baseline_cost += src_cost
            total_optimized_cost += dst_cost
            recommendations.append(
                {
                    "date": date_str,
                    "from_peak_hour": src["timestamp"],
                    "to_solar_hour": dst["timestamp"],
                    "shifted_mw": round(shiftable_mw, 2),
                    "from_tariff_inr_kwh": src["effective_tariff_inr_kwh"],
                    "to_tariff_inr_kwh": dst["effective_tariff_inr_kwh"],
                    "estimated_savings_inr": round(src_cost - dst_cost, 2),
                }
            )

        # Include remaining non-shifted hours at flat base consumption for full-horizon cost context
        remaining = max(0, len(day_hours) - pair_count)
        avg_day_tariff = sum(h["effective_tariff_inr_kwh"] for h in day_hours) / max(len(day_hours), 1)
        flat_cost = remaining * shiftable_mw * 1000.0 * avg_day_tariff
        total_baseline_cost += flat_cost
        total_optimized_cost += flat_cost

    savings = max(0.0, total_baseline_cost - total_optimized_cost)
    savings_pct = (savings / total_baseline_cost * 100.0) if total_baseline_cost > 0 else 0.0

    return {
        "entity_id": forecast_result["entity_id"],
        "entity_name": forecast_result["entity_name"],
        "horizon_hours": forecast_result["horizon_hours"],
        "base_tariff_inr_kwh": round(base_tariff_inr, 2),
        "shiftable_mw": round(shiftable_mw, 2),
        "total_baseline_cost_inr": round(total_baseline_cost, 2),
        "total_optimized_cost_inr": round(total_optimized_cost, 2),
        "total_savings_inr": round(savings, 2),
        "savings_pct": round(savings_pct, 2),
        "critical_surge_hours": sum(1 for s in schedule if s["tariff_zone"] == "critical_surge"),
        "solar_rebate_hours": sum(1 for s in schedule if s["tariff_zone"] == "solar_rebate"),
        "hourly_schedule": schedule,
        "recommendations": recommendations,
    }


def _compute_hourly_emission_factors(
    hour: int,
    shortwave_radiation: float,
    utilization_ratio: float,
    region_solar_share: float,
) -> tuple[float, float]:
    """Compute (average_ef, marginal_ef) in tCO2/MWh reflecting solar vs evening thermal peaker mix."""
    solar_norm = min(1.0, max(0.0, shortwave_radiation / 750.0))
    # Higher regional solar penetration depresses mid-day average emission factor
    solar_discount = 0.22 * solar_norm * (0.7 + region_solar_share * 1.8)
    stress_premium = max(0.0, utilization_ratio - 0.75) * 0.65

    avg_ef = max(CARBON_SOLAR_FLOOR_EF, min(0.96, CARBON_NORMAL_EF - solar_discount + stress_premium))
    if utilization_ratio >= CRITICAL_UTILIZATION_THRESHOLD:
        marginal_ef = CARBON_CRITICAL_MARGINAL_EF
    elif 18 <= hour <= 22:
        marginal_ef = CARBON_EVENING_PEAKER_EF
    elif 9 <= hour <= 15 and solar_norm > 0.35:
        marginal_ef = max(CARBON_SOLAR_FLOOR_EF, avg_ef - 0.06)
    else:
        marginal_ef = min(0.98, avg_ef + 0.08)

    return round(avg_ef, 4), round(marginal_ef, 4)


def _grade_abatement(abatement_pct: float) -> str:
    if abatement_pct >= 28.0:
        return "A+"
    if abatement_pct >= 18.0:
        return "A"
    if abatement_pct >= 10.0:
        return "B"
    if abatement_pct >= 4.0:
        return "C"
    return "D"


def compute_carbon_abatement_scorecard(
    forecast_result: dict[str, Any],
    facility_mw: float = 10.0,
    shiftable_pct: float = 25.0,
    solar_capacity_mw: float = 2.0,
    battery_capacity_mwh: float = 4.0,
    base_tariff_inr: float = 7.50,
) -> dict[str, Any]:
    """Simulate industrial load-shifting + solar + BESS vs unoptimized grid draw to score CO2 abatement."""
    points = forecast_result["points"]
    parent_region = forecast_result["parent_region"]
    region_solar_share = REGIONS.get(parent_region, REGIONS["All_India"])["solar_share"]
    cap_ref = max(float(forecast_result["capacity_reference_mw"]), 1.0)

    # Compute hourly tariffs & emission factors first
    hourly_meta = []
    for pt in points:
        ts = pd.Timestamp(pt["timestamp"])
        util_ratio = float(pt["predicted_mw"]) / cap_ref
        zone, mult, _ = _classify_tariff_and_stress(ts.hour, util_ratio)
        avg_ef, marg_ef = _compute_hourly_emission_factors(
            ts.hour,
            float(pt["shortwave_radiation_wm2"]),
            util_ratio,
            region_solar_share,
        )
        hourly_meta.append(
            {
                "ts": ts,
                "timestamp": pt["timestamp"],
                "radiation": float(pt["shortwave_radiation_wm2"]),
                "tariff_inr": base_tariff_inr * mult,
                "avg_ef": avg_ef,
                "marg_ef": marg_ef,
            }
        )

    # Daily energy-neutral load shifting from evening peak (18:00-21:59) to solar window (10:00-14:59)
    shift_mw_per_peak_hour = facility_mw * (shiftable_pct / 100.0)
    by_date_indices: dict[str, list[int]] = defaultdict(list)
    for idx, m in enumerate(hourly_meta):
        by_date_indices[str(m["ts"].date())].append(idx)

    shifted_profile = [facility_mw] * len(hourly_meta)
    for idxs in by_date_indices.values():
        peak_idxs = [i for i in idxs if 18 <= hourly_meta[i]["ts"].hour <= 21]
        solar_idxs = [i for i in idxs if 10 <= hourly_meta[i]["ts"].hour <= 14]
        if peak_idxs and solar_idxs and shift_mw_per_peak_hour > 0:
            total_shifted_mwh = len(peak_idxs) * shift_mw_per_peak_hour
            add_per_solar_hr = total_shifted_mwh / len(solar_idxs)
            for i in peak_idxs:
                shifted_profile[i] = max(0.0, shifted_profile[i] - shift_mw_per_peak_hour)
            for i in solar_idxs:
                shifted_profile[i] += add_per_solar_hr

    # Simulate BESS charge (solar window) & discharge (evening peak) + behind-the-meter solar
    soc_mwh = battery_capacity_mwh * 0.25 if battery_capacity_mwh > 0 else 0.0
    max_c_rate_mw = battery_capacity_mwh * 0.35
    round_trip_eff = 0.90

    total_base_tco2 = 0.0
    total_opt_tco2 = 0.0
    total_base_cost = 0.0
    total_opt_cost = 0.0
    breakdown: list[dict[str, Any]] = []

    for idx, m in enumerate(hourly_meta):
        hour = m["ts"].hour
        base_mw = facility_mw
        target_mw = shifted_profile[idx]

        # Behind-the-meter rooftop solar generation (1 MWh/MWp scaled to radiation)
        solar_gen_mw = solar_capacity_mw * min(0.92, max(0.0, m["radiation"] / 850.0))
        solar_used_mw = min(target_mw, solar_gen_mw)
        net_after_solar = max(0.0, target_mw - solar_used_mw)

        battery_action = 0.0  # +ve = charging from grid/excess solar, -ve = discharging to shave peak
        if battery_capacity_mwh > 0:
            if 10 <= hour <= 15 and soc_mwh < battery_capacity_mwh * 0.95:
                room = battery_capacity_mwh * 0.95 - soc_mwh
                charge_mw = min(max_c_rate_mw, room)
                soc_mwh += charge_mw
                battery_action = charge_mw
            elif 18 <= hour <= 22 and soc_mwh > battery_capacity_mwh * 0.10:
                avail = (soc_mwh - battery_capacity_mwh * 0.10) * round_trip_eff
                discharge_mw = min(max_c_rate_mw, net_after_solar, avail)
                soc_mwh -= discharge_mw / round_trip_eff
                battery_action = -discharge_mw

        opt_grid_draw = max(0.0, net_after_solar + battery_action)

        # Emissions: baseline draws flat facility_mw at grid avg_ef; delta draw impacts marginal_ef
        base_em = base_mw * m["avg_ef"]
        # Credit/debit avoided or added draw using marginal emission factor for accuracy
        delta_mw = base_mw - opt_grid_draw
        opt_em = max(0.0, base_em - delta_mw * m["marg_ef"])

        base_cost = base_mw * 1000.0 * m["tariff_inr"]
        opt_cost = opt_grid_draw * 1000.0 * m["tariff_inr"]

        total_base_tco2 += base_em
        total_opt_tco2 += opt_em
        total_base_cost += base_cost
        total_opt_cost += opt_cost

        breakdown.append(
            {
                "timestamp": m["timestamp"],
                "grid_ef_tco2_mwh": m["avg_ef"],
                "marginal_ef_tco2_mwh": m["marg_ef"],
                "baseline_facility_mw": round(base_mw, 3),
                "optimized_grid_draw_mw": round(opt_grid_draw, 3),
                "rooftop_solar_used_mw": round(solar_used_mw, 3),
                "battery_action_mw": round(battery_action, 3),
                "baseline_emissions_tco2": round(base_em, 4),
                "optimized_emissions_tco2": round(opt_em, 4),
            }
        )

    abated = max(0.0, total_base_tco2 - total_opt_tco2)
    abatement_pct = (abated / total_base_tco2 * 100.0) if total_base_tco2 > 0 else 0.0
    cost_savings = max(0.0, total_base_cost - total_opt_cost)

    scale_to_year = 8760.0 / max(len(hourly_meta), 1)
    annual_abated = abated * scale_to_year
    annual_savings = cost_savings * scale_to_year
    coal_avoided = (abated / max(CEA_AVG_GRID_EF, 0.5)) * COAL_TONNES_PER_MWH_MARGINAL
    trees_eq = int(round(annual_abated / TREE_ABSORPTION_TCO2_PER_YEAR))

    return {
        "entity_id": forecast_result["entity_id"],
        "entity_name": forecast_result["entity_name"],
        "horizon_hours": forecast_result["horizon_hours"],
        "cea_baseline_ef_tco2_mwh": CEA_AVG_GRID_EF,
        "summary": {
            "baseline_emissions_tco2": round(total_base_tco2, 2),
            "optimized_emissions_tco2": round(total_opt_tco2, 2),
            "abated_tco2": round(abated, 2),
            "annualized_abated_tco2": round(annual_abated, 2),
            "abatement_pct": round(abatement_pct, 2),
            "baseline_cost_inr": round(total_base_cost, 2),
            "optimized_cost_inr": round(total_opt_cost, 2),
            "cost_savings_inr": round(cost_savings, 2),
            "annualized_savings_inr": round(annual_savings, 2),
            "coal_avoided_tonnes": round(coal_avoided, 2),
            "equivalent_trees_annual": trees_eq,
            "sustainability_grade": _grade_abatement(abatement_pct),
        },
        "hourly_breakdown": breakdown,
    }
