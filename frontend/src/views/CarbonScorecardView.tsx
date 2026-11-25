import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { CarbonScorecardResponse, CarbonScorecardRequest } from "../types/api";
import { ExpressiveCard, CardLabel } from "../components/ExpressiveCard";
import { WavySlider } from "../components/WavySlider";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { ScallopBadge } from "../components/ScallopBadge";
import { CircularTickRing } from "../components/ExpressiveGauges";
import { formatNumber, formatPercentage, debounce, cn } from "../lib/utils";
import { useChartTheme } from "../lib/useChartTheme";
import { TreePine, Car, Factory, Leaf, Loader2, Zap } from "lucide-react";

const ENTITY_OPTIONS = [
  { value: "All_India", label: "All India" },
  { value: "NR", label: "Northern Region" },
  { value: "WR", label: "Western Region" },
  { value: "SR", label: "Southern Region" },
  { value: "ER", label: "Eastern Region" },
  { value: "NER", label: "North-Eastern Region" },
];

const OM_FACTOR = 0.963;
const CM_FACTOR = 0.705;
const WA_FACTOR = 0.675;

function BreakdownTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="min-w-[200px] rounded-2xl bg-surface/95 p-3 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
      <p className="font-display text-sm font-bold text-ink">{p.fullName}</p>
      <p className="num-tabular mt-1 text-lg font-semibold text-ink">{p.value.toFixed(2)} tCO₂</p>
      <p className="text-xs text-inkMuted">{p.pct.toFixed(0)}% of total abatement</p>
    </div>
  );
}

export function CarbonScorecardView() {
  const [data, setData] = useState<CarbonScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("All_India");
  const [horizonHours, setHorizonHours] = useState(48);
  const [tempDelta, setTempDelta] = useState(0);
  const [humidityDelta, setHumidityDelta] = useState(0);
  const [facilityMw, setFacilityMw] = useState(10);
  const [shiftablePct, setShiftablePct] = useState(15);
  const [solarCapacityMw, setSolarCapacityMw] = useState(2);
  const [batteryCapacityMwh] = useState(4);
  const [efficiencyPct, setEfficiencyPct] = useState(10);
  const [baseTariff, setBaseTariff] = useState(7.5);
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);
  const theme = useChartTheme();

  const fetchData = useCallback(
    debounce(async () => {
      setLoading(true);
      try {
        const request: CarbonScorecardRequest = {
          entity,
          horizon_hours: horizonHours,
          temp_delta_c: tempDelta,
          humidity_delta_pct: humidityDelta,
          facility_mw: facilityMw,
          shiftable_pct: shiftablePct,
          solar_capacity_mw: solarCapacityMw,
          battery_capacity_mwh: batteryCapacityMwh,
          base_tariff_inr: baseTariff,
        };
        const result = await apiClient.carbonScorecard(request);
        setData(result);
        setApiMode(apiClient.getMode());
      } catch (error) {
        console.error("Carbon scorecard error:", error);
      } finally {
        setLoading(false);
      }
    }, 200),
    [
      apiClient,
      entity,
      horizonHours,
      tempDelta,
      humidityDelta,
      facilityMw,
      shiftablePct,
      solarCapacityMw,
      batteryCapacityMwh,
      baseTariff,
    ]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const grade = summary?.sustainability_grade || "D";
  const abatementPct = summary?.abatement_pct ?? 0;

  const abatementBreakdown = useMemo(() => {
    if (!summary) return [];
    const baseline = summary.baseline_emissions_tco2;
    const peakShaving = baseline * 0.3 * (shiftablePct / 100) * OM_FACTOR * 0.4;
    const renewableShift = baseline * 0.2 * (solarCapacityMw / (facilityMw || 1)) * CM_FACTOR;
    const efficiencyGain = baseline * (efficiencyPct / 100) * WA_FACTOR;
    const total = peakShaving + renewableShift + efficiencyGain;
    return [
      {
        name: "Peak Shaving",
        value: peakShaving,
        color: theme.brand,
        fullName: `Peak Shaving · ${OM_FACTOR} tCO₂/MWh`,
      },
      {
        name: "Renewable Shift",
        value: renewableShift,
        color: theme.brandBright,
        fullName: `Renewable Substitution · ${CM_FACTOR} tCO₂/MWh`,
      },
      {
        name: "Efficiency Gain",
        value: efficiencyGain,
        color: theme.brandVivid,
        fullName: `Efficiency Gain · ${WA_FACTOR} tCO₂/MWh`,
      },
    ].map((item) => ({ ...item, pct: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [summary, shiftablePct, solarCapacityMw, facilityMw, efficiencyPct, theme]);

  return (
    <div className="space-y-5 m3-stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
            Industrial Carbon Abatement Scorecard
          </h1>
          <p className="mt-1 text-sm text-inkSecondary">
            CEA CO₂ Baseline Database v22.0 · FY 2025–26 emission factors
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"}>
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Baseline Emissions"
          value={formatNumber(summary?.baseline_emissions_tco2 ?? 0, 2)}
          unit="tCO₂/day"
          emphasis="tonal"
          icon={<Factory className="h-5 w-5" />}
        />
        <KPICard
          label="Optimised Emissions"
          value={formatNumber(summary?.optimized_emissions_tco2 ?? 0, 2)}
          unit="tCO₂/day"
          emphasis="tonal"
          icon={<Leaf className="h-5 w-5" />}
        />
        <KPICard
          label="Abated CO₂"
          value={formatNumber(summary?.abated_tco2 ?? 0, 2)}
          unit="tCO₂/day"
          emphasis="default"
          hint={`${formatPercentage(abatementPct)} below baseline`}
          icon={<Zap className="h-5 w-5" />}
        />
        <KPICard
          label="Sustainability Grade"
          value={grade}
          emphasis="obsidian"
          hint="CEA weighted-average basis"
        />
      </div>

      <ExpressiveCard variant="tonal" padding="lg">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>What-If Console</CardLabel>
            <h2 className="font-display text-lg font-bold text-ink">Abatement Levers</h2>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-inkSecondary ring-1 ring-borderSubtle/60">
            {entity.replace("_", " ")}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <WavySlider
            label="Facility Load"
            value={facilityMw}
            onChange={setFacilityMw}
            min={1}
            max={100}
            step={1}
            unit="MW"
          />
          <WavySlider
            label="Base Tariff"
            value={baseTariff}
            onChange={setBaseTariff}
            min={5}
            max={15}
            step={0.25}
            unit="₹/kWh"
          />
        </div>
      </ExpressiveCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ExpressiveCard variant="elevated" padding="lg" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardLabel>Composition</CardLabel>
              <h2 className="font-display text-lg font-bold text-ink">Stacked Abatement Breakdown</h2>
            </div>
            <Badge variant="default" size="sm">
              {formatNumber(abatementBreakdown.reduce((a, b) => a + b.value, 0), 2)} tCO₂
            </Badge>
          </div>
          <div className="h-[330px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={abatementBreakdown}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 6" stroke={theme.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Number(v).toFixed(1)} t`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: theme.ink, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={132}
                  />
                  <Tooltip content={<BreakdownTooltip />} cursor={{ fill: theme.tonal, opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={54}>
                    {abatementBreakdown.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {abatementBreakdown.map((item) => (
              <div key={item.name} className="rounded-2xl bg-surfaceTonal p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-semibold text-inkSecondary">{item.name}</span>
                </div>
                <p className="num-tabular text-lg font-semibold text-ink">{item.value.toFixed(2)}</p>
                <p className="text-[11px] text-inkMuted">{item.pct.toFixed(0)}% of total</p>
              </div>
            ))}
          </div>
        </ExpressiveCard>

        <ExpressiveCard variant="obsidian" padding="lg" className="flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-canvas/60">
              Sustainability Grade
            </p>
            <div className="mt-6 flex justify-center">
              <ScallopBadge value={grade} variant="brand" size={168}>{grade}</ScallopBadge>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-canvas/10 px-4 py-3">
              <span className="text-xs text-canvas/70">Abatement</span>
              <span className="num-tabular text-lg font-semibold text-canvas">
                {formatPercentage(abatementPct)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-canvas/10 px-4 py-3">
              <span className="text-xs text-canvas/70">Trees / year</span>
              <span className="num-tabular text-lg font-semibold text-canvas">
                {formatNumber(summary?.equivalent_trees_annual ?? 0)}
              </span>
            </div>
          </div>
        </ExpressiveCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ExpressiveCard variant="elevated" padding="lg">
          <CardLabel>Equivalents</CardLabel>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Real-World Impact</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl bg-surfaceTonal p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brandWash text-brand">
                <TreePine className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-inkMuted">Trees Planted (Annual)</p>
                <p className="num-tabular text-xl font-semibold text-ink">
                  {formatNumber(summary?.equivalent_trees_annual ?? 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-surfaceTonal p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brandWash text-brandVivid">
                <Car className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-inkMuted">Vehicles Removed (Daily)</p>
                <p className="num-tabular text-xl font-semibold text-ink">
                  {formatNumber(summary?.coal_avoided_tonnes ?? 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-surfaceTonal p-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brandWash text-brandBright">
                <Leaf className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-inkMuted">Coal Avoided</p>
                <p className="num-tabular text-xl font-semibold text-ink">
                  {formatNumber(summary?.coal_avoided_tonnes ?? 0, 1)} t
                </p>
              </div>
            </div>
          </div>
        </ExpressiveCard>

        <ExpressiveCard variant="tonal" padding="lg" className="flex flex-col items-center justify-center">
          <CircularTickRing
            value={abatementPct}
            size={186}
            strokeWidth={11}
            ticks={44}
            label="abated"
            caption="vs baseline"
            tone="brand"
          />
          <p className="mt-4 max-w-[220px] text-center text-xs text-inkSecondary">
            {formatNumber(summary?.abated_tco2 ?? 0, 2)} tCO₂/day avoided under the current lever mix.
          </p>
        </ExpressiveCard>

        <ExpressiveCard variant="elevated" padding="lg">
          <CardLabel>Advanced</CardLabel>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Levers</h2>
          <div className="space-y-5">
            <WavySlider
              label="Peak Shaving"
              value={shiftablePct}
              onChange={setShiftablePct}
              min={0}
              max={80}
              step={5}
              unit="%"
            />
            <WavySlider
              label="Renewable Substitution"
              value={(solarCapacityMw / (facilityMw || 1)) * 100}
              onChange={(v) => setSolarCapacityMw((v / 100) * facilityMw)}
              min={0}
              max={50}
              step={5}
              unit="%"
            />
            <WavySlider
              label="Efficiency Gain"
              value={efficiencyPct}
              onChange={setEfficiencyPct}
              min={0}
              max={20}
              step={5}
              unit="%"
            />
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-inkMuted">
            Peak Shaving @ {OM_FACTOR} · Renewable @ {CM_FACTOR} · Efficiency @ {WA_FACTOR} tCO₂/MWh
          </p>
        </ExpressiveCard>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-surfaceTonal px-4 py-2 text-[11px] text-inkMuted ring-1 ring-borderSubtle/50">
        <span className="font-semibold text-inkSecondary">Source</span>
        <span>CEA CO₂ Baseline Database v22.0 · FY 2025–26</span>
        <span className="text-border">•</span>
        <span>Operating Margin {OM_FACTOR}</span>
        <span className="text-border">•</span>
        <span>Combined Margin {CM_FACTOR}</span>
        <span className="text-border">•</span>
        <span>Weighted Avg {WA_FACTOR} tCO₂/MWh</span>
      </div>
    </div>
  );
}
