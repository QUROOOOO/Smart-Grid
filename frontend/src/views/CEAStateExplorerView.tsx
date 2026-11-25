import { useState, useEffect, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceDot,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { CEASummaryResponse } from "../types/api";
import { ExpressiveCard, CardLabel } from "../components/ExpressiveCard";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { ConnectedButtonGroup } from "../components/ConnectedButtonGroup";
import { ConcentricArcGauge } from "../components/ExpressiveGauges";
import { formatMW, formatPercentage, formatNumber } from "../lib/utils";
import { useChartTheme } from "../lib/useChartTheme";
import { TrendingUp, AlertTriangle, Search, Loader2, MapPin } from "lucide-react";

const REGION_OPTIONS = [
  { value: "All_India", label: "All India", short: "India" },
  { value: "NR", label: "Northern Region", short: "North" },
  { value: "WR", label: "Western Region", short: "West" },
  { value: "SR", label: "Southern Region", short: "South" },
  { value: "ER", label: "Eastern Region", short: "East" },
  { value: "NER", label: "North-Eastern Region", short: "NE" },
];

const STATE_OPTIONS = [
  "Karnataka", "Maharashtra", "Gujarat", "Tamil Nadu", "Uttar Pradesh",
  "Rajasthan", "Madhya Pradesh", "Andhra Pradesh", "Telangana", "Punjab",
  "Haryana", "West Bengal", "Delhi", "Bihar", "Odisha",
].map((s) => ({ value: s, label: s }));

function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-2xl bg-surface/95 px-4 py-3 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-inkMuted">{label}</p>
      <p className="text-sm text-inkSecondary">
        Peak demand <span className="num-tabular font-semibold text-ink">{formatMW(point.peak_demand_mw)}</span>
      </p>
      <p className="text-sm text-inkSecondary">
        Peak met <span className="num-tabular font-semibold text-ink">{formatMW(point.peak_met_mw)}</span>
      </p>
      <p className="mt-1 text-sm text-inkSecondary">
        Deficit <span className="num-tabular font-semibold text-ink">{formatMW(point.demand_not_met_mw)}</span>
        <span className="ml-1 text-inkMuted">({formatPercentage(point.demand_not_met_pct, 1)})</span>
      </p>
    </div>
  );
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
  const theme = useChartTheme();

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

  const trend = summary?.monthly_series || [];
  const mayPeak = trend.find((m) => m.month === "2026-05");
  const karnataka = summary?.top_shortage_events.find((e) => e.entity_name === "Karnataka");

  const states = useMemo(() => {
    if (!summary) return [];
    const rows = summary.top_shortage_events.map((e) => ({
      state: e.entity_name,
      region: e.region,
      month: e.month,
      peak_demand_mw: e.peak_demand_mw,
      peak_met_mw: e.peak_met_mw,
      deficit_mw: e.demand_not_met_mw,
      deficit_pct: e.demand_not_met_pct,
    }));
    const filtered = rows.filter(
      (s) =>
        s.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.region.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered.sort((a, b) => {
      const av = a[sortConfig.key as keyof typeof a];
      const bv = b[sortConfig.key as keyof typeof b];
      if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
      if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [summary, searchTerm, sortConfig]);

  const leaderboard = useMemo(
    () => [...states].sort((a, b) => b.deficit_mw - a.deficit_mw).slice(0, 8),
    [states]
  );
  const maxDeficit = leaderboard[0]?.deficit_mw || 1;

  const requestSort = (key: string) =>
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

  const diversity = summary?.regional_diversity || [];
  const peakMetPct = mayPeak ? (mayPeak.peak_met_mw / mayPeak.peak_demand_mw) * 100 : 0;

  return (
    <div className="space-y-5 m3-stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
            CEA State-Wise Peak &amp; Deficit
          </h1>
          <p className="mt-1 text-sm text-inkMuted">
            Official Jan–Aug 2026 CEA peak supply data across 36 states &amp; UTs
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"} size="md">
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="All-India Peak · May 2026"
          value={mayPeak ? formatNumber(Math.round(mayPeak.peak_demand_mw)) : "—"}
          unit="MW"
          hint="National coincident peak"
          emphasis="default"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          label="Peak Deficit"
          value={mayPeak ? formatNumber(Math.round(mayPeak.demand_not_met_mw)) : "—"}
          unit="MW"
          status={mayPeak && mayPeak.demand_not_met_mw > 0 ? "warning" : "success"}
          emphasis="tonal"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KPICard
          label="Deficit Share"
          value={mayPeak ? formatPercentage(mayPeak.demand_not_met_pct, 2) : "—"}
          status={mayPeak && mayPeak.demand_not_met_pct > 1 ? "warning" : "success"}
          emphasis="tonal"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <KPICard
          label="States &amp; UTs Tracked"
          value={36}
          hint="Non-coincident diversity modelled"
          emphasis="tonal"
          icon={<MapPin className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ExpressiveCard variant="elevated" padding="lg" className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardLabel>National Trajectory</CardLabel>
              <p className="mt-1 text-sm text-inkMuted">Peak demand vs peak met, Jan–Aug 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-inkMuted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: theme.brand }} />
                Peak demand
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: theme.brandBright }} />
                Peak met
              </span>
            </div>
          </div>
          <div className="h-[320px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 16, right: 18, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ceaArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.brand} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={theme.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="2 6" />
                  <XAxis
                    dataKey="month_label"
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(v) => `${formatNumber(Math.round(v / 1000))}k`}
                  />
                  <Tooltip content={<MonthlyTooltip />} cursor={{ stroke: theme.grid, strokeDasharray: "3 4" }} />
                  <Area
                    type="monotone"
                    dataKey="peak_demand_mw"
                    stroke="none"
                    fill="url(#ceaArea)"
                    isAnimationActive
                  />
                  <Line
                    type="monotone"
                    dataKey="peak_demand_mw"
                    stroke={theme.brand}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: theme.brand, stroke: theme.surface, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="peak_met_mw"
                    stroke={theme.brandBright}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 4, fill: theme.brandBright }}
                  />
                  {mayPeak && (
                    <ReferenceDot
                      x={mayPeak.month_label}
                      y={mayPeak.peak_demand_mw}
                      r={6}
                      fill={theme.ink}
                      stroke={theme.surface}
                      strokeWidth={2}
                      ifOverflow="extendDomain"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          {mayPeak && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="default" size="md">
                May 2026 record · {formatMW(mayPeak.peak_demand_mw)}
              </Badge>
              <span className="text-xs text-inkMuted">
                Peak met {formatPercentage(peakMetPct, 2)} of demand
              </span>
            </div>
          )}
        </ExpressiveCard>

        <ExpressiveCard variant="tonal" padding="lg" className="flex flex-col justify-between">
          <div>
            <CardLabel>Karnataka Focus</CardLabel>
            <p className="mt-1 text-sm text-inkMuted">State peak vs national peak-met</p>
          </div>
          <div className="flex justify-center py-2">
            <ConcentricArcGauge
              size={210}
              centerLabel="Karnataka peak"
              centerValue={karnataka ? formatNumber(Math.round(karnataka.peak_demand_mw)) : "18,655"}
              metrics={[
                {
                  label: "Peak met",
                  value: peakMetPct,
                  display: formatPercentage(peakMetPct, 1),
                },
                {
                  label: "Deficit",
                  value: karnataka ? Math.min(karnataka.demand_not_met_pct * 10, 100) : 4,
                  display: karnataka ? formatPercentage(karnataka.demand_not_met_pct, 2) : "—",
                },
              ]}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <span className="text-xs text-inkMuted">National peak met</span>
              <span className="num-tabular text-sm font-semibold text-ink">{formatPercentage(peakMetPct, 2)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
              <span className="text-xs text-inkMuted">Karnataka deficit</span>
              <span className="num-tabular text-sm font-semibold text-ink">
                {karnataka ? formatMW(karnataka.demand_not_met_mw) : "—"}
              </span>
            </div>
          </div>
        </ExpressiveCard>
      </div>

      <ExpressiveCard variant="elevated" padding="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>Deficit Leaderboard</CardLabel>
            <p className="mt-1 text-sm text-inkMuted">Largest unmet demand events in the current selection</p>
          </div>
          <ConnectedButtonGroup
            ariaLabel="Entity scope"
            size="sm"
            value={REGION_OPTIONS.some((r) => r.value === entity) ? entity : "All_India"}
            onChange={(v) => setEntity(v)}
            options={REGION_OPTIONS.map((r) => ({ value: r.value, label: r.short }))}
          />
        </div>
        <div className="space-y-2.5">
          {leaderboard.map((s) => (
            <div key={`${s.state}-${s.month}`} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm text-inkSecondary">{s.state}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-full bg-surfaceTonal">
                <div
                  className="flex h-full items-center justify-end rounded-full bg-brand px-3 transition-[width] duration-500 ease-expressive"
                  style={{ width: `${Math.max((s.deficit_mw / maxDeficit) * 100, 6)}%` }}
                >
                  <span className="num-tabular text-[11px] font-semibold text-onBrand">
                    {formatNumber(Math.round(s.deficit_mw))}
                  </span>
                </div>
              </div>
              <Badge
                variant={s.deficit_pct > 5 ? "danger" : s.deficit_pct > 1 ? "warning" : "success"}
                size="sm"
                className="w-16 justify-center"
              >
                {formatPercentage(s.deficit_pct, 1)}
              </Badge>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="py-6 text-center text-sm text-inkMuted">No deficit events in this selection</p>
          )}
        </div>
      </ExpressiveCard>

      <ExpressiveCard variant="elevated" padding="lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>State-Wise Detail</CardLabel>
            <p className="mt-1 text-sm text-inkMuted">Sortable top shortage events</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkMuted" />
              <input
                type="text"
                placeholder="Search state or region"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-56 rounded-full bg-surfaceTonal pl-9 pr-4 text-sm text-ink outline-none ring-1 ring-borderSubtle/60 transition placeholder:text-inkMuted focus:ring-2 focus:ring-brandVivid"
              />
            </div>
            <Select
              label=""
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              options={[...REGION_OPTIONS.map((r) => ({ value: r.value, label: r.label })), ...STATE_OPTIONS]}
              className="w-52"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-inkMuted">
                {[
                  { key: "state", label: "State" },
                  { key: "region", label: "Region" },
                  { key: "month", label: "Month" },
                  { key: "peak_demand_mw", label: "Peak Demand" },
                  { key: "peak_met_mw", label: "Peak Met" },
                  { key: "deficit_mw", label: "Deficit" },
                  { key: "deficit_pct", label: "Deficit %" },
                ].map(({ key, label }) => (
                  <th key={key} className="pb-3 pr-4 font-semibold">
                    <button
                      type="button"
                      onClick={() => requestSort(key)}
                      className="flex items-center gap-1 transition hover:text-ink"
                    >
                      {label}
                      {sortConfig.key === key && (
                        <span className="text-brand">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {states.slice(0, 50).map((s) => (
                <tr key={`${s.state}-${s.month}`} className="border-t border-borderSubtle/50">
                  <td className="py-2.5 pr-4 font-medium text-ink">{s.state}</td>
                  <td className="py-2.5 pr-4 text-inkMuted">{s.region}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-inkMuted">{s.month}</td>
                  <td className="num-tabular py-2.5 pr-4">{formatNumber(Math.round(s.peak_demand_mw))}</td>
                  <td className="num-tabular py-2.5 pr-4">{formatNumber(Math.round(s.peak_met_mw))}</td>
                  <td className="num-tabular py-2.5 pr-4 font-semibold text-ink">
                    {formatNumber(Math.round(s.deficit_mw))}
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge
                      variant={s.deficit_pct > 5 ? "danger" : s.deficit_pct > 1 ? "warning" : "success"}
                      size="sm"
                    >
                      {formatPercentage(s.deficit_pct, 1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {states.length === 0 && (
            <p className="py-8 text-center text-sm text-inkMuted">No states match your search</p>
          )}
        </div>
      </ExpressiveCard>

      <ExpressiveCard variant="elevated" padding="lg">
        <div className="mb-4">
          <CardLabel>Regional Non-Coincident Diversity</CardLabel>
          <p className="mt-1 text-sm text-inkMuted">
            How regional peaks offset each other at the national level
          </p>
        </div>
        <div className="h-[260px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diversity} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="2 6" />
                <XAxis
                  dataKey="region"
                  tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: theme.muted, fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v) => `${formatNumber(Math.round(v / 1000))}k`}
                />
                <Tooltip
                  cursor={{ fill: theme.tonal, opacity: 0.5 }}
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-2xl bg-surface/95 px-4 py-3 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
                        <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-inkMuted">{label}</p>
                        <p className="text-sm text-inkSecondary">
                          Peak demand <span className="num-tabular font-semibold text-ink">{formatMW(p.peak_demand_mw)}</span>
                        </p>
                        <p className="text-sm text-inkSecondary">
                          Diversity <span className="num-tabular font-semibold text-ink">{p.diversity_factor.toFixed(2)}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="peak_demand_mw" radius={[10, 10, 4, 4]} maxBarSize={64}>
                  {diversity.map((d, i) => (
                    <Cell
                      key={d.region}
                      fill={i === 0 ? theme.brand : theme.brandBright}
                      fillOpacity={i === 0 ? 1 : 0.45 + (i / Math.max(diversity.length, 1)) * 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </ExpressiveCard>
    </div>
  );
}
