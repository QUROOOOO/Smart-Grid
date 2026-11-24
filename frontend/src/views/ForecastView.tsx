import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { ForecastResponse, ForecastRequest, EntityMetadata } from "../types/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Slider } from "../components/Slider";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { formatMW, formatPercentage, formatNumber, formatTimestamp, debounce, cn } from "../lib/utils";
import { Cloud, AlertTriangle, Zap, Sun, Moon, Loader2 } from "lucide-react";

const REGION_OPTIONS = [
  { value: "All_India", label: "All India" },
  { value: "NR", label: "Northern Region" },
  { value: "WR", label: "Western Region" },
  { value: "SR", label: "Southern Region" },
  { value: "ER", label: "Eastern Region" },
  { value: "NER", label: "North-Eastern Region" },
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

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="font-mono text-sm text-mutedInk mb-2">{formatTimestamp(label)}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-mono">{entry.name}:</span>
            <span className="font-mono font-semibold">{entry.value.toLocaleString()}</span>
            <span className="text-mutedInk">{entry.payload?.unit || ""}</span>
          </p>
        ))}
        {point.temperature_c !== undefined && (
          <div className="border-t border-hairline mt-2 pt-2 space-y-1">
            <p className="text-xs text-mutedInk flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              Temp: {point.temperature_c.toFixed(1)}°C
            </p>
            <p className="text-xs text-mutedInk flex items-center gap-1">
              <Sun className="w-3 h-3" />
              Humidity: {point.relative_humidity_pct.toFixed(0)}%
            </p>
            <p className="text-xs text-mutedInk flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Utilization: {point.utilization_pct.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
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

  const peakThreshold = forecast?.peak_threshold_mw || 0;
  const predictedPeak = forecast?.predicted_peak_mw || 0;
  const peakAlert = forecast ? forecast.flagged_peak_hours > 0 : false;
  const peakWindow = forecast
    ? `${formatTimestamp(forecast.points.find(p => p.is_flagged_peak)?.timestamp || "")} - ${formatTimestamp(forecast.points[forecast.points.length - 1]?.timestamp || "")}`
    : "—";
  const optimalChargingWindow = forecast
    ? `${formatTimestamp(forecast.points.find(p => p.utilization_pct < 70)?.timestamp || "01:00")} - ${formatTimestamp(forecast.points.find(p => p.utilization_pct < 70 && new Date(p.timestamp).getHours() >= 6)?.timestamp || "06:00")}`
    : "01:00 - 06:00";

  const chartData = useMemo(() => {
    if (!forecast) return [];
    return forecast.points.map((p, i) => ({
      timestamp: formatTimestamp(p.timestamp),
      hour: new Date(p.timestamp).getHours(),
      predicted: p.predicted_mw,
      lower: p.lower_bound_mw,
      upper: p.upper_bound_mw,
      temperature: p.temperature_c,
      humidity: p.relative_humidity_pct,
      utilization: p.utilization_pct,
      isPeak: p.is_flagged_peak,
      rawTimestamp: p.timestamp,
    }));
  }, [forecast]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with API Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primaryInk">Forecast & Weather Simulator</h1>
          <p className="text-mutedInk text-sm mt-1">
            24-168h load forecast with What-If weather perturbations
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"} className="gap-1">
          <span className={cn("w-2 h-2 rounded-full", apiMode === "live" ? "bg-mutedEmerald" : "bg-gridOrange")} />
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Predicted Peak Load"
          value={formatNumber(Math.round(predictedPeak))}
          unit="MW"
          status={peakAlert ? "critical" : "normal"}
          icon={<Zap className="w-5 h-5" />}
        />
        <KPICard
          label="Peak Window"
          value={peakWindow}
          status={peakAlert ? "warning" : "normal"}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <KPICard
          label="Optimal Charging Window"
          value={optimalChargingWindow}
          status="success"
          icon={<Moon className="w-5 h-5" />}
        />
        <KPICard
          label="Peak Alert"
          value={peakAlert ? "ACTIVE" : "CLEAR"}
          status={peakAlert ? "critical" : "success"}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Controls */}
      <Card className="p-5">
        <CardHeader>
          <CardTitle>What-If Controls</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Entity"
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              options={[
                ...REGION_OPTIONS,
                ...STATE_OPTIONS.map(s => ({ value: s.value, label: s.label + " (State)" })),
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
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWeekend}
                  onChange={(e) => setIsWeekend(e.target.checked)}
                  className="w-4 h-4 accent-gridOrange rounded border-hairline bg-surface"
                />
                <span className="text-sm text-primaryInk">Weekend Mode</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLiveWeather}
                  onChange={(e) => setUseLiveWeather(e.target.checked)}
                  className="w-4 h-4 accent-gridOrange rounded border-hairline bg-surface"
                />
                <span className="text-sm text-primaryInk">Live Weather</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>24-Hour Load Forecast</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272A30" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#272A30" }}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#272A30" }}
                    tickLine={false}
                    tickFormatter={(val) => formatNumber(Math.round(val / 1000)) + "k"}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 20 }}
                    formatter={(value) => [
                      value === "predicted" ? "Forecast (MW)" : value === "lower" ? "Lower Bound" : "Upper Bound",
                      value === "predicted" ? "#F97316" : value === "lower" ? "#10B981" : "#6366F1",
                    ]}
                  />
                  <ReferenceLine
                    y={peakThreshold}
                    stroke="#F97316"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{ value: "Peak Threshold", position: "right", fill: "#F97316", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stackId="confidence"
                    stroke="transparent"
                    fill="#10B981"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stackId="confidence"
                    stroke="transparent"
                    fill="#10B981"
                    fillOpacity={0.1}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    name="Forecast (MW)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-mutedInk">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-gridOrange" />
              Forecast
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
              Confidence Band (p10-p90)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-gridOrange border-t border-gridOrange" style={{ borderTopStyle: "dashed" }} />
              Peak Threshold (92%)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}