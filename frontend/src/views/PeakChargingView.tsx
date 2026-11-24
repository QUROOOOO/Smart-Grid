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
import { PeakChargingResponse, PeakChargingRequest, ChargingHourPoint } from "../types/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Slider } from "../components/Slider";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { formatMW, formatCurrency, formatPercentage, formatNumber, formatTimestamp, debounce } from "../lib/utils";
import { Battery, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";

const TARIFF_ZONE_COLORS: Record<string, string> = {
  solar_rebate: "#10B981",
  normal: "#6B7280",
  morning_ramp: "#F59E0B",
  evening_peak: "#F97316",
  critical_surge: "#EF4444",
};

const TARIFF_ZONE_LABELS: Record<string, string> = {
  solar_rebate: "Solar Rebate (-15%)",
  normal: "Normal",
  morning_ramp: "Morning Ramp (+10%)",
  evening_peak: "Evening Peak (+20%)",
  critical_surge: "Critical Surge (+30%)",
};

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="font-mono text-sm text-mutedInk mb-2">{formatTimestamp(label)}</p>
        <p className="text-sm"><span className="font-mono">Grid Load:</span> <span className="font-mono font-semibold">{formatMW(point.predicted_grid_mw)}</span></p>
        <p className="text-sm"><span className="font-mono">Utilization:</span> <span className="font-mono font-semibold">{point.utilization_pct.toFixed(1)}%</span></p>
        <p className="text-sm"><span className="font-mono">Tariff:</span> <Badge variant="default" className="ml-1">{TARIFF_ZONE_LABELS[point.tariff_zone]}</Badge></p>
        <p className="text-sm"><span className="font-mono">Rate:</span> <span className="font-mono font-semibold">₹{point.effective_tariff_inr_kwh.toFixed(2)}/kWh</span></p>
      </div>
    );
  }
  return null;
}

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

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.hourly_schedule.map((h, i) => ({
      hour: formatTimestamp(h.timestamp),
      gridLoad: h.predicted_grid_mw,
      tariff: h.effective_tariff_inr_kwh,
      zone: h.tariff_zone,
      utilization: h.utilization_pct,
      isShiftable: h.tariff_zone === "evening_peak" || h.tariff_zone === "critical_surge",
    }));
  }, [data]);

  const zoneCounts = useMemo(() => {
    if (!data) return {};
    const counts: Record<string, number> = {};
    data.hourly_schedule.forEach(h => {
      counts[h.tariff_zone] = (counts[h.tariff_zone] || 0) + 1;
    });
    return counts;
  }, [data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primaryInk">Peak-Load & Charging Visualizer</h1>
          <p className="text-mutedInk text-sm mt-1">
            Time-of-Day tariff optimization for EV fleets & industrial loads
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"}>
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Base Tariff"
          value={baseTariff.toFixed(2)}
          unit="₹/kWh"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KPICard
          label="Shiftable Load"
          value={formatNumber(shiftableMw)}
          unit="MW"
          icon={<Battery className="w-5 h-5" />}
        />
        <KPICard
          label="Baseline Cost"
          value={formatCurrency(data?.total_baseline_cost_inr || 0)}
          trend={data ? { value: -data.savings_pct, label: "vs Optimized" } : null}
          icon={<TrendingDown className="w-5 h-5" />}
        />
        <KPICard
          label="Optimized Savings"
          value={formatCurrency(data?.total_savings_inr || 0)}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>What-If Controls</CardTitle>
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
              label="Base Tariff"
              value={baseTariff}
              onChange={setBaseTariff}
              min={5}
              max={15}
              step={0.25}
              unit="₹/kWh"
            />
            <Slider
              label="Shiftable Load"
              value={shiftableMw}
              onChange={setShiftableMw}
              min={1}
              max={100}
              step={1}
              unit="MW"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>24-Hour Tariff Schedule</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[350px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272A30" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      tickFormatter={(val) => "₹" + val.toFixed(1)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="tariff"
                      name="Tariff (₹/kWh)"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={TARIFF_ZONE_COLORS[chartData[index]?.zone || "normal"]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grid Load & Utilization</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[350px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272A30" vertical={false} />
                    <XAxis
                      dataKey="hour"
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
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const point = payload[0].payload;
                          return (
                            <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg min-w-[200px]">
                              <p className="font-mono text-sm text-mutedInk mb-2">{formatTimestamp(label)}</p>
                              <p className="text-sm"><span className="font-mono">Grid Load:</span> <span className="font-mono font-semibold">{formatMW(point.gridLoad)}</span></p>
                              <p className="text-sm"><span className="font-mono">Utilization:</span> <span className="font-mono font-semibold">{point.utilization.toFixed(1)}%</span></p>
                              <Badge variant="default">{TARIFF_ZONE_LABELS[point.zone]}</Badge>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="gridLoad"
                      name="Grid Load (MW)"
                      fill="#F97316"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tariff Zone Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {Object.entries(zoneCounts).map(([zone, count]) => (
                <div key={zone} className="flex items-center gap-4">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: TARIFF_ZONE_COLORS[zone] }}
                  />
                  <span className="text-sm font-medium text-primaryInk w-32">
                    {TARIFF_ZONE_LABELS[zone]}
                  </span>
                  <div className="flex-1 h-2 bg-hairline rounded overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${(count / (data?.horizon_hours || 1)) * 100}%`,
                        backgroundColor: TARIFF_ZONE_COLORS[zone],
                      }}
                    />
                  </div>
                  <span className="num-tabular text-sm font-mono text-mutedInk w-16 text-right">
                    {count}h
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Load Shift Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data?.recommendations.length ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-3 bg-surface border border-hairline rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-primaryInk">{rec.date}</span>
                      <Badge variant="success">
                        Save {formatCurrency(rec.estimated_savings_inr)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-mutedInk">From Peak</p>
                        <p className="font-mono">{rec.from_peak_hour}</p>
                        <p className="text-mutedInk">₹{rec.from_tariff_inr_kwh.toFixed(2)}/kWh</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-gridOrange">→</span>
                        <p className="num-tabular font-mono ml-2 mr-2">{formatMW(rec.shifted_mw)}</p>
                      </div>
                      <div>
                        <p className="text-mutedInk">To Solar</p>
                        <p className="font-mono">{rec.to_solar_hour}</p>
                        <p className="text-mutedInk">₹{rec.to_tariff_inr_kwh.toFixed(2)}/kWh</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-mutedInk text-center py-8">No shift recommendations for current parameters</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}