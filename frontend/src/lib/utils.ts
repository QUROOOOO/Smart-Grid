import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatMW(mw: number): string {
  return `${formatNumber(Math.round(mw))} MW`;
}

export function formatPercentage(pct: number, decimals = 1): string {
  return `${pct.toFixed(decimals)}%`;
}

export function formatCurrency(inr: number): string {
  if (inr >= 1e7) {
    return `₹${(inr / 1e7).toFixed(2)} Cr`;
  }
  if (inr >= 1e5) {
    return `₹${(inr / 1e5).toFixed(2)} L`;
  }
  return `₹${formatNumber(Math.round(inr))}`;
}

export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
/**
 * Safe hour formatter — accepts ISO timestamps, bare "HH:mm[:ss]" strings and
 * already-formatted "6:00 PM" strings. Never re-parses display text as a date.
 */
export function formatHourLabel(ts: string | undefined | null, hour12 = false): string {
  if (!ts) return "--:--";
  const s = String(ts).trim();
  if (!s) return "--:--";

  const ampm = /^(\d{1,2}):(\d{2})\s*([AP])\.?M\.?$/i.exec(s);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (ampm[3].toUpperCase() === "P") h += 12;
    if (hour12) return `${String(h % 12 || 12).padStart(2, "0")}:${ampm[2]} ${h < 12 ? "AM" : "PM"}`;
    return `${String(h).padStart(2, "0")}:${ampm[2]}`;
  }

  const bare = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
  if (bare) {
    const h = Number(bare[1]);
    if (hour12) return `${String(h % 12 || 12).padStart(2, "0")}:${bare[2]} ${h < 12 ? "AM" : "PM"}`;
    return `${String(h).padStart(2, "0")}:${bare[2]}`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12 });
}

export function addHours(ts: string, hours: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}
