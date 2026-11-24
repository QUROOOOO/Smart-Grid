import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { CEASummaryResponse, EntityMetadata, MonthlyCEARecord, ShortageEvent } from "../types/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { formatMW, formatPercentage, formatNumber, formatTimestamp } from "../lib/utils";
import { TrendingUp, AlertTriangle, Search, Loader2 } from "lucide-react";

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

function MonthlyTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg min-w-[200px]">
        <p className="font-mono text-sm text-mutedInk mb-2">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="font-mono">{entry.name}:</span>
            <span className="font-mono font-semibold">{entry.value.toLocaleString()} MW</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function CEAStateExplorerView() {
  const [summary, setSummary] = useState<CEASummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("All_India");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "deficit_pct",
    direction: "desc",
  });
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiClient.ceaSummary(entity).then((data) => {
      if (mounted) {
        setSummary(data);
        setApiMode(apiClient.getMode());
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [entity, apiClient]);

  const allIndiaTrend = summary?.monthly_series || [];

  const filteredStates = useMemo(() => {
    if (!summary) return [];
    const states = summary.top_shortage_events
      .map((e) => ({
        state: e.entity_name,
        region: e.region,
        month: e.month,
        peak_demand_mw: e.peak_demand_mw,
        peak_met_mw: e.peak_met_mw,
        deficit_mw: e.demand_not_met_mw,
        deficit_pct: e.demand_not_met_pct,
      }));
    
    let filtered = states.filter(
      (s) =>
        s.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.region.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof typeof a];
      const bVal = b[sortConfig.key as keyof typeof b];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [summary, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const mayPeak = allIndiaTrend.find(m => m.month === "2026-05");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primaryInk">CEA India State-Wise Peak & Deficit Explorer</h1>
          <p className="text-mutedInk text-sm mt-1">
            Official Jan–Aug 2026 CEA Peak Supply data across 36 states/UTs
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"}>
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="All-India Peak (May 2026)"
          value={mayPeak ? formatNumber(Math.round(mayPeak.peak_demand_mw)) : "—"}
          unit="MW"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          label="Peak Deficit (May 2026)"
          value={mayPeak ? formatNumber(Math.round(mayPeak.demand_not_met_mw)) : "—"}
          unit="MW"
          status={mayPeak && mayPeak.demand_not_met_mw > 0 ? "warning" : "success"}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <KPICard
          label="Deficit %"
          value={mayPeak ? formatPercentage(mayPeak.demand_not_met_pct) : "—"}
          status={mayPeak && mayPeak.demand_not_met_pct > 1 ? "warning" : "success"}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <KPICard
          label="States Tracked"
          value={36}
          icon={<Search className="w-5 h-5" />}
        />
      </div>

      <Card className="p-5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Entity Selector</CardTitle>
          <Select
            label=""
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            options={[
              ...REGION_OPTIONS,
              ...STATE_OPTIONS.map(s => ({ value: s.value, label: s.label + " (State)" })),
            ]}
            className="w-64"
          />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[350px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allIndiaTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#272A30" vertical={false} />
                  <XAxis
                    dataKey="month_label"
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#272A30" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#272A30" }}
                    tickLine={false}
                    tickFormatter={(val) => formatNumber(Math.round(val / 1000)) + "k"}
                  />
                  <Tooltip content={<MonthlyTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="peak_demand_mw"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    name="Peak Demand (MW)"
                  />
                  <Line
                    type="monotone"
                    dataKey="peak_met_mw"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                    name="Peak Met (MW)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-mutedInk">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-gridOrange" /> Peak Demand
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500" /> Peak Met
            </span>
            {mayPeak && (
              <Badge variant="warning" className="ml-auto">
                May 2026 Peak: {formatMW(mayPeak.peak_demand_mw)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>State-Wise Deficit Table (Top Shortage Events)</CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search state/region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 bg-surface border border-hairline rounded-lg text-primaryInk placeholder:text-mutedInk focus:outline-none focus:ring-2 focus:ring-gridOrange w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-mutedInk">
                  {[
                    { key: "state", label: "State" },
                    { key: "region", label: "Region" },
                    { key: "month", label: "Month" },
                    { key: "peak_demand_mw", label: "Peak Demand (MW)" },
                    { key: "peak_met_mw", label: "Peak Met (MW)" },
                    { key: "deficit_mw", label: "Deficit (MW)" },
                    { key: "deficit_pct", label: "Deficit %" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="pb-3 pr-4 font-medium cursor-pointer hover:text-primaryInk"
                      onClick={() => requestSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {sortConfig.key === key && (
                          <span>{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStates.slice(0, 50).map((state, i) => (
                  <tr
                    key={`${state.state}-${state.month}`}
                    className={`border-b border-hairline/50 hover:bg-surfaceHover/50 ${i % 2 === 0 ? "bg-surface/30" : ""}`}
                  >
                    <td className="py-3 pr-4 font-medium text-primaryInk">{state.state}</td>
                    <td className="py-3 pr-4 text-mutedInk">{state.region}</td>
                    <td className="py-3 pr-4 text-mutedInk">{state.month}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatNumber(Math.round(state.peak_demand_mw))}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatNumber(Math.round(state.peak_met_mw))}</td>
                    <td className="py-3 pr-4 num-tabular font-mono text-gridOrange">{formatNumber(Math.round(state.deficit_mw))}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          state.deficit_pct > 5 ? "danger" :
                          state.deficit_pct > 1 ? "warning" :
                          "success"
                        }
                      >
                        {formatPercentage(state.deficit_pct, 1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStates.length === 0 && (
              <p className="text-mutedInk text-center py-8">No states match your search</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional Non-Coincident Diversity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary?.regional_diversity || [
                    { region: "NR", peak_demand_mw: 76000, diversity_factor: 0.92 },
                    { region: "WR", peak_demand_mw: 72000, diversity_factor: 0.94 },
                    { region: "SR", peak_demand_mw: 65000, diversity_factor: 0.96 },
                    { region: "ER", peak_demand_mw: 30000, diversity_factor: 0.98 },
                    { region: "NER", peak_demand_mw: 3500, diversity_factor: 0.99 },
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#272A30" vertical={false} />
                  <XAxis
                    dataKey="region"
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "#272A30" }}
                    tickLine={false}
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
                          <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg">
                            <p className="font-mono text-sm text-mutedInk mb-1">{label}</p>
                            <p className="text-sm"><span className="font-mono">Peak Demand:</span> <span className="font-mono font-semibold">{formatMW(point.peak_demand_mw)}</span></p>
                            <p className="text-sm"><span className="font-mono">Diversity Factor:</span> <span className="font-mono font-semibold">{point.diversity_factor.toFixed(2)}</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="peak_demand_mw"
                    name="Peak Demand (MW)"
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
  );
}