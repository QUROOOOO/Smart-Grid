import { cn } from "../lib/utils";

export type KPICardEmphasis = "default" | "brand" | "obsidian" | "tonal";

export interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label: string } | null;
  status?: "normal" | "warning" | "critical" | "success";
  icon?: React.ReactNode;
  hint?: string;
  emphasis?: KPICardEmphasis;
  className?: string;
}

const SHELL: Record<KPICardEmphasis, string> = {
  default: "bg-surface text-ink shadow-soft ring-1 ring-borderSubtle/60",
  tonal: "bg-surfaceTonal text-ink ring-1 ring-borderSubtle/40",
  brand: "bg-brand text-white shadow-lifted ring-1 ring-brandHover/40",
  obsidian: "bg-obsidian text-canvas shadow-lifted",
};

export function KPICard({
  label,
  value,
  unit,
  trend,
  status = "normal",
  icon,
  hint,
  emphasis = "default",
  className,
}: KPICardProps) {
  const inverse = emphasis === "brand" || emphasis === "obsidian";

  const iconTone = inverse
    ? "bg-white/15 text-white"
    : status === "critical"
      ? "bg-ink text-canvas"
      : status === "warning"
        ? "bg-brandWash text-brand"
        : status === "success"
          ? "bg-brandWash text-brandVivid"
          : "bg-surfaceTonal text-inkSecondary";

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[28px] p-5 transition-all duration-300 ease-expressive",
        SHELL[emphasis],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.14em]",
              inverse ? "text-white/70" : "text-inkMuted"
            )}
          >
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="display-figure num-tabular text-[1.9rem] leading-none">{value}</span>
            {unit && (
              <span className={cn("text-xs font-semibold", inverse ? "text-white/70" : "text-inkMuted")}>
                {unit}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className={cn("grid h-10 w-10 flex-shrink-0 place-items-center rounded-full", iconTone)}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "num-tabular rounded-full px-2 py-0.5 text-[11px] font-bold",
              inverse
                ? "bg-white/15 text-white"
                : trend.value >= 0
                  ? "bg-brandWash text-brand"
                  : "bg-surfaceTonal text-inkSecondary"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
          <span className={cn("text-[11px]", inverse ? "text-white/60" : "text-inkMuted")}>{trend.label}</span>
        </div>
      )}

      {hint && (
        <p className={cn("mt-3 text-[11px] leading-snug", inverse ? "text-white/60" : "text-inkMuted")}>
          {hint}
        </p>
      )}
    </div>
  );
}
