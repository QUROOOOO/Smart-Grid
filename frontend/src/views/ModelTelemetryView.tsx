import { motion } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { ModelMetricsResponse, ModelScore } from "../types/api";
import { ExpressiveCard, CardLabel } from "../components/ExpressiveCard";
import { ConnectedButtonGroup } from "../components/ConnectedButtonGroup";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { CircularTickRing } from "../components/ExpressiveGauges";
import {
  formatMW,
  formatPercentage,
  formatNumber,
  formatHourLabel,
  cn,
} from "../lib/utils";
import { useChartTheme } from "../lib/useChartTheme";
import { M3_SPRING_SLOW_SPATIAL } from "../lib/motion";
import { TrendingUp, Award, Loader2, Brain, Target, Activity } from "lucide-react";

const REGION_OPTIONS = [
  { value: "All_India", label: "India" },
  { value: "NR", label: "North" },
  { value: "WR", label: "West" },
  { value: "SR", label: "South" },
  { value: "ER", label: "East" },
  { value: "NER", label: "NE" },
];

const COLUMNS: { key: keyof ModelScore; label: string; format: (m: ModelScore) => string }[] = [
  { key: "mae_mw", label: "MAE (MW)", format: (m) => formatNumber(Math.round(m.mae_mw)) },
  { key: "rmse_mw", label: "RMSE (MW)", format: (m) => formatNumber(Math.round(m.rmse_mw)) },
  { key: "mape_pct", label: "MAPE", format: (m) => formatPercentage(m.mape_pct, 3) },
  { key: "r2_score", label: "R²", format: (m) => m.r2_score.toFixed(4) },
  { key: "daily_peak_mae_mw", label: "Peak MAE", format: (m) => formatMW(m.daily_peak_mae_mw) },
  { key: "daily_peak_mape_pct", label: "Peak MAPE", format: (m) => formatPercentage(m.daily_peak_mape_pct, 3) },
  { key: "peak_timing_hit_rate_1h_pct", label: "Timing ±1h", format: (m) => formatPercentage(m.peak_timing_hit_rate_1h_pct) },
  { key: "peak_alert_f1", label: "Alert F1", format: (m) => m.peak_alert_f1.toFixed(4) },
];

export function ModelTelemetryView() {
  const [data, setData] = useState<ModelMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("All_India");
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);
  const theme = useChartTheme();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiClient.modelMetrics(region).then((result) => {
      if (mounted) {
        setData(result);
        setApiMode(apiClient.getMode());
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [region, apiClient]);

  const xgboost = data?.models.find((m) => m.model_name === "XGBoost");
  const bestModel = data?.models.reduce(
    (best, m) => (m.r2_score > best.r2_score ? m : best),
    data?.models[0]
  );
  const shap = useMemo(
    () => (data?.feature_importances ?? []).slice(0, 12).reverse(),
    [data]
  );
  const holdout = useMemo(
    () =>
      (data?.holdout_sample ?? []).slice(0, 48).map((p) => ({
        ...p,
        label: formatHourLabel(p.timestamp),
      })),
    [data]
  );
  const maxImportance = shap.length ? Math.max(...shap.map((f) => f.importance)) : 1;

  return (
    <div className="space-y-5 m3-stagger">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight text-ink">
            Model Telemetry
          </h1>
          <p className="mt-1 text-sm text-inkMuted">
            Holdout benchmarks · SHAP explainability · backtest comparison
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"}>
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label="Active Model"
          value={bestModel?.model_name || "—"}
          emphasis="default"
          hint={bestModel ? `R² ${bestModel.r2_score.toFixed(4)}` : undefined}
          icon={<Award className="h-5 w-5" />}
        />
        <KPICard
          label="XGBoost R²"
          value={xgboost?.r2_score?.toFixed(4) || "—"}
          emphasis="tonal"
          trend={xgboost ? { value: (xgboost.r2_score - 0.98) * 100, label: "vs Ridge" } : null}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KPICard
          label="Peak Magnitude MAE"
          value={xgboost ? formatMW(xgboost.daily_peak_mae_mw) : "—"}
          emphasis="tonal"
          icon={<Brain className="h-5 w-5" />}
        />
        <KPICard
          label="Peak Timing Hit Rate"
          value={xgboost ? formatPercentage(xgboost.peak_timing_hit_rate_1h_pct) : "—"}
          emphasis="tonal"
          icon={<Target className="h-5 w-5" />}
        />
      </div>

      <ExpressiveCard variant="elevated" padding="lg">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>Benchmark Matrix</CardLabel>
            <p className="mt-1 text-sm text-inkMuted">
              {data?.train_period || "—"} → {data?.test_period || "—"} ·{" "}
              {formatNumber(data?.train_rows ?? 0)} train / {formatNumber(data?.test_rows ?? 0)} test rows
            </p>
          </div>
          <ConnectedButtonGroup
            options={REGION_OPTIONS}
            value={region}
            onChange={setRegion}
            size="sm"
            ariaLabel="Benchmark region"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borderSubtle/60 text-left">
                <th className="pb-3 pr-4 text-[11px] font-semibold uppercase tracking-wider text-inkMuted">
                  Model
                </th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.label}
                    className="pb-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-inkMuted"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.models.map((model) => {
                const active = model.model_name === "XGBoost";
                return (
                  <tr
                    key={model.model_name}
                    className={cn(
                      "border-b border-borderSubtle/40 transition-colors last:border-0",
                      active ? "bg-brandWash/70" : "hover:bg-surfaceHover/60"
                    )}
                  >
                    <td className="py-3.5 pr-4">
                      <span className="flex items-center gap-2 font-medium text-ink">
                        {model.model_name}
                        {active && (
                          <Badge variant="success" size="sm">
                            ACTIVE MODEL
                          </Badge>
                        )}
                      </span>
                    </td>
                    {COLUMNS.map((c) => (
                      <td
                        key={c.label}
                        className={cn(
                          "py-3.5 pr-4 text-right num-tabular text-inkSecondary",
                          active && "font-semibold text-ink"
                        )}
                      >
                        {c.format(model)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ExpressiveCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <ExpressiveCard variant="tonal" padding="lg" className="lg:col-span-2">
          <CardLabel>SHAP Feature Importance</CardLabel>
          <p className="mt-1 text-sm text-inkMuted">Top 12 drivers, normalised gain</p>
          <div className="mt-5 space-y-2.5">
            {loading ? (
              <div className="flex h-[320px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </div>
            ) : (
              shap.map((f, i) => {
                const pct = (f.importance / maxImportance) * 100;
                return (
                  <div key={f.feature} className="group">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs text-inkSecondary">{f.feature}</span>
                      <span className="num-tabular shrink-0 text-xs font-semibold text-ink">
                        {(f.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <motion.div
                        className="h-full rounded-full bg-brand dark:bg-brandVivid"
                        initial={false}
                        animate={{ width: `${pct}%`, opacity: 1 - i * 0.055 }}
                        transition={M3_SPRING_SLOW_SPATIAL}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ExpressiveCard>

        <ExpressiveCard variant="elevated" padding="lg" className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardLabel>Actual vs Predicted</CardLabel>
              <p className="mt-1 text-sm text-inkMuted">Holdout sample · first 48 hours</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-inkMuted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: theme.ink }} />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: theme.brand }}
                />
                XGBoost
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: theme.brandVivid }} />
                Ridge
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-full" style={{ background: theme.tonal }} />
                Naive 24h
              </span>
            </div>
          </div>
          <div className="h-[330px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={holdout} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="2 6" stroke={theme.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.muted, fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    tick={{ fill: theme.muted, fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(val) => formatNumber(Math.round(val / 1000)) + "k"}
                  />
                  <Tooltip
                    cursor={{ stroke: theme.muted, strokeDasharray: "3 4" }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload;
                      return (
                        <div className="rounded-2xl bg-surface/95 p-3 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
                          <p className="num-tabular mb-2 text-xs font-semibold text-ink">
                            {formatHourLabel(point.timestamp)}
                          </p>
                          {payload.map((entry: any) => (
                            <p
                              key={entry.name}
                              className="flex items-center justify-between gap-4 text-xs text-inkSecondary"
                            >
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ background: entry.color }}
                                />
                                {entry.name}
                              </span>
                              <span className="num-tabular font-semibold text-ink">
                                {formatMW(entry.value)}
                              </span>
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual_mw"
                    stroke={theme.ink}
                    strokeWidth={2.5}
                    dot={false}
                    name="Actual"
                  />
                  <Line
                    type="monotone"
                    dataKey="xgboost_mw"
                    stroke={theme.brand}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    name="XGBoost"
                  />
                  <Line
                    type="monotone"
                    dataKey="ridge_mw"
                    stroke={theme.brandVivid}
                    strokeWidth={1.5}
                    dot={false}
                    name="Ridge"
                  />
                  <Line
                    type="monotone"
                    dataKey="naive_24h_mw"
                    stroke={theme.tonal}
                    strokeWidth={1.5}
                    strokeDasharray="2 3"
                    dot={false}
                    name="Naive 24h"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ExpressiveCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ExpressiveCard variant="obsidian" padding="lg">
          <CardLabel className="text-canvas/60">Peak Timing</CardLabel>
          <div className="mt-4 flex items-center gap-5">
            <CircularTickRing
              value={xgboost?.peak_timing_hit_rate_1h_pct ?? 0}
              size={150}
              strokeWidth={9}
              ticks={36}
              label="±1h"
              caption="hit rate"
              tone="brand"
            />
            <div className="space-y-3">
              <div>
                <p className="num-tabular font-display text-2xl font-extrabold text-canvas">
                  {formatPercentage(xgboost?.peak_timing_hit_rate_1h_pct ?? 0)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-canvas/60">
                  Peak timing accuracy
                </p>
              </div>
              <div>
                <p className="num-tabular font-display text-2xl font-extrabold text-canvas">
                  {formatMW(xgboost?.daily_peak_mae_mw ?? 0)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-canvas/60">
                  Daily peak MAE
                </p>
              </div>
            </div>
          </div>
        </ExpressiveCard>

        <ExpressiveCard variant="tonal" padding="lg" className="lg:col-span-2">
          <CardLabel>Benchmark Delta</CardLabel>
          <p className="mt-1 text-sm text-inkMuted">
            XGBoost error against each baseline (lower is better)
          </p>
          <div className="mt-5 h-[190px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.models ?? []}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="2 6" stroke={theme.grid} />
                  <XAxis
                    dataKey="model_name"
                    tick={{ fill: theme.muted, fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: theme.muted, fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(val) => formatNumber(Math.round(val / 1000)) + "k"}
                  />
                  <Tooltip
                    cursor={{ fill: theme.grid, opacity: 0.4 }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const m = payload[0].payload as ModelScore;
                      return (
                        <div className="rounded-2xl bg-surface/95 p-3 shadow-lifted ring-1 ring-borderSubtle/70 backdrop-blur">
                          <p className="mb-1.5 text-xs font-semibold text-ink">{m.model_name}</p>
                          <p className="num-tabular text-xs text-inkSecondary">
                            MAE {formatMW(m.mae_mw)}
                          </p>
                          <p className="num-tabular text-xs text-inkSecondary">
                            R² {m.r2_score.toFixed(4)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="mae_mw" radius={[10, 10, 4, 4]} maxBarSize={64}>
                    {(data?.models ?? []).map((m) => (
                      <Cell
                        key={m.model_name}
                        fill={m.model_name === "XGBoost" ? theme.brand : theme.brandBright}
                        opacity={m.model_name === "XGBoost" ? 1 : 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-inkMuted">
            <Activity className="h-3.5 w-3.5" />
            Mean absolute error on the holdout window, all entities
          </div>
        </ExpressiveCard>
      </div>
    </div>
  );
}
