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
  brand: "#3EB8FF",
  brandBright: "#3EB8FF",
  brandVivid: "#3EB8FF",
  ink: "#22384A",
  muted: "#5F7384",
  grid: "#D6E6F5",
  surface: "#FFFFFF",
  tonal: "#E3F0FC",
};

const DARK: ChartTheme = {
  brand: "#3EB8FF",
  brandBright: "#8CD5FF",
  brandVivid: "#3EB8FF",
  ink: "#FAFAFA",
  muted: "#71717A",
  grid: "#242429",
  surface: "#0E0E11",
  tonal: "#17171B",
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
