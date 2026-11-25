# GridPulse — UI Overhaul Progress (M3 Expressive × Steel Monochrome)

> **Resume protocol:** Read this file top-to-bottom and continue from the FIRST UNCHECKED phase.
> Do not redo completed phases. Each phase must end with `npm run build` passing (exit 0).

Design language: Material 3 Expressive (spring physics, shape morphing, wavy controls,
scalloped badges, bento containment) anchored on `#1A394C` steel blue + its tonal ramp.
Light mode is default; dark mode via `.dark` on `<html>`.

## Phase 1 — Dependencies, Fonts & Theme Tokens
- [x] `motion` installed (v14.14.0)
- [x] `index.html` fonts (Plus Jakarta Sans 500–800, Inter, JetBrains Mono) + no hardcoded theme
- [x] `tailwind.config.js` `darkMode: 'class'` + semantic steel tokens
- [x] `index.css` light `:root` / dark `.dark` variables, scrollbars, `num-tabular`
- [x] `npm run build` green

## Phase 2 — M3 Expressive Component Library
- [x] `ExpressiveCard.tsx` (elevated | tonal | brand | obsidian | outline)
- [x] `ConnectedButtonGroup.tsx` (spring shape-morph)
- [x] `WavySlider.tsx` (wave track + pill thumb)
- [x] `ExpressiveSwitch.tsx`
- [x] `ScallopBadge.tsx` (12-lobe)
- [x] `ExpressiveGauges.tsx` (`CircularTickRing`, `ConcentricArcGauge`)
- [x] `KPICard.tsx` upgrade
- [x] Recolor `Badge`, `Button`, `Select`, `Card`
- [x] `npm run build` green

## Phase 3 — App Shell & Floating Navigation
- [ ] Floating pill command bar (monogram, 5 nav pills w/ layoutId, status pill, theme toggle)
- [ ] `AnimatePresence` view transitions
- [ ] API mode wired to real client
- [ ] `npm run build` green

## Phase 4 — Forecast & Peak-Charging views
- [ ] `ForecastView.tsx` bento KPIs + simulator console + hero chart + insight strip
- [ ] Bug: Invalid Date in tooltip fixed (`formatHourLabel`)
- [ ] Bug: contiguous peak/optimal windows fixed
- [ ] `PeakChargingView.tsx` 24 pill columns + side gauge panel
- [ ] `npm run build` green

## Phase 5 — CEA, Carbon & Telemetry views
- [ ] `CEAStateExplorerView.tsx`
- [ ] `CarbonScorecardView.tsx`
- [ ] `ModelTelemetryView.tsx`
- [ ] `npm run build` green

## Phase 6 — Polish, Verify & Ship
- [ ] Zero foreign colors (`orange-`, `emerald-`, `amber-`, `red-`, `#F97316`, `gridOrange`, `mutedEmerald`)
- [ ] Responsive containers + tabular numerals everywhere
- [ ] Both themes audited
- [ ] `npm run build` exit 0
- [ ] Committed & pushed to `origin main`

## Files modified log
- `index.html` — fonts + theme bootstrap script
- `tailwind.config.js` — darkMode class, steel token ramp, shadows
- `src/index.css` — light/dark CSS variables, utilities
- `package.json` — added `motion`
- `src/components/ExpressiveCard.tsx` — new
- `src/components/ConnectedButtonGroup.tsx` — new
- `src/components/WavySlider.tsx` — new
- `src/components/ExpressiveSwitch.tsx` — new
- `src/components/ScallopBadge.tsx` — new
- `src/components/ExpressiveGauges.tsx` — new
- `src/components/KPICard.tsx` — upgraded (emphasis modes, display figures)
- `src/components/{Badge,Button,Select,Card}.tsx` — recolored to steel ramp
