/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#111214",
        surface: "#181A1E",
        surfaceHover: "#21242A",
        hairline: "#272A30",
        hairlineLight: "#353942",
        primaryInk: "#F4F4F5",
        mutedInk: "#9CA3AF",
        gridOrange: "#F97316",
        gridOrangeSubtle: "rgba(249, 115, 22, 0.12)",
        mutedEmerald: "#10B981",
        mutedEmeraldSubtle: "rgba(16, 185, 129, 0.12)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
