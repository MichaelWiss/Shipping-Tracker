# Shipping-Tracker — Repository Map

A living index of what lives where. Update when folders/files are added or moved.

## Top level

| Path | Purpose |
|------|---------|
| `Agents.md` | Agent workflow: read context, diagnose, propose, ask to implement |
| `Project_Context.md` | What the project is, tech decisions, data flows, non-goals |
| `ARCHITECTURE.md` | System architecture reference |
| `BUILD_PLAN.md` | Cellular build plan (Phases 1–8, source of truth for "what's next") |
| `Repo_map.md` | This file |
| `README.md` | Public-facing readme |
| `package.json` | Dependencies + scripts |
| `tsconfig.json` | TypeScript strict-mode config, `@/*` path alias |
| `next.config.ts` | Next.js config (React Compiler enabled) |
| `eslint.config.mjs` | Flat ESLint config |
| `postcss.config.mjs` | Tailwind v4 via PostCSS |
| `.env.example` | Committed template of required env vars (no secrets) |
| `.env.local` | Local secrets (git-ignored) |

## Source

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout (`<html>` shell, global CSS) |
| `app/page.tsx` | Home route — currently placeholder, becomes Command Center in Phase 5 |
| `app/globals.css` | Tailwind entrypoint + design tokens |
| `public/` | Static assets |
| `References/` | Design references (e.g., `shipping-map.html`) |

## Planned (not yet created)

| Path | Added in cell |
|------|---------------|
| `lib/supabase.ts` | 1.4 — browser + server Supabase clients |
| `lib/types.ts` | 1.5 — shared domain interfaces |
| `lib/constants.ts` | 1.9 — corridors, CII thresholds, colors |
| `lib/cii.ts` | 1.14 — CII calculator |
| `lib/seed/` | 1.10–1.13 — seed scripts |
| `supabase/migrations/` | 1.6–1.8 — SQL migrations |
| `components/ui/` | 2.2, 2.5 — Sidebar, Card, Badge, Spinner |
| `components/map/` | 3.x — FleetMap, VesselMarker, RouteLayer, ECALayer, WeatherLayer |
| `components/dashboard/` | 5.x — KPIBar, CIITable, FuelTicker, AlertsFeed, CorridorChart |
| `hooks/` | 3.3+, 4.3, 6.x — data hooks |
| `app/api/ais-sync/route.ts` | 4.1 |
| `app/api/weather-sync/route.ts` | 6.1 |
| `app/api/fuel-sync/route.ts` | 6.3 |
| `app/api/cii-nightly/route.ts` | 7.1 |
| `app/map/`, `app/voyages/`, `app/fuel/`, `app/environment/`, `app/scenarios/`, `app/analytics/` | 2.4 — page stubs |
| `vercel.json` | 4.2 — cron schedules |
