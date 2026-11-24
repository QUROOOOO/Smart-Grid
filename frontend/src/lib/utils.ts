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