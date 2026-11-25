import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { ForecastResponse, ForecastRequest } from "../types/api";
import { ExpressiveCard, CardLabel } from "../components/ExpressiveCard";
import { ConnectedButtonGroup } from "../components/ConnectedButtonGroup";
import { WavySlider } from "../components/WavySlider";
import { ExpressiveSwitch } from "../components/ExpressiveSwitch";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import {
  formatMW,
  formatPercentage,
  formatNumber,
  formatHourLabel,
  addHours,
  debounce,
  cn,
} from "../lib/utils";
import { useChartTheme } from "../lib/useChartTheme";
import { Cloud, AlertTriangle, Zap, Moon, Loader2, RotateCcw, Droplets } from "lucide-react";

const REGION_OPTIONS = [
  { value: "All_India", label: "All India" },
  { value: "NR", label: "North" },
  { value: "WR", label: "West" },
  { value: "SR", label: "South" },
  { value: "ER", label: "East" },
  { value: "NER", label: "North-East" },
];

const STATE_OPTIONS = [
  { value: "Karnataka", label: "Karnataka" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Uttar Pradesh", label: "Uttar Pradesh" },
  { value: "Rajasthan", label: "Rajasthan" },
  { value: "Madhya Pradesh", label: "Madhya Pradesh" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Telangana", label: "Telangana" },
  { value: "Punjab", label: "Punjab" },
  { value: "Haryana", label: "Haryana" },
  { value: "West Bengal", label: "West Bengal" },
  { value: "Delhi", label: "Delhi" },
  { value: "Bihar", label: "Bihar" },
  { value: "Odisha", label: "Odisha" },
];

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="min-w-[210px] rounded-2xl bg-surface/95 p-3.5 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
      <p className="font-mono text-xs font-semibold tracking-wide text-ink">
        {formatHourLabel(point.timestamp)}
      </p>
      <p className="mt-2 font-mono text-lg font-semibold text-ink">
        {formatNumber(point.predicted)} <span className="text-xs font-normal text-inkMuted">MW</span>
      </p>
      <p className="font-mono text-[11px] text-inkMuted">
        band {formatNumber(point.lower)}–{formatNumber(point.upper)} MW
      </p>
      <div className="mt-2.5 space-y-1 border-t border-borderSubtle/60 pt-2">
        <p className="flex items-center gap-1.5 text-[11px] text-inkSecondary">
          <Cloud className="h-3 w-3" /> {point.temperature_c.toFixed(1)}°C
          <Droplets className="ml-2 h-3 w-3" /> {point.relative_humidity_pct.toFixed(0)}%
        </p>
        <p className="flex items-center gap-1.5 text-[11px] text-inkSecondary">
          <Zap className="h-3 w-3" /> utilization {point.utilization_pct.toFixed(1)}%
          {point.is_flagged_peak && (
            <span className="ml-auto rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-canvas">
              peak
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function ForecastView() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("All_India");
  const [horizonHours, setHorizonHours] = useState(48);
  const [tempDelta, setTempDelta] = useState(0);
  const [humidityDelta, setHumidityDelta] = useState(0);
  const [isWeekend, setIsWeekend] = useState(false);
  const [useLiveWeather, setUseLiveWeather] = useState(false);
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);
  const theme = useChartTheme();

  const fetchForecast = useCallback(
    debounce(async () => {
      setLoading(true);
      try {
        const request: ForecastRequest = {
          entity,
          horizon_hours: horizonHours,
          temp_delta_c: tempDelta,
          humidity_delta_pct: humidityDelta,
        };
        const data = await apiClient.forecast(request);
        setForecast(data);
        setApiMode(apiClient.getMode());
      } catch (error) {
        console.error("Forecast error:", error);
      } finally {
        setLoading(false);
      }
    }, 200),
    [apiClient, entity, horizonHours, tempDelta, humidityDelta]
  );

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const points = forecast?.points ?? [];
  const peakThreshold = forecast?.peak_threshold_mw ?? 0;
  const predictedPeak = forecast?.predicted_peak_mw ?? 0;
  const avgLoad = forecast?.avg_load_mw ?? 0;
  const capacityRef = forecast?.capacity_reference_mw ?? 0;
  const peakAlert = (forecast?.flagged_peak_hours ?? 0) > 0;

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        label: formatHourLabel(p.timestamp),
        timestamp: p.timestamp,
        band: [p.lower_bound_mw, p.upper_bound_mw] as [number, number],
        predicted: p.predicted_mw,
        lower: p.lower_bound_mw,
        upper: p.upper_bound_mw,
        temperature_c: p.temperature_c,
        relative_humidity_pct: p.relative_humidity_pct,
        utilization_pct: p.utilization_pct,
        is_flagged_peak: p.is_flagged_peak,
      })),
    [points]
  );

  const windows = useMemo(() => {
    if (points.length === 0) return { peak: null as null | any, optimal: null as null | any };

    const flagged = points.map((p, i) => (p.is_flagged_peak ? i : -1)).filter((i) => i >= 0);
    let peak: any = null;
    if (flagged.length > 0) {
      const first = flagged[0];
      const last = flagged[flagged.length - 1];
      const endTs = points[last + 1]?.timestamp ?? addHours(points[last].timestamp, 1);
      peak = {
        start: points[first].timestamp,
        end: endTs,
        x1: formatHourLabel(points[first].timestamp),
        x2: formatHourLabel(endTs),
        label: `${formatHourLabel(points[first].timestamp)} – ${formatHourLabel(endTs)}`,
      };
    }

    const size = Math.min(5, points.length);
    let bestStart = 0;
    let bestAvg = Number.POSITIVE_INFINITY;
    for (let i = 0; i + size <= points.length; i++) {
      let sum = 0;
      for (let j = 0; j < size; j++) sum += points[i + j].utilization_pct;
      const avg = sum / size;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestStart = i;
      }
    }
    const optStartTs = points[bestStart].timestamp;
    const optEndTs = points[bestStart + size]?.timestamp ?? addHours(points[bestStart + size - 1].timestamp, 1);
    const optimal = {
      start: optStartTs,
      end: optEndTs,
      x1: formatHourLabel(optStartTs),
      x2: formatHourLabel(optEndTs),
      avgUtil: bestAvg,
      label: `${formatHourLabel(optStartTs)} – ${formatHourLabel(optEndTs)}`,
    };

    return { peak, optimal };
  }, [points]);

  const peakPoint = useMemo(
    () => points.reduce((best, p) => (p.predicted_mw > (best?.predicted_mw ?? -Infinity) ? p : best), points[0]),
    [points]
  );

  const surgePct =
    peakPoint && avgLoad > 0 ? ((peakPoint.predicted_mw - avgLoad) / avgLoad) * 100 : 0;
  const confidence = peakPoint
    ? Math.max(0, (peakPoint.upper_bound_mw - peakPoint.lower_bound_mw) / 2)
    : 0;

  const resetControls = () => {
    setEntity("All_India");
    setHorizonHours(48);
    setTempDelta(0);
    setHumidityDelta(0);
    setIsWeekend(false);
    setUseLiveWeather(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
            Forecast & Weather Simulator
          </h1>
          <p className="mt-1 text-sm text-inkMuted">
            24–168h load forecast with what-if weather perturbations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={apiMode === "live" ? "success" : "warning"} size="md" className="gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                apiMode === "live" ? "bg-brandBright" : "bg-inkMuted"
              )}
            />
            {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
          </Badge>
          <Button variant="secondary" size="sm" onClick={fetchForecast} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Predicted Peak Load"
          value={formatNumber(Math.round(predictedPeak))}
          unit="MW"
          emphasis="brand"
          icon={<Zap className="h-5 w-5" />}
          hint={
            capacityRef > 0
              ? `Capacity ref ${formatMW(capacityRef)} · ${formatPercentage(
                  (predictedPeak / capacityRef) * 100
                )} utilised`
              : undefined
          }
        />
        <KPICard
          label="Peak Window"
          value={windows.peak?.label ?? "—"}
          status={peakAlert ? "warning" : "normal"}
          emphasis="tonal"
          icon={<AlertTriangle className="h-5 w-5" />}
          hint={peakAlert ? `${forecast?.flagged_peak_hours} flagged hours` : "No flagged hours"}
        />
        <KPICard
          label="Optimal Charging Window"
          value={windows.optimal?.label ?? "—"}
          status="success"
          emphasis="tonal"
          icon={<Moon className="h-5 w-5" />}
          hint={windows.optimal ? `avg util ${windows.optimal.avgUtil.toFixed(1)}%` : undefined}
        />
        <KPICard
          label="Peak Alert"
          value={peakAlert ? "ACTIVE" : "CLEAR"}
          status={peakAlert ? "critical" : "success"}
          emphasis={peakAlert ? "obsidian" : "tonal"}
          icon={<AlertTriangle className="h-5 w-5" />}
          hint={`threshold ${formatMW(peakThreshold)}`}
        />
      </div>

      <ExpressiveCard variant="tonal" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>What-If Console</CardLabel>
            <p className="mt-1 font-display text-lg font-bold text-ink">Weather perturbation</p>
          </div>
          <Button variant="ghost" size="sm" onClick={resetControls}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-inkMuted">
              Region preset
            </span>
            <ConnectedButtonGroup
              options={REGION_OPTIONS}
              value={entity.startsWith("All_India") || REGION_OPTIONS.some((r) => r.value === entity) ? entity : ""}
              onChange={(v) => setEntity(v)}
              size="sm"
              ariaLabel="Region preset"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Entity"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              options={[...REGION_OPTIONS, ...STATE_OPTIONS]}
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
              label="Temperature Offset"
              value={tempDelta}
              onChange={setTempDelta}
              min={-5}
              max={8}
              step={0.5}
              unit="°C"
            />
            <WavySlider
              label="Humidity Offset"
              value={humidityDelta}
              onChange={setHumidityDelta}
              min={-20}
              max={20}
              step={1}
              unit="%"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ExpressiveSwitch
              checked={isWeekend}
              onChange={setIsWeekend}
              label="Weekend Mode"
              description="Apply weekend load profile"
            />
            <ExpressiveSwitch
              checked={useLiveWeather}
              onChange={setUseLiveWeather}
              label="Live Weather"
              description="Use latest weather observations"
            />
          </div>
        </div>
      </ExpressiveCard>

      <ExpressiveCard variant="elevated" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>Demand Trajectory</CardLabel>
            <p className="mt-1 font-display text-lg font-bold text-ink">
              {forecast?.entity_name ?? "Loading"} · {horizonHours}h horizon
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-inkSecondary">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: theme.brand }} />
              Predicted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: theme.brandBright, opacity: 0.5 }} />
              Confidence band
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-4 rounded-full"
                style={{ background: theme.ink, opacity: 0.45 }}
              />
              Peak window
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: theme.muted }} />
              Threshold
            </span>
          </div>
        </div>

        <div className="relative mt-4 h-[380px] w-full">
          {loading && !forecast && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-surface/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="fcBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.brandBright} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={theme.brandBright} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="2 6" />
              <XAxis
                dataKey="label"
                tick={{ fill: theme.muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: theme.grid }}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: theme.muted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                domain={["auto", "auto"]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: theme.brand, strokeDasharray: "3 4" }} />
              {windows.peak && (
                <ReferenceArea
                  x1={windows.peak.x1}
                  x2={windows.peak.x2}
                  fill={theme.brand}
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              )}
              {windows.optimal && (
                <ReferenceArea
                  x1={windows.optimal.x1}
                  x2={windows.optimal.x2}
                  fill={theme.brandVivid}
                  fillOpacity={0.08}
                  strokeOpacity={0}
                />
              )}
              {peakThreshold > 0 && (
                <ReferenceLine
                  y={peakThreshold}
                  stroke={theme.muted}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                />
              )}
              <Area
                type="monotone"
                dataKey="band"
                stroke="none"
                fill="url(#fcBand)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke={theme.brand}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: theme.brand, stroke: theme.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ExpressiveCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ExpressiveCard variant="tonal" padding="md">
          <CardLabel>Peak Surge</CardLabel>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink num-tabular">
            {surgePct > 0 ? "+" : ""}
            {surgePct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-inkMuted">
            relative to {formatMW(avgLoad)} average load
          </p>
        </ExpressiveCard>
        <ExpressiveCard variant="tonal" padding="md">
          <CardLabel>Forecast Confidence</CardLabel>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink num-tabular">
            ±{formatNumber(Math.round(confidence))}
            <span className="ml-1 text-sm font-semibold text-inkMuted">MW</span>
          </p>
          <p className="mt-1 text-xs text-inkMuted">at predicted peak point</p>
        </ExpressiveCard>
        <ExpressiveCard variant="brand" padding="md">
          <CardLabel className="text-white/70">Recommended Action</CardLabel>
          <p className="mt-2 text-sm font-semibold leading-snug text-white">
            {peakAlert
              ? `Shift flexible load out of ${windows.peak?.label ?? "the peak window"} toward ${
                  windows.optimal?.label ?? "the optimal window"
                }.`
              : `Grid is clear. Best charging window is ${windows.optimal?.label ?? "—"}.`}
          </p>
        </ExpressiveCard>
      </div>
    </div>
  );
}
