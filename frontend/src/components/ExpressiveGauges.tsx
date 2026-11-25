import { cn } from "../lib/utils";

/* ─────────────────────────── CircularTickRing ─────────────────────────── */

export interface CircularTickRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  ticks?: number;
  label?: string;
  caption?: string;
  className?: string;
  tone?: "brand" | "ink";
}

export function CircularTickRing({
  value,
  size = 168,
  strokeWidth = 9,
  ticks = 56,
  label,
  caption,
  className,
  tone = "brand",
}: CircularTickRingProps) {
  const pct = Math.min(100, Math.max(0, value));
  const cx = 60;
  const cy = 60;
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  const stroke = tone === "brand" ? "rgb(var(--brand))" : "rgb(var(--ink))";
  const markerAngle = -90 + (pct / 100) * 360;
  const markerRad = (markerAngle * Math.PI) / 180;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* tick ring */}
        {Array.from({ length: ticks }).map((_, i) => {
          const angle = (i / ticks) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const active = i / ticks <= pct / 100;
          const inner = 52.5;
          const outer = 57;
          return (
            <line
              key={i}
              x1={cx + Math.cos(rad) * inner}
              y1={cy + Math.sin(rad) * inner}
              x2={cx + Math.cos(rad) * outer}
              y2={cy + Math.sin(rad) * outer}
              stroke={active ? stroke : "rgb(var(--border))"}
              strokeWidth={1.6}
              strokeLinecap="round"
              opacity={active ? 0.95 : 0.65}
            />
          );
        })}

        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={strokeWidth} opacity={0.55} />

        {/* progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 500ms cubic-bezier(0.34,1.4,0.5,1)" }}
        />

        {/* active node marker */}
        <circle
          cx={cx + Math.cos(markerRad) * r}
          cy={cy + Math.sin(markerRad) * r}
          r={3.4}
          fill="rgb(var(--surface))"
          stroke={stroke}
          strokeWidth={2.4}
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center text-center">
        <span className="display-figure text-3xl leading-none text-ink">
          {pct.toFixed(0)}
          <span className="ml-0.5 text-base font-bold text-inkMuted">%</span>
        </span>
        {label && <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-inkSecondary">{label}</span>}
        {caption && <span className="mt-0.5 max-w-[9rem] text-[11px] leading-tight text-inkMuted">{caption}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────── ConcentricArcGauge ────────────────────────── */

export interface ArcMetric {
  label: string;
  value: number;
  display?: string;
}

export interface ConcentricArcGaugeProps {
  metrics: ArcMetric[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}

const ARC_COLORS = ["rgb(var(--brand))", "rgb(var(--brand-vivid))", "rgb(var(--brand-bright))"];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function ConcentricArcGauge({
  metrics,
  size = 190,
  centerLabel,
  centerValue,
  className,
}: ConcentricArcGaugeProps) {
  const cx = 60;
  const cy = 60;
  const start = -225;
  const sweep = 270;

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
          {metrics.slice(0, 3).map((m, i) => {
            const r = 47 - i * 11;
            const pct = Math.min(100, Math.max(0, m.value));
            return (
              <g key={m.label}>
                <path
                  d={arcPath(cx, cy, r, start, start + sweep)}
                  fill="none"
                  stroke="rgb(var(--border))"
                  strokeWidth={7}
                  strokeLinecap="round"
                  opacity={0.5}
                />
                <path
                  d={arcPath(cx, cy, r, start, start + (sweep * pct) / 100)}
                  fill="none"
                  stroke={ARC_COLORS[i % ARC_COLORS.length]}
                  strokeWidth={7}
                  strokeLinecap="round"
                  style={{ transition: "all 600ms cubic-bezier(0.34,1.4,0.5,1)" }}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerValue && <span className="display-figure text-xl leading-none text-ink">{centerValue}</span>}
          {centerLabel && (
            <span className="mt-1 max-w-[6.5rem] text-[10px] font-semibold uppercase leading-tight tracking-wider text-inkMuted">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-2.5">
        {metrics.slice(0, 3).map((m, i) => (
          <li key={m.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: ARC_COLORS[i % ARC_COLORS.length] }}
            />
            <div className="min-w-0">
              <p className="text-[11px] font-medium leading-tight text-inkMuted">{m.label}</p>
              <p className="num-tabular text-sm font-bold leading-tight text-ink">
                {m.display ?? `${m.value.toFixed(1)}%`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
