import {
  HealthResponse,
  RegionsResponse,
  CEASummaryResponse,
  DatasetAuditResponse,
  ModelMetricsResponse,
  ForecastResponse,
  ForecastRequest,
  PeakChargingResponse,
  PeakChargingRequest,
  CarbonScorecardResponse,
  CarbonScorecardRequest,
  ApiMode,
  ApiClientConfig,
  ForecastPoint,
  EntityMetadata,
  MonthlyCEARecord,
  ChargingHourPoint,
  LoadShiftRecommendation,
  CarbonHourPoint,
  CarbonScorecardSummary,
} from "../types/api";

const DEFAULT_BASE_URL = "http://localhost:8000";
const REQUEST_TIMEOUT = 5000;

class ApiClient {
  private baseUrl: string;
  private mode: ApiMode;
  private onModeChange?: (mode: ApiMode) => void;
  private abortController: AbortController | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.mode = config.mode;
    this.onModeChange = config.onModeChange;
  }

  getMode(): ApiMode {
    return this.mode;
  }

  setMode(mode: ApiMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.onModeChange?.(mode);
    }
  }

  private async fetchWithTimeout<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    this.abortController = new AbortController();
    const timeoutId = setTimeout(() => this.abortController?.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: this.abortController.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async tryLiveApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    return this.fetchWithTimeout<T>(url, options);
  }

  async health(): Promise<HealthResponse> {
    if (this.mode === "mock") {
      return this.mockHealth();
    }
    try {
      const result = await this.tryLiveApi<HealthResponse>("/api/v1/health");
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockHealth();
    }
  }

  async regions(): Promise<RegionsResponse> {
    if (this.mode === "mock") {
      return this.mockRegions();
    }
    try {
      const result = await this.tryLiveApi<RegionsResponse>("/api/v1/regions");
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockRegions();
    }
  }

  async ceaSummary(entity: string = "All_India"): Promise<CEASummaryResponse> {
    if (this.mode === "mock") {
      return this.mockCeaSummary(entity);
    }
    try {
      const result = await this.tryLiveApi<CEASummaryResponse>(`/api/v1/cea/summary?entity=${encodeURIComponent(entity)}`);
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockCeaSummary(entity);
    }
  }

  async datasetAudit(region: string = "All_India"): Promise<DatasetAuditResponse> {
    if (this.mode === "mock") {
      return this.mockDatasetAudit(region);
    }
    try {
      const result = await this.tryLiveApi<DatasetAuditResponse>(`/api/v1/dataset/audit?region=${encodeURIComponent(region)}`);
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockDatasetAudit(region);
    }
  }

  async modelMetrics(region: string = "All_India"): Promise<ModelMetricsResponse> {
    if (this.mode === "mock") {
      return this.mockModelMetrics(region);
    }
    try {
      const result = await this.tryLiveApi<ModelMetricsResponse>(`/api/v1/models/metrics?region=${encodeURIComponent(region)}`);
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockModelMetrics(region);
    }
  }

  async forecast(request: ForecastRequest): Promise<ForecastResponse> {
    if (this.mode === "mock") {
      return this.mockForecast(request);
    }
    try {
      const result = await this.tryLiveApi<ForecastResponse>("/api/v1/forecast", {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockForecast(request);
    }
  }

  async peakCharging(request: PeakChargingRequest): Promise<PeakChargingResponse> {
    if (this.mode === "mock") {
      return this.mockPeakCharging(request);
    }
    try {
      const result = await this.tryLiveApi<PeakChargingResponse>("/api/v1/analytics/peak-charging", {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockPeakCharging(request);
    }
  }

  async carbonScorecard(request: CarbonScorecardRequest): Promise<CarbonScorecardResponse> {
    if (this.mode === "mock") {
      return this.mockCarbonScorecard(request);
    }
    try {
      const result = await this.tryLiveApi<CarbonScorecardResponse>("/api/v1/analytics/carbon-scorecard", {
        method: "POST",
        body: JSON.stringify(request),
      });
      if (this.mode !== "live") this.setMode("live");
      return result;
    } catch {
      this.setMode("mock");
      return this.mockCarbonScorecard(request);
    }
  }

  // Mock data generators
  private mockHealth(): HealthResponse {
    return {
      status: "ok",
      models_ready: true,
      cea_months_loaded: ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
      total_states_tracked: 36,
      macro_entities: ["All_India", "NR", "WR", "SR", "ER", "NER"],
      dataset_rows: 34992,
      version: "1.0.0",
    };
  }

  private mockRegions(): RegionsResponse {
    const macroEntities: EntityMetadata[] = [
      { id: "All_India", name: "All India", level: "national", parent_region: null, latest_peak_demand_mw: 270832, max_2026_peak_demand_mw: 270832, max_2026_peak_month: "2026-05", max_shortage_mw: 12, max_shortage_pct: 0.0 },
      { id: "NR", name: "Northern Region", level: "region", parent_region: "All_India", latest_peak_demand_mw: 76000, max_2026_peak_demand_mw: 80000, max_2026_peak_month: "2026-06", max_shortage_mw: 500, max_shortage_pct: 0.6 },
      { id: "WR", name: "Western Region", level: "region", parent_region: "All_India", latest_peak_demand_mw: 72000, max_2026_peak_demand_mw: 75000, max_2026_peak_month: "2026-05", max_shortage_mw: 100, max_shortage_pct: 0.1 },
      { id: "SR", name: "Southern Region", level: "region", parent_region: "All_India", latest_peak_demand_mw: 65000, max_2026_peak_demand_mw: 68000, max_2026_peak_month: "2026-04", max_shortage_mw: 50, max_shortage_pct: 0.1 },
      { id: "ER", name: "Eastern Region", level: "region", parent_region: "All_India", latest_peak_demand_mw: 30000, max_2026_peak_demand_mw: 32000, max_2026_peak_month: "2026-05", max_shortage_mw: 200, max_shortage_pct: 0.6 },
      { id: "NER", name: "North-Eastern Region", level: "region", parent_region: "All_India", latest_peak_demand_mw: 3500, max_2026_peak_demand_mw: 4000, max_2026_peak_month: "2026-06", max_shortage_mw: 100, max_shortage_pct: 2.5 },
    ];

    const states: EntityMetadata[] = [
      { id: "Karnataka", name: "Karnataka", level: "state", parent_region: "SR", latest_peak_demand_mw: 17700, max_2026_peak_demand_mw: 18655, max_2026_peak_month: "2026-03", max_shortage_mw: 13, max_shortage_pct: 0.1 },
      { id: "Maharashtra", name: "Maharashtra", level: "state", parent_region: "WR", latest_peak_demand_mw: 30782, max_2026_peak_demand_mw: 32430, max_2026_peak_month: "2026-05", max_shortage_mw: 113, max_shortage_pct: 0.3 },
      { id: "Gujarat", name: "Gujarat", level: "state", parent_region: "WR", latest_peak_demand_mw: 25495, max_2026_peak_demand_mw: 28853, max_2026_peak_month: "2026-06", max_shortage_mw: 37, max_shortage_pct: 0.1 },
      { id: "Tamil Nadu", name: "Tamil Nadu", level: "state", parent_region: "SR", latest_peak_demand_mw: 17348, max_2026_peak_demand_mw: 21000, max_2026_peak_month: "2026-04", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Uttar Pradesh", name: "Uttar Pradesh", level: "state", parent_region: "NR", latest_peak_demand_mw: 23976, max_2026_peak_demand_mw: 33197, max_2026_peak_month: "2026-06", max_shortage_mw: 524, max_shortage_pct: 1.6 },
      { id: "Rajasthan", name: "Rajasthan", level: "state", parent_region: "NR", latest_peak_demand_mw: 19617, max_2026_peak_demand_mw: 19617, max_2026_peak_month: "2026-01", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Madhya Pradesh", name: "Madhya Pradesh", level: "state", parent_region: "WR", latest_peak_demand_mw: 19902, max_2026_peak_demand_mw: 19221, max_2026_peak_month: "2026-02", max_shortage_mw: 34, max_shortage_pct: 0.2 },
      { id: "Andhra Pradesh", name: "Andhra Pradesh", level: "state", parent_region: "SR", latest_peak_demand_mw: 12622, max_2026_peak_demand_mw: 15019, max_2026_peak_month: "2026-05", max_shortage_mw: 5, max_shortage_pct: 0.0 },
      { id: "Telangana", name: "Telangana", level: "state", parent_region: "SR", latest_peak_demand_mw: 16048, max_2026_peak_demand_mw: 18548, max_2026_peak_month: "2026-03", max_shortage_mw: 11, max_shortage_pct: 0.1 },
      { id: "Punjab", name: "Punjab", level: "state", parent_region: "NR", latest_peak_demand_mw: 10661, max_2026_peak_demand_mw: 17672, max_2026_peak_month: "2026-06", max_shortage_mw: 655, max_shortage_pct: 3.7 },
      { id: "Haryana", name: "Haryana", level: "state", parent_region: "NR", latest_peak_demand_mw: 10156, max_2026_peak_demand_mw: 15558, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "West Bengal", name: "West Bengal", level: "state", parent_region: "ER", latest_peak_demand_mw: 8252, max_2026_peak_demand_mw: 13570, max_2026_peak_month: "2026-06", max_shortage_mw: 77, max_shortage_pct: 0.6 },
      { id: "Delhi", name: "Delhi", level: "state", parent_region: "NR", latest_peak_demand_mw: 6087, max_2026_peak_demand_mw: 8439, max_2026_peak_month: "2026-05", max_shortage_mw: 4, max_shortage_pct: 0.1 },
      { id: "Bihar", name: "Bihar", level: "state", parent_region: "ER", latest_peak_demand_mw: 6535, max_2026_peak_demand_mw: 8917, max_2026_peak_month: "2026-06", max_shortage_mw: 18, max_shortage_pct: 0.2 },
      { id: "Odisha", name: "Odisha", level: "state", parent_region: "ER", latest_peak_demand_mw: 5500, max_2026_peak_demand_mw: 8829, max_2026_peak_month: "2026-05", max_shortage_mw: 17, max_shortage_pct: 0.3 },
      { id: "Chhattisgarh", name: "Chhattisgarh", level: "state", parent_region: "WR", latest_peak_demand_mw: 5849, max_2026_peak_demand_mw: 7080, max_2026_peak_month: "2026-04", max_shortage_mw: 2, max_shortage_pct: 0.0 },
      { id: "Kerala", name: "Kerala", level: "state", parent_region: "SR", latest_peak_demand_mw: 4768, max_2026_peak_demand_mw: 6488, max_2026_peak_month: "2026-04", max_shortage_mw: 310, max_shortage_pct: 4.8 },
      { id: "Jharkhand", name: "Jharkhand", level: "state", parent_region: "ER", latest_peak_demand_mw: 2255, max_2026_peak_demand_mw: 2589, max_2026_peak_month: "2026-05", max_shortage_mw: 3, max_shortage_pct: 0.1 },
      { id: "Assam", name: "Assam", level: "state", parent_region: "NER", latest_peak_demand_mw: 1635, max_2026_peak_demand_mw: 2680, max_2026_peak_month: "2026-06", max_shortage_mw: 28, max_shortage_pct: 1.2 },
      { id: "Himachal Pradesh", name: "Himachal Pradesh", level: "state", parent_region: "NR", latest_peak_demand_mw: 2310, max_2026_peak_demand_mw: 2228, max_2026_peak_month: "2026-02", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "UT of J&K and Ladakh", name: "UT of J&K and Ladakh", level: "state", parent_region: "NR", latest_peak_demand_mw: 3325, max_2026_peak_demand_mw: 3242, max_2026_peak_month: "2026-03", max_shortage_mw: 71, max_shortage_pct: 2.5 },
      { id: "Uttarakhand", name: "Uttarakhand", level: "state", parent_region: "NR", latest_peak_demand_mw: 2766, max_2026_peak_demand_mw: 3078, max_2026_peak_month: "2026-06", max_shortage_mw: 15, max_shortage_pct: 0.5 },
      { id: "Goa", name: "Goa", level: "state", parent_region: "WR", latest_peak_demand_mw: 756, max_2026_peak_demand_mw: 891, max_2026_peak_month: "2026-04", max_shortage_mw: 1, max_shortage_pct: 0.1 },
      { id: "Puducherry", name: "Puducherry", level: "state", parent_region: "SR", latest_peak_demand_mw: 481, max_2026_peak_demand_mw: 584, max_2026_peak_month: "2026-06", max_shortage_mw: 5, max_shortage_pct: 0.9 },
      { id: "DVC", name: "DVC", level: "state", parent_region: "ER", latest_peak_demand_mw: 3532, max_2026_peak_demand_mw: 3676, max_2026_peak_month: "2026-04", max_shortage_mw: 9, max_shortage_pct: 0.3 },
      { id: "Dadra and Nagar Haveli and Daman and Diu", name: "Dadra and Nagar Haveli and Daman and Diu", level: "state", parent_region: "WR", latest_peak_demand_mw: 1389, max_2026_peak_demand_mw: 1427, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Chandigarh", name: "Chandigarh", level: "state", parent_region: "NR", latest_peak_demand_mw: 340, max_2026_peak_demand_mw: 456, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Sikkim", name: "Sikkim", level: "state", parent_region: "ER", latest_peak_demand_mw: 126, max_2026_peak_demand_mw: 125, max_2026_peak_month: "2026-02", max_shortage_mw: 1, max_shortage_pct: 0.8 },
      { id: "Tripura", name: "Tripura", level: "state", parent_region: "NER", latest_peak_demand_mw: 237, max_2026_peak_demand_mw: 366, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Manipur", name: "Manipur", level: "state", parent_region: "NER", latest_peak_demand_mw: 277, max_2026_peak_demand_mw: 264, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Meghalaya", name: "Meghalaya", level: "state", parent_region: "NER", latest_peak_demand_mw: 374, max_2026_peak_demand_mw: 368, max_2026_peak_month: "2026-02", max_shortage_mw: 1, max_shortage_pct: 0.3 },
      { id: "Nagaland", name: "Nagaland", level: "state", parent_region: "NER", latest_peak_demand_mw: 177, max_2026_peak_demand_mw: 204, max_2026_peak_month: "2026-06", max_shortage_mw: 14, max_shortage_pct: 7.2 },
      { id: "Arunachal Pradesh", name: "Arunachal Pradesh", level: "state", parent_region: "NER", latest_peak_demand_mw: 190, max_2026_peak_demand_mw: 202, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Mizoram", name: "Mizoram", level: "state", parent_region: "NER", latest_peak_demand_mw: 182, max_2026_peak_demand_mw: 155, max_2026_peak_month: "2026-06", max_shortage_mw: 0, max_shortage_pct: 0.0 },
      { id: "Andaman and Nicobar", name: "Andaman and Nicobar", level: "state", parent_region: "ER", latest_peak_demand_mw: 66, max_2026_peak_demand_mw: 73, max_2026_peak_month: "2026-04", max_shortage_mw: 6, max_shortage_pct: 8.2 },
      { id: "Lakshadweep", name: "Lakshadweep", level: "state", parent_region: "SR", latest_peak_demand_mw: 13, max_2026_peak_demand_mw: 14, max_2026_peak_month: "2026-03", max_shortage_mw: 0, max_shortage_pct: 0.0 },
    ];

    return { macro_entities: macroEntities, states };
  }

  private mockCeaSummary(entity: string): CEASummaryResponse {
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
    const monthlySeries: MonthlyCEARecord[] = months.map((m, i) => {
      const peaks: Record<string, number> = {
        "2026-01": 245444, "2026-02": 244209, "2026-03": 238379, "2026-04": 256117,
        "2026-05": 270832, "2026-06": 264768, "2026-07": 270209, "2026-08": 258276,
      };
      const met: Record<string, number> = {
        "2026-01": 245416, "2026-02": 244206, "2026-03": 238378, "2026-04": 256117,
        "2026-05": 270820, "2026-06": 264768, "2026-07": 270203, "2026-08": 258270,
      };
      const peak = peaks[m] || 245000;
      const peakMet = met[m] || 245000;
      return {
        month: m,
        month_label: new Date(m + "-01").toLocaleString("en-US", { month: "long", year: "numeric" }),
        peak_demand_mw: peak,
        peak_met_mw: peakMet,
        demand_not_met_mw: peak - peakMet,
        demand_not_met_pct: ((peak - peakMet) / peak) * 100,
        source_file: `CEA_${m}.pdf`,
      };
    });

    return {
      entity_id: entity,
      entity_name: entity === "All_India" ? "All India" : entity,
      level: entity === "All_India" ? "national" : entity.includes("Region") ? "region" : "state",
      monthly_series: monthlySeries,
      regional_diversity: [
        { region: "NR", peak_demand_mw: 76000, diversity_factor: 0.92 },
        { region: "WR", peak_demand_mw: 72000, diversity_factor: 0.94 },
        { region: "SR", peak_demand_mw: 65000, diversity_factor: 0.96 },
        { region: "ER", peak_demand_mw: 30000, diversity_factor: 0.98 },
        { region: "NER", peak_demand_mw: 3500, diversity_factor: 0.99 },
      ],
      top_shortage_events: [
        { month: "2026-05", entity_id: "Uttar Pradesh", entity_name: "Uttar Pradesh", region: "NR", peak_demand_mw: 31824, peak_met_mw: 31824, demand_not_met_mw: 0, demand_not_met_pct: 0 },
        { month: "2026-06", entity_id: "Punjab", entity_name: "Punjab", region: "NR", peak_demand_mw: 17672, peak_met_mw: 17017, demand_not_met_mw: 655, demand_not_met_pct: 3.7 },
        { month: "2026-04", entity_id: "Uttar Pradesh", entity_name: "Uttar Pradesh", region: "NR", peak_demand_mw: 29932, peak_met_mw: 29475, demand_not_met_mw: 457, demand_not_met_pct: 1.5 },
      ],
      data_quality_notes: ["CEA data covers Jan-Aug 2026", "All 36 states/UTs tracked", "Regional diversity calculated from non-coincident peaks"],
    };
  }

  private mockDatasetAudit(region: string): DatasetAuditResponse {
    return {
      region,
      rows: 5832,
      columns: 9,
      start_timestamp: "2026-01-01T00:00:00",
      end_timestamp: "2026-08-31T23:00:00",
      frequency: "1H",
      missing_values: { temperature_2m: 0, relative_humidity_2m: 0, apparent_temperature: 0, wind_speed_10m: 0, shortwave_radiation: 0, precipitation: 0, load_mw: 0 },
      duplicate_timestamps: 0,
      load_stats_mw: { mean: 204732.27, std: 31292.89, min: 128974.26, max: 270832.0, p50: 212777.89, p95: 247556.26 },
      weather_stats: {
        temperature_2m: { mean: 26.5, std: 7.2, min: 10.2, max: 42.8 },
        relative_humidity_2m: { mean: 65.2, std: 18.5, min: 15.0, max: 98.0 },
      },
      weather_load_correlations: { temperature_2m: 0.4621, relative_humidity_2m: -0.4316, apparent_temperature: 0.4070, wind_speed_10m: 0.3804, shortwave_radiation: 0.3728, precipitation: 0.0065 },
      cea_peak_calibration_check: [{ month: "2026-05", cea_peak_mw: 270832, model_peak_mw: 270832, error_mw: 0.0 }],
      audit_observations: ["Zero missing values", "Zero duplicate timestamps", "CEA peak calibration error < 0.5 MW"],
    };
  }

  private mockModelMetrics(region: string): ModelMetricsResponse {
    return {
      region,
      train_period: "2026-01-08 to 2026-07-15",
      test_period: "2026-07-16 to 2026-08-31",
      train_rows: 4536,
      test_rows: 1128,
      models: [
        { model_name: "XGBoost", mae_mw: 2292.8, rmse_mw: 2971.3, mape_pct: 1.109, r2_score: 0.9909, daily_peak_mae_mw: 1850, daily_peak_mape_pct: 0.794, peak_timing_hit_rate_1h_pct: 97.9, peak_alert_f1: 0.9113 },
        { model_name: "RandomForest", mae_mw: 2859.19, rmse_mw: 3702.08, mape_pct: 1.377, r2_score: 0.9858, daily_peak_mae_mw: 2100, daily_peak_mape_pct: 0.948, peak_timing_hit_rate_1h_pct: 97.9, peak_alert_f1: 0.8682 },
        { model_name: "Ridge", mae_mw: 3240.12, rmse_mw: 4196.16, mape_pct: 1.599, r2_score: 0.9818, daily_peak_mae_mw: 2400, daily_peak_mape_pct: 1.06, peak_timing_hit_rate_1h_pct: 97.9, peak_alert_f1: 0.8916 },
        { model_name: "Naive24h", mae_mw: 6512.7, rmse_mw: 8277.4, mape_pct: 3.178, r2_score: 0.929, daily_peak_mae_mw: 4800, daily_peak_mape_pct: 2.668, peak_timing_hit_rate_1h_pct: 97.9, peak_alert_f1: 0.7449 },
      ],
      feature_importances: [
        { feature: "load_lag_24h", importance: 0.285 },
        { feature: "load_lag_168h", importance: 0.192 },
        { feature: "hour_sin", importance: 0.145 },
        { feature: "temperature_2m", importance: 0.112 },
        { feature: "cdh_24", importance: 0.089 },
        { feature: "load_rolling_mean_24h", importance: 0.067 },
        { feature: "dow_sin", importance: 0.042 },
        { feature: "relative_humidity_2m", importance: 0.031 },
        { feature: "shortwave_radiation", importance: 0.018 },
        { feature: "temp_x_evening", importance: 0.012 },
        { feature: "load_lag_48h", importance: 0.004 },
        { feature: "precipitation", importance: 0.001 },
      ],
      holdout_sample: Array.from({ length: 24 }, (_, i) => {
        const base = 200000 + Math.sin(i / 24 * 2 * Math.PI) * 30000;
        return {
          timestamp: new Date(Date.now() + i * 3600000).toISOString(),
          actual_mw: base + (Math.random() - 0.5) * 5000,
          xgboost_mw: base + (Math.random() - 0.5) * 3000,
          ridge_mw: base + (Math.random() - 0.5) * 5000,
          naive_24h_mw: base + (Math.random() - 0.5) * 8000,
        };
      }),
    };
  }

  private generateMockForecastPoints(entity: string, horizonHours: number, tempDelta: number, humidityDelta: number): ForecastPoint[] {
    const capacityRef = entity === "All_India" ? 280000 : 80000;
    const peakThreshold = capacityRef * 0.92;
    const now = new Date();
    now.setMinutes(0, 0, 0);

    return Array.from({ length: horizonHours }, (_, i) => {
      const hour = new Date(now.getTime() + i * 3600000);
      const h = hour.getHours();
      const isWeekend = hour.getDay() === 0 || hour.getDay() === 6;

      let baseLoad = capacityRef * 0.65;
      if (h >= 6 && h <= 10) baseLoad += capacityRef * 0.15; // morning ramp
      if (h >= 18 && h <= 22) baseLoad += capacityRef * 0.25; // evening peak
      if (h >= 10 && h <= 16) baseLoad -= capacityRef * 0.1; // solar dip

      const tempEffect = tempDelta * 1500;
      const humidityEffect = humidityDelta * 200;

      const predicted = baseLoad + tempEffect + humidityEffect + (Math.random() - 0.5) * 5000;
      const lower = predicted - 8000 - i * 50;
      const upper = predicted + 8000 + i * 50;

      return {
        timestamp: hour.toISOString(),
        predicted_mw: Math.round(predicted),
        lower_bound_mw: Math.round(lower),
        upper_bound_mw: Math.round(upper),
        temperature_c: 28 + tempDelta + Math.sin(h / 24 * 2 * Math.PI) * 5,
        apparent_temp_c: 30 + tempDelta + Math.sin(h / 24 * 2 * Math.PI) * 5,
        relative_humidity_pct: 65 + humidityDelta + Math.cos(h / 24 * 2 * Math.PI) * 15,
        shortwave_radiation_wm2: h >= 6 && h <= 18 ? 600 * Math.sin((h - 6) / 12 * Math.PI) : 0,
        precipitation_mm: 0,
        utilization_pct: (predicted / capacityRef) * 100,
        is_flagged_peak: predicted >= peakThreshold,
      };
    });
  }

  private mockForecast(request: ForecastRequest): ForecastResponse {
    const points = this.generateMockForecastPoints(request.entity, request.horizon_hours, request.temp_delta_c, request.humidity_delta_pct);
    const predictedPeak = Math.max(...points.map(p => p.predicted_mw));
    const predictedPeakPoint = points.find(p => p.predicted_mw === predictedPeak)!;
    const capacityRef = request.entity === "All_India" ? 280000 : 80000;

    return {
      entity_id: request.entity,
      entity_name: request.entity === "All_India" ? "All India" : request.entity,
      parent_region: "All_India",
      horizon_hours: request.horizon_hours,
      weather_source: "mock",
      temp_delta_c: request.temp_delta_c,
      humidity_delta_pct: request.humidity_delta_pct,
      capacity_reference_mw: capacityRef,
      peak_threshold_mw: capacityRef * 0.92,
      predicted_peak_mw: predictedPeak,
      predicted_peak_timestamp: predictedPeakPoint.timestamp,
      predicted_min_mw: Math.min(...points.map(p => p.predicted_mw)),
      avg_load_mw: points.reduce((a, b) => a + b.predicted_mw, 0) / points.length,
      flagged_peak_hours: points.filter(p => p.is_flagged_peak).length,
      points,
    };
  }

  private mockPeakCharging(request: PeakChargingRequest): PeakChargingResponse {
    const forecast = this.mockForecast({
      entity: request.entity,
      horizon_hours: request.horizon_hours,
      temp_delta_c: request.temp_delta_c,
      humidity_delta_pct: request.humidity_delta_pct,
    });

    const hourlySchedule: ChargingHourPoint[] = forecast.points.map(p => {
      let tariffZone: ChargingHourPoint["tariff_zone"] = "normal";
      let multiplier = 1.0;
      const hour = new Date(p.timestamp).getHours();

      if (p.utilization_pct >= 92) {
        tariffZone = "critical_surge";
        multiplier = 1.3;
      } else if (hour >= 9 && hour <= 15) {
        tariffZone = "solar_rebate";
        multiplier = 0.85;
      } else if (hour >= 6 && hour <= 8) {
        tariffZone = "morning_ramp";
        multiplier = 1.1;
      } else if (hour >= 18 && hour <= 21) {
        tariffZone = "evening_peak";
        multiplier = 1.2;
      }

      return {
        timestamp: p.timestamp,
        predicted_grid_mw: p.predicted_mw,
        utilization_pct: p.utilization_pct,
        tariff_zone: tariffZone,
        tariff_multiplier: multiplier,
        effective_tariff_inr_kwh: request.base_tariff_inr * multiplier,
        grid_stress_status: p.utilization_pct >= 92 ? "critical_peak" : p.utilization_pct >= 80 ? "elevated" : "normal",
      };
    });

    const baselineCost = hourlySchedule.reduce((sum, h) => sum + request.shiftable_mw * h.effective_tariff_inr_kwh, 0);
    const sortedByCost = [...hourlySchedule].sort((a, b) => b.effective_tariff_inr_kwh - a.effective_tariff_inr_kwh);
    const solarHours = hourlySchedule.filter(h => h.tariff_zone === "solar_rebate");
    const peakHours = hourlySchedule.filter(h => h.tariff_zone === "evening_peak" || h.tariff_zone === "critical_surge");

    let optimizedCost = 0;
    let shiftableRemaining = request.shiftable_mw;

    for (const hour of hourlySchedule) {
      if (shiftableRemaining > 0 && (hour.tariff_zone === "evening_peak" || hour.tariff_zone === "critical_surge")) {
        const solarHour = solarHours.find(s => new Date(s.timestamp).getDate() === new Date(hour.timestamp).getDate());
        if (solarHour) {
          optimizedCost += shiftableRemaining * solarHour.effective_tariff_inr_kwh;
          shiftableRemaining = 0;
        }
      }
      if (shiftableRemaining > 0) {
        optimizedCost += shiftableRemaining * hour.effective_tariff_inr_kwh;
      }
    }

    const recommendations: LoadShiftRecommendation[] = [];
    const dates = new Set(hourlySchedule.map(h => new Date(h.timestamp).toDateString()));

    for (const dateStr of dates) {
      const dayPeak = hourlySchedule
        .filter(h => new Date(h.timestamp).toDateString() === dateStr)
        .sort((a, b) => b.effective_tariff_inr_kwh - a.effective_tariff_inr_kwh)[0];
      const daySolar = hourlySchedule
        .filter(h => new Date(h.timestamp).toDateString() === dateStr && h.tariff_zone === "solar_rebate")
        .sort((a, b) => a.effective_tariff_inr_kwh - b.effective_tariff_inr_kwh)[0];

      if (dayPeak && daySolar && request.shiftable_mw > 0) {
        const shifted = Math.min(request.shiftable_mw, 5);
        recommendations.push({
          date: dateStr,
          from_peak_hour: new Date(dayPeak.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          to_solar_hour: new Date(daySolar.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          shifted_mw: shifted,
          from_tariff_inr_kwh: dayPeak.effective_tariff_inr_kwh,
          to_tariff_inr_kwh: daySolar.effective_tariff_inr_kwh,
          estimated_savings_inr: shifted * (dayPeak.effective_tariff_inr_kwh - daySolar.effective_tariff_inr_kwh),
        });
      }
    }

    return {
      entity_id: request.entity,
      entity_name: request.entity === "All_India" ? "All India" : request.entity,
      horizon_hours: request.horizon_hours,
      base_tariff_inr_kwh: request.base_tariff_inr,
      shiftable_mw: request.shiftable_mw,
      total_baseline_cost_inr: Math.round(baselineCost),
      total_optimized_cost_inr: Math.round(optimizedCost),
      total_savings_inr: Math.round(baselineCost - optimizedCost),
      savings_pct: ((baselineCost - optimizedCost) / baselineCost) * 100,
      critical_surge_hours: hourlySchedule.filter(h => h.tariff_zone === "critical_surge").length,
      solar_rebate_hours: hourlySchedule.filter(h => h.tariff_zone === "solar_rebate").length,
      hourly_schedule: hourlySchedule,
      recommendations,
    };
  }

  private mockCarbonScorecard(request: CarbonScorecardRequest): CarbonScorecardResponse {
    const forecast = this.mockForecast({
      entity: request.entity,
      horizon_hours: request.horizon_hours,
      temp_delta_c: request.temp_delta_c,
      humidity_delta_pct: request.humidity_delta_pct,
    });

    const hourlyBreakdown: CarbonHourPoint[] = forecast.points.map(p => {
      const hour = new Date(p.timestamp).getHours();
      const baseEf = 0.716;
      const solarEffect = hour >= 10 && hour <= 14 ? -0.15 : 0;
      const peakEffect = hour >= 18 && hour <= 22 ? 0.25 : 0;
      const stressEffect = p.utilization_pct >= 92 ? 0.15 : 0;

      const gridEf = Math.max(0.54, Math.min(0.96, baseEf + solarEffect + peakEffect));
      const marginalEf = hour >= 18 && hour <= 22 ? 0.94 : p.utilization_pct >= 92 ? 1.04 : 0.75;

      const baselineEmissions = request.facility_mw * gridEf;
      const shiftableMw = request.facility_mw * (request.shiftable_pct / 100);
      const solarAvailable = Math.min(request.solar_capacity_mw, Math.max(0, 600 * Math.sin((hour - 6) / 12 * Math.PI) / 1000));
      const batteryAction = hour >= 18 && hour <= 22 ? -Math.min(request.battery_capacity_mwh / 4, shiftableMw) : 0;

      const optimizedDraw = Math.max(0, request.facility_mw - solarAvailable + batteryAction);
      const optimizedEmissions = optimizedDraw * marginalEf;

      return {
        timestamp: p.timestamp,
        grid_ef_tco2_mwh: gridEf,
        marginal_ef_tco2_mwh: marginalEf,
        baseline_facility_mw: request.facility_mw,
        optimized_grid_draw_mw: optimizedDraw,
        rooftop_solar_used_mw: solarAvailable,
        battery_action_mw: batteryAction,
        baseline_emissions_tco2: baselineEmissions,
        optimized_emissions_tco2: optimizedEmissions,
      };
    });

    const baselineTotal = hourlyBreakdown.reduce((sum, h) => sum + h.baseline_emissions_tco2, 0);
    const optimizedTotal = hourlyBreakdown.reduce((sum, h) => sum + h.optimized_emissions_tco2, 0);
    const abated = baselineTotal - optimizedTotal;
    const annualized = abated * 365 / request.horizon_hours * 24;

    let grade: CarbonScorecardSummary["sustainability_grade"] = "D";
    if (abated / baselineTotal >= 0.4) grade = "A+";
    else if (abated / baselineTotal >= 0.3) grade = "A";
    else if (abated / baselineTotal >= 0.2) grade = "B";
    else if (abated / baselineTotal >= 0.1) grade = "C";

    return {
      entity_id: request.entity,
      entity_name: request.entity === "All_India" ? "All India" : request.entity,
      horizon_hours: request.horizon_hours,
      cea_baseline_ef_tco2_mwh: 0.716,
      summary: {
        baseline_emissions_tco2: baselineTotal,
        optimized_emissions_tco2: optimizedTotal,
        abated_tco2: abated,
        annualized_abated_tco2: annualized,
        abatement_pct: (abated / baselineTotal) * 100,
        baseline_cost_inr: baselineTotal * request.base_tariff_inr * 1000,
        optimized_cost_inr: optimizedTotal * request.base_tariff_inr * 1000,
        cost_savings_inr: abated * request.base_tariff_inr * 1000,
        annualized_savings_inr: annualized * request.base_tariff_inr * 1000,
        coal_avoided_tonnes: abated / 2.5,
        equivalent_trees_annual: Math.round(annualized / 0.021),
        sustainability_grade: grade,
      },
      hourly_breakdown: hourlyBreakdown,
    };
  }
}

let apiClientInstance: ApiClient | null = null;

export function createApiClient(config?: Partial<ApiClientConfig>): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient({
      baseUrl: config?.baseUrl || DEFAULT_BASE_URL,
      mode: config?.mode || "mock",
      onModeChange: config?.onModeChange,
    });
  }
  return apiClientInstance;
}

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    return createApiClient();
  }
  return apiClientInstance;
}

export { ApiClient };