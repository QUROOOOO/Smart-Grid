import { motion } from "motion/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getApiClient } from "../services/apiClient";
import { PeakChargingResponse, PeakChargingRequest } from "../types/api";
import { ExpressiveCard, CardLabel } from "../components/ExpressiveCard";
import { WavySlider } from "../components/WavySlider";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { CircularTickRing } from "../components/ExpressiveGauges";
import {
  formatMW,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatHourLabel,
  debounce,
} from "../lib/utils";
import { useChartTheme } from "../lib/useChartTheme";
import { M3_SPRING_SLOW_SPATIAL } from "../lib/motion";
import { Battery, TrendingUp, TrendingDown, DollarSign, Loader2, ArrowRight, Sun } from "lucide-react";

const ZONE_LABELS: Record<string, string> = {
  solar_rebate: "Solar Rebate",
  normal: "Normal",
  morning_ramp: "Morning Ramp",
  evening_peak: "Evening Peak",
  critical_surge: "Critical Surge",
};

const ENTITY_OPTIONS = [
  { value: "All_India", label: "All India" },
  { value: "NR", label: "Northern Region" },
  { value: "WR", label: "Western Region" },
  { value: "SR", label: "Southern Region" },
  { value: "ER", label: "Eastern Region" },
  { value: "NER", label: "North-Eastern Region" },
];

export function PeakChargingView() {
  const [data, setData] = useState<PeakChargingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("All_India");
  const [horizonHours, setHorizonHours] = useState(48);
  const [tempDelta, setTempDelta] = useState(0);
  const [humidityDelta, setHumidityDelta] = useState(0);
  const [baseTariff, setBaseTariff] = useState(7.5);
  const [shiftableMw, setShiftableMw] = useState(10);
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);
  const theme = useChartTheme();

  const fetchData = useCallback(
    debounce(async () => {
      setLoading(true);
      try {
        const request: PeakChargingRequest = {
          entity,
          horizon_hours: horizonHours,
          temp_delta_c: tempDelta,
          humidity_delta_pct: humidityDelta,
          base_tariff_inr: baseTariff,
          shiftable_mw: shiftableMw,
        };
        const result = await apiClient.peakCharging(request);
        setData(result);
        setApiMode(apiClient.getMode());
      } catch (error) {
        console.error("Peak charging error:", error);
      } finally {
        setLoading(false);
      }
    }, 200),
    [apiClient, entity, horizonHours, tempDelta, humidityDelta, baseTariff, shiftableMw]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const zoneColor = useCallback(
    (zone: string) => {
      switch (zone) {
        case "solar_rebate":
          return theme.brand;
        case "morning_ramp":
          return theme.brandBright;
        case "evening_peak":
          return theme.brandVivid;
        case "critical_surge":
          return theme.ink;
        default:
          return theme.tonal;
      }
    },
    [theme]
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.hourly_schedule.map((h) => ({
      timestamp: h.timestamp,
      label: formatHourLabel(h.timestamp),
      gridLoad: h.predicted_grid_mw,
      tariff: h.effective_tariff_inr_kwh,
      zone: h.tariff_zone,
      utilization: h.utilization_pct,
    }));
  }, [data]);

  const avgUtilization = useMemo(() => {
    if (!data?.hourly_schedule.length) return 0;
    const sum = data.hourly_schedule.reduce((acc, h) => acc + h.utilization_pct, 0);
    return sum / data.hourly_schedule.length;
  }, [data]);

  const zoneCounts = useMemo(() => {
    if (!data) return [] as { zone: string; count: number }[];
    const counts: Record<string, number> = {};
    data.hourly_schedule.forEach((h) => {
      counts[h.tariff_zone] = (counts[h.tariff_zone] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const savingsPct = data?.savings_pct ?? 0;

  const ScheduleTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
      <div className="min-w-[200px] rounded-2xl bg-surface/95 p-3 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
        <p className="num-tabular mb-2 font-mono text-sm text-inkMuted">
          {formatHourLabel(point.timestamp)}
        </p>
        <p className="flex items-center justify-between gap-4 text-sm">
          <span className="text-inkMuted">Grid load</span>
          <span className="num-tabular font-semibold text-ink">{formatMW(point.gridLoad)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-sm">
          <span className="text-inkMuted">Utilization</span>
          <span className="num-tabular font-semibold text-ink">
            {point.utilization.toFixed(1)}%
          </span>
        </p>
        <p className="flex items-center justify-between gap-4 text-sm">
          <span className="text-inkMuted">Rate</span>
          <span className="num-tabular font-semibold text-ink">
            ₹{point.tariff.toFixed(2)}/kWh
          </span>
        </p>
        <div className="mt-2">
          <Badge variant="default">{ZONE_LABELS[point.zone] ?? point.zone}</Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 m3-stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
            Peak-Load &amp; Charging
          </h2>
          <p className="mt-1 text-sm text-inkMuted">
            Time-of-day tariff optimisation for EV fleets &amp; industrial loads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={apiMode === "live" ? "success" : "default"}>
            {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Base Tariff"
          value={baseTariff.toFixed(2)}
          unit="₹/kWh"
          emphasis="tonal"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <KPICard
          label="Shiftable Load"
          value={formatNumber(shiftableMw)}
          unit="MW"
          emphasis="tonal"
          icon={<Battery className="h-5 w-5" />}
        />
        <KPICard
          label="Baseline Cost"
          value={formatCurrency(data?.total_baseline_cost_inr || 0)}
          emphasis="tonal"
          hint={`Optimised: ${formatCurrency(data?.total_optimized_cost_inr || 0)}`}
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <KPICard
          label="Total Savings"
          value={formatCurrency(data?.total_savings_inr || 0)}
          emphasis="default"
          hint={`${savingsPct.toFixed(1)}% below baseline`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <ExpressiveCard variant="tonal" padding="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>What-If Console</CardLabel>
            <p className="mt-1 text-sm text-inkMuted">
              Tune trading window, weather deltas and fleet parameters
            </p>
          </div>
          <Badge variant="default">Debounced · 200 ms</Badge>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Select
            label="Entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            options={ENTITY_OPTIONS}
          />
          <WavySlider
            label="Forecast Horizon"
            value={horizonHours}
            onChange={setHorizonHours}
            min={6}
            max={168}
            step={6}
            unit="h"
          />
          <WavySlider
            label="Temperature"
            value={tempDelta}
            onChange={setTempDelta}
            min={-5}
            max={8}
            step={0.5}
            unit="°C"
          />
          <WavySlider
            label="Humidity"
            value={humidityDelta}
            onChange={setHumidityDelta}
            min={-20}
            max={20}
            step={1}
            unit="%"
          />
          <WavySlider
            label="Base Tariff"
            value={baseTariff}
            onChange={setBaseTariff}
            min={5}
            max={15}
            step={0.25}
            unit="₹"
          />
          <WavySlider
            label="Shiftable Load"
            value={shiftableMw}
            onChange={setShiftableMw}
            min={1}
            max={100}
            step={1}
            unit="MW"
          />
        </div>
      </ExpressiveCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ExpressiveCard variant="elevated" padding="lg" className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardLabel>Tariff Schedule</CardLabel>
              <p className="mt-1 text-sm text-inkMuted">
                Effective ₹/kWh across the next {data?.horizon_hours ?? horizonHours} hours
              </p>
            </div>
          </div>
          <div className="h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="2 6" stroke={theme.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: theme.grid }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(val) => "₹" + Number(val).toFixed(1)}
                  />
                  <Tooltip content={<ScheduleTooltip />} cursor={{ fill: theme.tonal, opacity: 0.4 }} />
                  <Bar dataKey="tariff" radius={[8, 8, 0, 0]}>
                    {chartData.map((row, index) => (
                      <Cell key={`tariff-${index}`} fill={zoneColor(row.zone)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ExpressiveCard>

        <div className="space-y-4">
          <ExpressiveCard variant="tonal" padding="lg" className="flex flex-col items-center">
            <CardLabel className="self-start">Average Load Factor</CardLabel>
            <div className="my-2 flex justify-center">
              <CircularTickRing
                value={avgUtilization}
                size={172}
                strokeWidth={10}
                ticks={40}
                label="utilization"
                caption={`${data?.critical_surge_hours ?? 0} critical hrs`}
              />
            </div>
            <div className="flex w-full items-center justify-between rounded-full bg-surface px-4 py-2 text-xs text-inkMuted ring-1 ring-borderSubtle/60">
              <span className="inline-flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-brandVivid" /> Solar hours
              </span>
              <span className="num-tabular font-semibold text-ink">
                {data?.solar_rebate_hours ?? 0}
              </span>
            </div>
          </ExpressiveCard>

          <ExpressiveCard variant="brand" padding="lg">
            <CardLabel className="text-white/70">Cost Comparison</CardLabel>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-white/70">Baseline</span>
                  <span className="num-tabular font-mono text-sm font-semibold text-white">
                    {formatCurrency(data?.total_baseline_cost_inr || 0)}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-full rounded-full bg-white/60" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-white/70">Optimised</span>
                  <span className="num-tabular font-mono text-sm font-semibold text-white">
                    {formatCurrency(data?.total_optimized_cost_inr || 0)}
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={false}
                    animate={{
                      width: `${
                        data && data.total_baseline_cost_inr > 0
                          ? Math.max(
                              4,
                              (data.total_optimized_cost_inr / data.total_baseline_cost_inr) * 100
                            )
                          : 0
                      }%`,
                    }}
                    transition={M3_SPRING_SLOW_SPATIAL}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
              <TrendingDown className="h-4 w-4 text-white" />
              <span className="num-tabular text-sm font-semibold text-white">
                {formatPercentage(savingsPct)} saved
              </span>
            </div>
          </ExpressiveCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ExpressiveCard variant="elevated" padding="lg" className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardLabel>Grid Load</CardLabel>
              <p className="mt-1 text-sm text-inkMuted">
                Predicted system demand per tariff hour
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {["solar_rebate", "normal", "evening_peak", "critical_surge"].map((zone) => (
                <span key={zone} className="inline-flex items-center gap-1.5 text-xs text-inkMuted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: zoneColor(zone) }}
                  />
                  {ZONE_LABELS[zone]}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="2 6" stroke={theme.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: theme.grid }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(val) => formatNumber(Math.round(Number(val) / 1000)) + "k"}
                  />
                  <Tooltip content={<ScheduleTooltip />} cursor={{ fill: theme.tonal, opacity: 0.4 }} />
                  <Bar dataKey="gridLoad" radius={[8, 8, 0, 0]}>
                    {chartData.map((row, index) => (
                      <Cell key={`load-${index}`} fill={zoneColor(row.zone)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ExpressiveCard>

        <ExpressiveCard variant="tonal" padding="lg">
          <CardLabel>Tariff Zone Mix</CardLabel>
          <div className="mt-4 space-y-3.5">
            {zoneCounts.length === 0 && (
              <p className="py-6 text-center text-sm text-inkMuted">Awaiting schedule…</p>
            )}
            {zoneCounts.map(({ zone, count }) => (
              <div key={zone}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{ZONE_LABELS[zone] ?? zone}</span>
                  <span className="num-tabular font-mono text-inkMuted">{count}h</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                  <motion.div
                    className="h-full rounded-full"
                    initial={false}
                    animate={{ width: `${(count / (data?.horizon_hours || 1)) * 100}%` }}
                    transition={M3_SPRING_SLOW_SPATIAL}
                    style={{ backgroundColor: zoneColor(zone) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ExpressiveCard>
      </div>

      <ExpressiveCard variant="elevated" padding="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>Load-Shift Recommendations</CardLabel>
            <p className="mt-1 text-sm text-inkMuted">
              Move flexible load out of peak pricing into solar rebate hours
            </p>
          </div>
          <Badge variant="default">{data?.recommendations.length ?? 0} windows</Badge>
        </div>
        {data?.recommendations.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.recommendations.map((rec, i) => (
              <div
                key={`${rec.date}-${i}`}
                className="rounded-3xl bg-surfaceTonal p-4 ring-1 ring-borderSubtle/40"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="num-tabular text-sm font-semibold text-ink">{rec.date}</span>
                  <Badge variant="success">
                    Save {formatCurrency(rec.estimated_savings_inr)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-inkMuted">From peak</p>
                    <p className="num-tabular font-mono text-sm text-ink">{rec.from_peak_hour}</p>
                    <p className="num-tabular text-xs text-inkMuted">
                      ₹{rec.from_tariff_inr_kwh.toFixed(2)}/kWh
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-brand">
                    <ArrowRight className="h-4 w-4" />
                    <span className="num-tabular font-mono text-xs font-semibold">
                      {formatMW(rec.shifted_mw)}
                    </span>
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-xs uppercase tracking-wide text-inkMuted">To solar</p>
                    <p className="num-tabular font-mono text-sm text-ink">{rec.to_solar_hour}</p>
                    <p className="num-tabular text-xs text-inkMuted">
                      ₹{rec.to_tariff_inr_kwh.toFixed(2)}/kWh
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-inkMuted">
            No shift recommendations for the current parameters
          </p>
        )}
      </ExpressiveCard>
    </div>
  );
}
