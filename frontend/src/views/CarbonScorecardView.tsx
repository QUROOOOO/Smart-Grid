import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { CarbonScorecardResponse, CarbonScorecardRequest, CarbonScorecardSummary } from "../types/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Slider } from "../components/Slider";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { formatMW, formatCurrency, formatPercentage, formatNumber, formatTimestamp, debounce } from "../lib/utils";
import { TreePine, Car, Factory, Leaf, Loader2, Zap, Battery, Sun } from "lucide-react";

const GRADE_COLORS: Record<string, string> = {
  "A+": "#10B981",
  "A": "#22C55E",
  "B": "#F59E0B",
  "C": "#F97316",
  "D": "#EF4444",
};

const ABATEMENT_COLORS = {
  peak_shaving: "#F97316",
  renewable_shift: "#10B981",
  efficiency_gain: "#3B82F6",
};

function AbatementTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="font-mono text-sm text-mutedInk mb-2">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-mono">{entry.name}:</span>
            <span className="font-mono font-semibold">{entry.value.toFixed(2)} tCO₂</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function CarbonScorecardView() {
  const [data, setData] = useState<CarbonScorecardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("All_India");
  const [horizonHours, setHorizonHours] = useState(48);
  const [tempDelta, setTempDelta] = useState(0);
  const [humidityDelta, setHumidityDelta] = useState(0);
  const [facilityMw, setFacilityMw] = useState(10);
  const [shiftablePct, setShiftablePct] = useState(25);
  const [solarCapacityMw, setSolarCapacityMw] = useState(2);
  const [batteryCapacityMwh, setBatteryCapacityMwh] = useState(4);
  const [baseTariff, setBaseTariff] = useState(7.5);
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);

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
    [apiClient, entity, horizonHours, tempDelta, humidityDelta, facilityMw, shiftablePct, solarCapacityMw, batteryCapacityMwh, baseTariff]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary;
  const grade = summary?.sustainability_grade || "D";
  const gradeColor = GRADE_COLORS[grade] || "#6B7280";

  const abatementBreakdown = useMemo(() => {
    if (!summary) return [];
    const baseline = summary.baseline_emissions_tco2;
    const peakShaving = baseline * 0.3 * (shiftablePct / 100) * 0.963 * 0.4;
    const renewableShift = baseline * 0.2 * (solarCapacityMw / (facilityMw || 1)) * 0.705;
    const efficiencyGain = baseline * 0.15 * (shiftablePct / 100) * 0.675;
    const total = peakShaving + renewableShift + efficiencyGain;
    return [
      { name: "Peak Shaving", value: peakShaving, color: ABATEMENT_COLORS.peak_shaving, fullName: "Peak Shaving (0.963 tCO₂/MWh)" },
      { name: "Renewable Shift", value: renewableShift, color: ABATEMENT_COLORS.renewable_shift, fullName: "Renewable Substitution (0.705 tCO₂/MWh)" },
      { name: "Efficiency Gain", value: efficiencyGain, color: ABATEMENT_COLORS.efficiency_gain, fullName: "Efficiency Gain (0.675 tCO₂/MWh)" },
    ].map(item => ({ ...item, pct: total > 0 ? (item.value / total) * 100 : 0 }));
  }, [summary, shiftablePct, solarCapacityMw, facilityMw]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primaryInk">Industrial Carbon Abatement Scorecard</h1>
          <p className="text-mutedInk text-sm mt-1">
            CEA CO₂ Baseline Database v22.0 • FY 2025–26 factors
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"}>
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Baseline Emissions"
          value={formatNumber(summary?.baseline_emissions_tco2 ?? 0, 2)}
          unit="tCO₂/day"
          icon={<Factory className="w-5 h-5" />}
        />
        <KPICard
          label="Optimized Emissions"
          value={formatNumber(summary?.optimized_emissions_tco2 ?? 0, 2)}
          unit="tCO₂/day"
          status="success"
          icon={<Leaf className="w-5 h-5" />}
        />
        <KPICard
          label="Abated CO₂"
          value={formatNumber(summary?.abated_tco2 ?? 0, 2)}
          unit="tCO₂/day"
          status="success"
          trend={summary ? { value: summary.abatement_pct, label: "Reduction" } : null}
          icon={<Zap className="w-5 h-5" />}
        />
        <KPICard
          label="Sustainability Grade"
          value={grade}
          className="relative"
          icon={
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xl"
              style={{ backgroundColor: gradeColor }}
            >
              {grade}
            </div>
          }
        />
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Abatement Levers</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Select
              label="Entity"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              options={[
                { value: "All_India", label: "All India" },
                { value: "NR", label: "Northern Region" },
                { value: "WR", label: "Western Region" },
                { value: "SR", label: "Southern Region" },
                { value: "ER", label: "Eastern Region" },
                { value: "NER", label: "North-Eastern Region" },
              ]}
            />
            <Slider
              label="Forecast Horizon"
              value={horizonHours}
              onChange={setHorizonHours}
              min={6}
              max={168}
              step={6}
              unit="h"
            />
            <Slider
              label="Temperature Offset"
              value={tempDelta}
              onChange={setTempDelta}
              min={-5}
              max={8}
              step={0.5}
              unit="°C"
            />
            <Slider
              label="Humidity Offset"
              value={humidityDelta}
              onChange={setHumidityDelta}
              min={-20}
              max={20}
              step={1}
              unit="%"
            />
            <Slider
              label="Facility Load"
              value={facilityMw}
              onChange={setFacilityMw}
              min={1}
              max={100}
              step={1}
              unit="MW"
            />
            <Slider
              label="Base Tariff"
              value={baseTariff}
              onChange={setBaseTariff}
              min={5}
              max={15}
              step={0.25}
              unit="₹/kWh"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Stacked Abatement Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[350px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={abatementBreakdown}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#272A30" horizontal={false} />
                    <XAxis
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      tickFormatter={(val) => val.toFixed(2) + " tCO₂"}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      width={140}
                    />
                    <Tooltip content={<AbatementTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name="Abated tCO₂"
                      radius={[0, 4, 4, 0]}
                    >
                      {abatementBreakdown.map((item, index) => (
                        <Cell key={`cell-${index}`} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {abatementBreakdown.map((item) => (
                <div key={item.name} className="p-3 bg-surface border border-hairline rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-primaryInk">{item.name}</span>
                  </div>
                  <p className="num-tabular text-xl font-mono font-semibold" style={{ color: item.color }}>
                    {item.value.toFixed(2)}
                  </p>
                  <p className="text-xs text-mutedInk">{item.pct.toFixed(0)}% of total</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-World Equivalents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center gap-4 p-3 bg-surface border border-hairline rounded-lg">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)" }}>
                <TreePine className="w-6 h-6 text-mutedEmerald" />
              </div>
              <div>
                <p className="text-sm text-mutedInk">Trees Planted (Annual)</p>
                <p className="num-tabular text-2xl font-mono font-semibold text-mutedEmerald">
                  {formatNumber(summary?.equivalent_trees_annual || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-surface border border-hairline rounded-lg">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(249, 115, 22, 0.15)" }}>
                <Car className="w-6 h-6 text-gridOrange" />
              </div>
              <div>
                <p className="text-sm text-mutedInk">Vehicles Removed (Daily)</p>
                <p className="num-tabular text-2xl font-mono font-semibold text-gridOrange">
                  {formatNumber(summary?.coal_avoided_tonnes || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-surface border border-hairline rounded-lg">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}>
                <Leaf className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-mutedInk">Coal Avoided</p>
                <p className="num-tabular text-2xl font-mono font-semibold text-blue-500">
                  {formatNumber(summary?.coal_avoided_tonnes ?? 0, 1)} tonnes
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-hairline">
              <p className="text-xs text-mutedInk text-center">
                Source: CEA CO₂ Baseline Database v22.0, FY 2025–26 • Weighted Avg: 0.675 tCO₂/MWh • Operating Margin: 0.963 tCO₂/MWh • Combined Margin: 0.705 tCO₂/MWh
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Advanced Levers</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Slider
              label="Peak Shaving"
              value={shiftablePct}
              onChange={setShiftablePct}
              min={0}
              max={80}
              step={5}
              unit="%"
            />
            <Slider
              label="Renewable Substitution"
              value={(solarCapacityMw / (facilityMw || 1)) * 100}
              onChange={(v) => setSolarCapacityMw((v / 100) * facilityMw)}
              min={0}
              max={50}
              step={5}
              unit="%"
            />
            <Slider
              label="Efficiency Gain"
              value={0}
              onChange={() => {}}
              min={0}
              max={20}
              step={5}
              unit="%"
              className="opacity-50 pointer-events-none"
            />
          </div>
          <p className="text-xs text-mutedInk mt-4 text-center">
            Peak Shaving @ 0.963 tCO₂/MWh (Operating Margin) • Renewable Substitution @ 0.705 tCO₂/MWh (Combined Margin) • Efficiency Gain @ 0.675 tCO₂/MWh (Weighted Avg)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}