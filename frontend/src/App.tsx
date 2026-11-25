import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BarChart3,
  BatteryCharging,
  BrainCircuit,
  Leaf,
  LineChart,
  Moon,
  Sun,
} from "lucide-react";
import { ForecastView } from "./views/ForecastView";
import { PeakChargingView } from "./views/PeakChargingView";
import { CEAStateExplorerView } from "./views/CEAStateExplorerView";
import { CarbonScorecardView } from "./views/CarbonScorecardView";
import { ModelTelemetryView } from "./views/ModelTelemetryView";
import { cn } from "./lib/utils";
import { getApiClient } from "./services/apiClient";

type ViewType = "forecast" | "peak-charging" | "cea-explorer" | "carbon-scorecard" | "model-telemetry";
type Theme = "light" | "dark";

const NAV_ITEMS: { id: ViewType; label: string; short: string; icon: React.ReactNode }[] = [
  { id: "forecast", label: "Forecast", short: "Forecast", icon: <LineChart className="h-[18px] w-[18px]" /> },
  { id: "peak-charging", label: "Charging", short: "Charging", icon: <BatteryCharging className="h-[18px] w-[18px]" /> },
  { id: "cea-explorer", label: "CEA 2026", short: "CEA", icon: <BarChart3 className="h-[18px] w-[18px]" /> },
  { id: "carbon-scorecard", label: "Carbon", short: "Carbon", icon: <Leaf className="h-[18px] w-[18px]" /> },
  { id: "model-telemetry", label: "Model", short: "Model", icon: <BrainCircuit className="h-[18px] w-[18px]" /> },
];

const SPRING = { type: "spring", stiffness: 380, damping: 28, mass: 0.9 } as const;

function renderView(view: ViewType) {
  switch (view) {
    case "forecast":
      return <ForecastView />;
    case "peak-charging":
      return <PeakChargingView />;
    case "cea-explorer":
      return <CEAStateExplorerView />;
    case "carbon-scorecard":
      return <CarbonScorecardView />;
    case "model-telemetry":
      return <ModelTelemetryView />;
    default:
      return <ForecastView />;
  }
}

export function App() {
  const [activeView, setActiveView] = useState<ViewType>("forecast");
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [apiMode, setApiMode] = useState<"live" | "mock">(() => getApiClient().getMode());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("gridpulse-theme", theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    const api = getApiClient();
    const sync = () => !cancelled && setApiMode(api.getMode());

    api.health().catch(() => undefined).finally(sync);
    const timer = window.setInterval(sync, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Tonal wash — same hue as the brand, keeps the canvas alive */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] opacity-70"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgb(var(--brand) / 0.10) 0%, rgb(var(--brand-bright) / 0.06) 38%, transparent 72%)",
        }}
      />

      {/* Floating command bar */}
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-2 rounded-[26px] bg-surface/85 px-3 py-2 shadow-pill ring-1 ring-borderSubtle/70 backdrop-blur-xl sm:rounded-full">
          {/* Monogram */}
          <div className="flex items-center gap-2.5 pl-1 pr-1">
            <div className="grid h-9 w-9 place-items-center rounded-[13px] bg-brand font-display text-[13px] font-extrabold tracking-tight text-white shadow-pill">
              GP
            </div>
            <div className="hidden leading-none sm:block">
              <p className="font-display text-[15px] font-extrabold tracking-tight text-ink">GridPulse</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-inkMuted">
                Grid Intelligence
              </p>
            </div>
          </div>

          {/* Nav pills */}
          <nav
            aria-label="Primary"
            className="no-scrollbar order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto rounded-full bg-surfaceTonal p-1 sm:order-none sm:mx-0 sm:w-auto"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold outline-none transition-colors duration-200",
                    active ? "text-white" : "text-inkSecondary hover:text-ink"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-full bg-brand shadow-pill"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {item.icon}
                    <span className="hidden md:inline">{item.label}</span>
                    <span className="md:hidden">{item.short}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Status + theme */}
          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                apiMode === "live"
                  ? "bg-brand text-white shadow-pill"
                  : "bg-surfaceTonal text-inkSecondary ring-1 ring-borderSubtle/60"
              )}
              title={apiMode === "live" ? "Connected to FastAPI backend" : "Serving deterministic mock data"}
            >
              <span className="relative flex h-1.5 w-1.5">
                {apiMode === "live" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-1.5 w-1.5 rounded-full",
                    apiMode === "live" ? "bg-white" : "bg-inkMuted"
                  )}
                />
              </span>
              <span className="hidden sm:inline">{apiMode === "live" ? "Live API" : "Mock"}</span>
            </span>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle color theme"
              className="grid h-9 w-9 place-items-center rounded-full bg-surfaceTonal text-inkSecondary ring-1 ring-borderSubtle/60 transition-colors hover:bg-surfaceHover hover:text-ink"
            >
              {theme === "dark" ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
            </button>
          </div>
        </div>
      </header>

      {/* View stage */}
      <main className="relative mx-auto max-w-[1560px] px-3 pb-16 pt-4 sm:px-5 sm:pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.34, 1.2, 0.5, 1] }}
          >
            {renderView(activeView)}
          </motion.div>
        </AnimatePresence>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-borderSubtle/70 pt-4 text-[11px] text-inkMuted">
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            GridPulse · Smart Grid Demand Forecasting &amp; Carbon Abatement
          </span>
          <span>CEA CO₂ Baseline Database v22.0 · 2026</span>
        </footer>
      </main>
    </div>
  );
}
