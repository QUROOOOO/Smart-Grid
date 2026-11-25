import { cn } from "../lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

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
  brand: "bg-brand text-onBrand shadow-lifted ring-1 ring-brandRim/40",
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
  const onFill = emphasis === "brand" ? "text-onBrand" : "text-canvas";
  const onFillMuted = emphasis === "brand" ? "text-onBrand/70" : "text-canvas/70";
  const onFillSubtle = emphasis === "brand" ? "text-onBrand/60" : "text-canvas/60";
  const onFillChip = emphasis === "brand" ? "bg-onBrand/10 text-onBrand" : "bg-canvas/10 text-canvas";

  const iconTone = inverse
    ? onFillChip
    : status === "critical"
      ? "bg-ink text-canvas"
      : status === "warning"
        ? "bg-brandWash text-inkSecondary"
        : "bg-brandContainer text-onBrandContainer";

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
              inverse ? onFillMuted : "text-inkMuted"
            )}
          >
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            {typeof value === "number" ? (
              <AnimatedNumber
                className="display-figure num-tabular text-[1.9rem] leading-none"
                value={value}
                format={(v) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(v)}
              />
            ) : (
              <span className="display-figure num-tabular text-[1.9rem] leading-none">{value}</span>
            )}
            {unit && (
              <span className={cn("text-xs font-semibold", inverse ? onFillMuted : "text-inkMuted")}>
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
                ? onFillChip
                : trend.value >= 0
                  ? "bg-brandWash text-brand"
                  : "bg-surfaceTonal text-inkSecondary"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
          <span className={cn("text-[11px]", inverse ? onFillSubtle : "text-inkMuted")}>{trend.label}</span>
        </div>
      )}

      {hint && (
        <p className={cn("mt-3 text-[11px] leading-snug", inverse ? onFillSubtle : "text-inkMuted")}>
          {hint}
        </p>
      )}
    </div>
  );
}
