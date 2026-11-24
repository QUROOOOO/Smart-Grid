import { cn } from "../lib/utils";
import { Card, CardContent } from "./Card";

export interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label: string } | null;
  status?: "normal" | "warning" | "critical" | "success";
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({ label, value, unit, trend, status = "normal", icon, className }: KPICardProps) {
  const statusColors = {
    normal: "text-primaryInk",
    warning: "text-gridOrange",
    critical: "text-red-400",
    success: "text-mutedEmerald",
  };

  const statusBg = {
    normal: "bg-hairline/50",
    warning: "bg-gridOrangeSubtle",
    critical: "bg-red-500/10",
    success: "bg-mutedEmeraldSubtle",
  };

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-mutedInk truncate">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={cn("num-tabular text-2xl font-mono font-semibold", statusColors[status])}>
              {value}
            </span>
            {unit && <span className="text-sm text-mutedInk self-end">{unit}</span>}
          </div>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "num-tabular text-xs font-mono font-medium",
                  trend.value >= 0 ? "text-mutedEmerald" : "text-red-400"
                )}
              >
                {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}%
              </span>
              <span className="text-xs text-mutedInk">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn("p-2 rounded-lg flex-shrink-0", statusBg[status])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}