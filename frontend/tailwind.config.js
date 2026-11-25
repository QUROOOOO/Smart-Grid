/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        surfaceTonal: "rgb(var(--surface-tonal) / <alpha-value>)",
        surfaceHover: "rgb(var(--surface-hover) / <alpha-value>)",

        brand: "rgb(var(--brand) / <alpha-value>)",
        brandHover: "rgb(var(--brand-hover) / <alpha-value>)",
        brandVivid: "rgb(var(--brand-vivid) / <alpha-value>)",
        brandBright: "rgb(var(--brand-bright) / <alpha-value>)",
        brandWash: "rgb(var(--brand-wash) / <alpha-value>)",
        brandRim: "rgb(var(--brand-rim) / <alpha-value>)",

        ink: "rgb(var(--ink) / <alpha-value>)",
        inkSecondary: "rgb(var(--ink-secondary) / <alpha-value>)",
        inkMuted: "rgb(var(--ink-muted) / <alpha-value>)",
        borderSubtle: "rgb(var(--border) / <alpha-value>)",
        obsidian: "rgb(var(--obsidian) / <alpha-value>)",

        /* legacy aliases — mapped onto the steel ramp during migration */
        hairline: "rgb(var(--border) / <alpha-value>)",
        hairlineLight: "rgb(var(--surface-hover) / <alpha-value>)",
        primaryInk: "rgb(var(--ink) / <alpha-value>)",
        mutedInk: "rgb(var(--ink-muted) / <alpha-value>)",
        gridOrange: "rgb(var(--brand-vivid) / <alpha-value>)",
        gridOrangeSubtle: "rgb(var(--brand-wash) / <alpha-value>)",
        mutedEmerald: "rgb(var(--brand-bright) / <alpha-value>)",
        mutedEmeraldSubtle: "rgb(var(--brand-wash) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(26, 57, 76, 0.06)",
        lifted: "0 14px 44px rgba(26, 57, 76, 0.10)",
        pill: "0 6px 22px rgba(26, 57, 76, 0.08)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.5)",
      },
      transitionTimingFunction: {
        expressive: "cubic-bezier(0.34, 1.4, 0.5, 1)",
      },
    },
  },
  plugins: [],
};
