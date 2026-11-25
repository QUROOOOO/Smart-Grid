import { useEffect, useState } from "react";

export interface ChartTheme {
  brand: string;
  brandBright: string;
  brandVivid: string;
  ink: string;
  muted: string;
  grid: string;
  surface: string;
  tonal: string;
}

const LIGHT: ChartTheme = {
  brand: "#1A394C",
  brandBright: "#58A6CC",
  brandVivid: "#2E6E92",
  ink: "#111417",
  muted: "#7C858D",
  grid: "#DFE4E8",
  surface: "#FFFFFF",
  tonal: "#E8EBED",
};

const DARK: ChartTheme = {
  brand: "#5CA3C8",
  brandBright: "#8CC8E6",
  brandVivid: "#7FBCD9",
  ink: "#FFFFFF",
  muted: "#6E7880",
  grid: "#252C33",
  surface: "#14181C",
  tonal: "#1E242A",
};

export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark ? DARK : LIGHT;
}
