import { useState } from "react";
import { ForecastView } from "./views/ForecastView";
import { PeakChargingView } from "./views/PeakChargingView";
import { CEAStateExplorerView } from "./views/CEAStateExplorerView";
import { CarbonScorecardView } from "./views/CarbonScorecardView";
import { ModelTelemetryView } from "./views/ModelTelemetryView";
import { cn } from "./lib/utils";
import { Badge } from "./components/Badge";
import { Home, Zap, Battery, BarChart, Brain, Loader2 } from "lucide-react";

type ViewType = "forecast" | "peak-charging" | "cea-explorer" | "carbon-scorecard" | "model-telemetry";

const NAV_ITEMS: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: "forecast", label: "Forecast & Weather", icon: <Home className="w-5 h-5" /> },
  { id: "peak-charging", label: "Peak-Load & Charging", icon: <Battery className="w-5 h-5" /> },
  { id: "cea-explorer", label: "CEA State Explorer", icon: <BarChart className="w-5 h-5" /> },
  { id: "carbon-scorecard", label: "Carbon Scorecard", icon: <Zap className="w-5 h-5" /> },
  { id: "model-telemetry", label: "Model Telemetry", icon: <Brain className="w-5 h-5" /> },
];

function NavItem({ id, label, icon, active, onClick }: { 
  id: ViewType; 
  label: string; 
  icon: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
        "w-full text-left",
        active
          ? "bg-gridOrange/10 text-gridOrange border-l-2 border-gridOrange"
          : "text-mutedInk hover:bg-surfaceHover hover:text-primaryInk"
      )}
    >
      <span className={cn("flex-shrink-0", active && "text-gridOrange")}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function App() {
  const [activeView, setActiveView] = useState<ViewType>("forecast");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiMode, setApiMode] = useState<"live" | "mock">("mock");

  const renderView = () => {
    switch (activeView) {
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
  };

  return (
    <div className="min-h-screen bg-canvas text-primaryInk font-sans">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 bg-surface border-r border-hairline transition-all duration-300 flex flex-col",
            sidebarOpen ? "w-64" : "w-20"
          )}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-hairline">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: "#F97316" }}>
                  GP
                </div>
                <span className="font-semibold text-lg">GridPulse</span>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-surfaceHover text-mutedInk transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                active={activeView === item.id}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </nav>

          <div className="p-4 border-t border-hairline">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-hairline/30">
              <Loader2 className="w-4 h-4 animate-spin text-gridOrange" />
              {sidebarOpen && (
                <>
                  <span className="text-xs font-medium text-primaryInk">API Status</span>
                  <Badge variant={apiMode === "live" ? "success" : "warning"} className="ml-auto">
                    {apiMode === "live" ? "LIVE" : "MOCK"}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            sidebarOpen ? "ml-64" : "ml-20"
          )}
        >
          <div className="min-h-screen">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}