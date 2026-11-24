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
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getApiClient } from "../services/apiClient";
import { ModelMetricsResponse, ModelScore, FeatureImportanceItem, HoldoutPoint } from "../types/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Select } from "../components/Select";
import { KPICard } from "../components/KPICard";
import { Badge } from "../components/Badge";
import { formatMW, formatPercentage, formatNumber, formatTimestamp } from "../lib/utils";
import { TrendingUp, Award, Loader2, Brain } from "lucide-react";

const MODEL_COLORS: Record<string, string> = {
  XGBoost: "#F97316",
  RandomForest: "#10B981",
  Ridge: "#3B82F6",
  Naive24h: "#6B7280",
};

export function ModelTelemetryView() {
  const [data, setData] = useState<ModelMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("All_India");
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const apiClient = useMemo(() => getApiClient(), []);

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
    return () => { mounted = false; };
  }, [region, apiClient]);

  const xgboost = data?.models.find(m => m.model_name === "XGBoost");
  const bestModel = data?.models.reduce((best, m) => m.r2_score > best.r2_score ? m : best, data?.models[0]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primaryInk">Model Telemetry & Explainability</h1>
          <p className="text-mutedInk text-sm mt-1">
            Holdout benchmarks (Jul 16 – Aug 31, 2026) • SHAP feature importance • Backtest comparison
          </p>
        </div>
        <Badge variant={apiMode === "live" ? "success" : "warning"}>
          {apiMode === "live" ? "LIVE API" : "MOCK MODE"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Best Model"
          value={bestModel?.model_name || "—"}
          status="success"
          icon={<Award className="w-5 h-5" />}
        />
        <KPICard
          label="XGBoost R²"
          value={xgboost?.r2_score?.toFixed(4) || "—"}
          trend={xgboost ? { value: (xgboost.r2_score - 0.98) * 100, label: "vs Ridge" } : null}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          label="Peak Magnitude MAE"
          value={xgboost ? formatMW(xgboost.daily_peak_mae_mw) : "—"}
          icon={<Brain className="w-5 h-5" />}
        />
        <KPICard
          label="Peak Timing Hit Rate"
          value={xgboost ? formatPercentage(xgboost.peak_timing_hit_rate_1h_pct) : "—"}
          status="success"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <Card className="p-5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Region Selector</CardTitle>
          <Select
            label=""
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            options={[
              { value: "All_India", label: "All India" },
              { value: "NR", label: "Northern Region" },
              { value: "WR", label: "Western Region" },
              { value: "SR", label: "Southern Region" },
              { value: "ER", label: "Eastern Region" },
              { value: "NER", label: "North-Eastern Region" },
            ]}
            className="w-64"
          />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-mutedInk">
                  <th className="pb-3 pr-4 font-medium">Model</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">MAE (MW)</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">RMSE (MW)</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">MAPE (%)</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">R²</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">Daily Peak MAE (MW)</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">Peak MAPE (%)</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">Peak Timing Hit (±1h)</th>
                  <th className="pb-3 pr-4 font-medium num-tabular">Peak Alert F1</th>
                </tr>
              </thead>
              <tbody>
                {data?.models.map((model: ModelScore, i) => (
                  <tr
                    key={model.model_name}
                    className={`border-b border-hairline/50 hover:bg-surfaceHover/50 ${model.model_name === "XGBoost" ? "bg-gridOrange/5" : i % 2 === 0 ? "bg-surface/30" : ""}`}
                  >
                    <td className="py-3 pr-4 font-medium text-primaryInk flex items-center gap-2">
                      {model.model_name === "XGBoost" && <Badge variant="warning" size="sm">BEST</Badge>}
                      {model.model_name}
                    </td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatNumber(Math.round(model.mae_mw))}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatNumber(Math.round(model.rmse_mw))}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatPercentage(model.mape_pct, 3)}</td>
                    <td className="py-3 pr-4 num-tabular font-mono font-semibold">{model.r2_score.toFixed(4)}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatMW(model.daily_peak_mae_mw)}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatPercentage(model.daily_peak_mape_pct, 3)}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{formatPercentage(model.peak_timing_hit_rate_1h_pct)}</td>
                    <td className="py-3 pr-4 num-tabular font-mono">{model.peak_alert_f1.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SHAP Feature Importance (Top 12)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.feature_importances.slice(0, 12).reverse() || []}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#272A30" horizontal={false} />
                    <XAxis
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      tickFormatter={(val) => (val * 100).toFixed(1) + "%"}
                    />
                    <YAxis
                      dataKey="feature"
                      type="category"
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      width={180}
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg">
                              <p className="font-mono text-sm text-mutedInk mb-1">{label}</p>
                              <p className="text-sm">
                                <span className="font-mono">Importance:</span>{" "}
                                <span className="font-mono font-semibold">
                                  {(payload[0].value * 100).toFixed(1)}%
                                </span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="importance"
                      name="Importance"
                      radius={[0, 4, 4, 0]}
                    >
                      {data?.feature_importances.slice(0, 12).reverse().map((_, index) => (
                        <Cell key={`cell-${index}`} fill="#F97316" />
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
            <CardTitle>Actual vs Predicted (Holdout Sample)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-gridOrange" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data?.holdout_sample.slice(0, 48) || []}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#272A30" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "JetBrains Mono" }}
                      axisLine={{ stroke: "#272A30" }}
                      tickLine={false}
                      tickFormatter={(val) => formatTimestamp(val)}
                      interval={6}
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
                          return (
                            <div className="bg-surface border border-hairline rounded-lg p-3 shadow-lg min-w-[200px]">
                              <p className="font-mono text-sm text-mutedInk mb-2">{formatTimestamp(label)}</p>
                              {payload.map((entry: any) => (
                                <p key={entry.name} className="text-sm flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="font-mono">{entry.name}:</span>
                                  <span className="font-mono font-semibold">{formatMW(entry.value)}</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual_mw"
                      stroke="#F4F4F5"
                      strokeWidth={2}
                      dot={false}
                      name="Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="xgboost_mw"
                      stroke="#F97316"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="XGBoost"
                    />
                    <Line
                      type="monotone"
                      dataKey="ridge_mw"
                      stroke="#3B82F6"
                      strokeWidth={1.5}
                      dot={false}
                      name="Ridge"
                    />
                    <Line
                      type="monotone"
                      dataKey="naive_24h_mw"
                      stroke="#6B7280"
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                      dot={false}
                      name="Naive 24h"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-mutedInk flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-white" /> Actual
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-gridOrange border-t border-gridOrange" style={{ borderTopStyle: "dashed" }} /> XGBoost
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-500" /> Ridge
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-gray-500 border-t border-gray-500" style={{ borderTopStyle: "dashed" }} /> Naive 24h
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Training Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-mutedInk">Train Period</p>
              <p className="font-mono text-primaryInk">{data?.train_period || "—"}</p>
            </div>
            <div>
              <p className="text-mutedInk">Test Period</p>
              <p className="font-mono text-primaryInk">{data?.test_period || "—"}</p>
            </div>
            <div>
              <p className="text-mutedInk">Train / Test Rows</p>
              <p className="font-mono text-primaryInk">{data?.train_rows || "—"} / {data?.test_rows || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}