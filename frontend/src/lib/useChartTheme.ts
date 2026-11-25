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
  brandVivid: "#234E68",
  ink: "#09090B",
  muted: "#7C858D",
  grid: "#E1E5E8",
  surface: "#FFFFFF",
  tonal: "#E9ECEF",
};

const DARK: ChartTheme = {
  brand: "#4E95C2",
  brandBright: "#8CC8E6",
  brandVivid: "#4E95C2",
  ink: "#FAFAFA",
  muted: "#71717A",
  grid: "#242429",
  surface: "#0E0E11",
  tonal: "#18181C",
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
