# Shipping-Tracker — Project Context

## What This Project Is

A **functional fleet tracking dashboard** for shipping and trade operations. It displays real vessel positions on a live nautical map, computes environmental compliance ratings, optimizes bunker fuel costs, and provides scenario-based rerouting — all from a single Next.js application with zero backend languages beyond TypeScript.

This is not a demo or wireframe. It is a production-grade ops tool designed to run a small-to-mid-size fleet (10–50 vessels) at **$0/month** on free-tier infrastructure.

---

## Problem Statement

Maritime fleet operators need real-time visibility into:
- **Where vessels are** — live AIS positions on a nautical chart
- **What they're burning** — fuel consumption vs. optimal slow-steam targets
- **Whether they're compliant** — IMO Carbon Intensity Indicator (CII) ratings A–E
- **What happens if conditions change** — rerouting around weather, port congestion, canal closures

Commercial solutions (MarineTraffic Pro, Kpler, Windward) cost $5,000–$50,000+/year. This project replicates the core ops functionality using entirely free, open-source, and free-tier cloud services.

---

## Target User

A shipping operations team — dispatchers, fleet managers, bunker planners — who need a single screen to monitor vessel positions, fuel spend, CII compliance, and active alerts. The tool assumes a single organization's fleet, not a public vessel-tracking service.

---

## Core Features

### P0 — The Spine (must work for anything else to matter)
1. **Live Fleet Map** — Leaflet + OpenSeaMap nautical tiles. Vessel markers oriented by heading, color-coded by status (green=underway, amber=slow/ECA, red=deviation). Route lines: solid=traveled, dashed=planned. Click any vessel for a detail panel.
2. **AIS Ingestion** — Vercel cron polls AISStream.io WebSocket every 30–60 min, upserts positions into Supabase with PostGIS geometry.
3. **Supabase Realtime Push** — When a position row inserts, the browser receives a WebSocket event and the map marker moves. No Redis, no SSE server.

### P1 — Command Center
4. **KPI Bar** — TEU in transit, average fleet speed, bunker cost/day, active alerts count.
5. **CII Ratings Table** — Every vessel rated A–E with attained vs. required CII, YTD trend.
6. **Fuel Price Ticker** — VLSFO/HSFO daily prices from EIA Open Data.
7. **Vessel Detail Panel** — On click: IMO, MMSI, flag, draft, speed, heading, ETA, cargo utilization, fuel burn rate, CII rating, last 3 ports, action buttons (Reroute, Bunker Plan, B/L docs).

### P2 — Operational Tools
8. **Weather Overlay** — Open-Meteo wind barbs + wave height heatmap, Beaufort coloring, toggle on/off.
9. **CII Nightly Calculator** — TypeScript function implementing the IMO formula. Runs as a Vercel cron at midnight UTC. Writes ratings to `vessel_ratings`.
10. **Voyage Manager** — Active voyages with booking status, cargo allocation, B/L issued/pending, estimated vs. actual arrival.
11. **Bunker Optimizer** — Vessels with current burn vs. optimal. Slow-steam recommendations. Port-by-port bunker cost comparison. VLSFO vs. HSFO split.

### P3 — Differentiators
12. **Scenario Engine ("What-If")** — Pick a vessel, break a route (Suez closure, weather avoidance, port congestion), watch the reroute animate on the map with before/after cost and emissions delta.
13. **Route Optimizer** — glpk.js (WASM LP solver) in a Next.js API route. Minimizes total fuel cost across waypoint segments subject to ETA and tank constraints. Returns GeoJSON.
14. **Built-In Analytics** — Lane P&L by corridor, fuel cost over time, CII trend by fleet, cargo volume vs. capacity. Chart.js, no external BI tool.

---

## Technology Decisions & Rationale

### What We Chose and Why

| Decision | Choice | Alternative Considered | Why This One |
|----------|--------|----------------------|--------------|
| **Language** | TypeScript only | Python (FastAPI, OR-Tools) | Owner doesn't know Python. Every endpoint is a Next.js API route. |
| **Framework** | Next.js 14 (App Router) | Remix, SvelteKit | Vercel deploys free, API routes co-locate with frontend, largest ecosystem. |
| **Database** | Supabase Postgres + PostGIS | PlanetScale, Neon | PostGIS for geo queries, built-in Realtime engine, generous free tier. |
| **Realtime** | Supabase Realtime | Upstash Redis + SSE | Redis 10k cmd/day limit is too low for live positions. Supabase Realtime is free and requires zero extra infrastructure. |
| **Event streaming** | None (removed) | Confluent Kafka | Kafka is for thousands of events/second. At 50 vessels × 1 update/30 min, a cron + DB write is simpler and free. |
| **Map tiles** | Leaflet + OpenSeaMap | Mapbox, Google Maps | Nautical chart tiles (depth, traffic lanes, buoys) free forever. No billing surprises. |
| **AIS data** | AISStream.io | Datalastic, AISHub, MarineTraffic | Free WebSocket stream, no hardware required, no request caps for reasonable use. |
| **Weather** | Open-Meteo | OpenWeatherMap, Windy API | No API key required. Includes ocean wind + wave height. Free forever. |
| **Fuel prices** | EIA Open Data | Ship & Bunker, Platts | Free REST API. Daily VLSFO/HSFO proxy series. No subscription. |
| **Route optimization** | glpk.js (WASM) | OR-Tools (Python), javascript-lp-solver | Full LP/MILP solver compiled to WebAssembly. Runs inside a Node.js API route. No Python dependency. |
| **CII calculation** | 20-line TypeScript function | Python library | The IMO formula is arithmetic: `CII = (fuel × 3.206) / (DWT × distance)`. No ML, no library needed. |
| **Scheduling** | Vercel Cron Jobs | Airflow, GitHub Actions cron | Defined in `vercel.json`. Runs TS functions on a schedule. Free, zero ops. |
| **Charts** | Chart.js | Recharts, D3, Apache Superset | Lightweight, MIT licensed. Superset on Render cold-starts after 15 min — unacceptable for a live ops tool. |
| **Analytics BI** | Built into Next.js | Apache Superset (embedded) | One fewer service to deploy. Data is already in Supabase; charting it in-app is simpler. |
| **ERP/OMS** | Deferred (ERPNext/Odoo) | Build custom | REST API integration only. Core tracker works without them. Wire in later if needed. |

### What We Explicitly Removed

- **Python** — No FastAPI, no OR-Tools, no Airflow. Everything is TypeScript.
- **Kafka** — Overkill at this scale. Replaced by Vercel Cron → Supabase.
- **Redis** — Replaced by Supabase Realtime. Zero extra infrastructure.
- **Apache Superset** — Replaced by in-app Chart.js dashboards. No cold-start issues.
- **MinIO** — No blob storage needed for v1. Documents can live in Supabase Storage if needed later.

---

## Free Tier Limits & Constraints

| Service | Free Tier Limit | Our Usage (50 vessels) | Status |
|---------|----------------|----------------------|--------|
| Supabase DB | 500 MB | ~80 MB (50 vessels × 30 days positions) | OK |
| Supabase Bandwidth | 2 GB/month | ~200 MB | OK |
| Supabase Realtime | 200 concurrent connections, 2M messages/month | 1–5 connections, ~50k messages/month | OK |
| Vercel Functions | 1M invocations/month | ~5k (crons + user requests) | OK |
| Vercel Bandwidth | 100 GB/month | <1 GB | OK |
| AISStream.io | Free tier WebSocket | ~2,400 position updates/day | OK |
| Open-Meteo | Unlimited (non-commercial) | 24 requests/day | OK |
| EIA API | 1,000 requests/day | 1 request/day | OK |
| OpenSeaMap tiles | Unlimited | Standard map tile traffic | OK |

**Total monthly cost: $0** within free tiers for a ≤50 vessel fleet.

### Known Limit Risks
- Supabase Realtime's 200 concurrent connection limit means this is a **single-team tool**, not a public-facing service.
- AISStream.io may throttle or change terms. Fallback: Datalastic ($19/month) or a physical AIS receiver (~$200 one-time).
- Vercel free tier pauses after 100 hours of serverless execution/month. Cron jobs are lightweight, but monitor if adding heavy optimization calls.

---

## Database Schema (9 Tables)

```sql
vessels (id, imo, mmsi, name, flag, type, dwt_capacity, loa_metres, current_route_id)

vessel_positions (id, vessel_id, timestamp, lat, lng, speed_kn, heading_deg, nav_status, draught, geom POINT)

voyages (id, vessel_id, origin_port, dest_port, departure_at, eta, actual_arrival, cargo_teu, fuel_consumed_mt, distance_nm)

vessel_ratings (id, vessel_id, period_start, period_end, attained_cii, rating, co2_mt)

vessel_routes (id, voyage_id, route_geojson, computed_at, is_active)

eca_zones (id, name, regulation, boundary POLYGON)

weather_grid (id, timestamp, lat, lng, wind_speed_kn, wind_dir_deg, wave_height_m, beaufort)

fuel_prices (id, date, fuel_type, price_usd_per_mt, source)

ports (id, name, unlocode, lat, lng, country, berth_count, avg_port_call_hours)
```

PostGIS enabled on `vessel_positions.geom` and `eca_zones.boundary` for spatial queries (e.g., "which vessels are inside an ECA zone right now?").

---

## Pages & Routes

| Route | Page Name | Purpose |
|-------|-----------|---------|
| `/` | Command Center | Live KPI bar, CII table, fuel ticker, alerts feed, corridor volume chart |
| `/map` | Fleet Map | Full-screen Leaflet + OpenSeaMap. Vessel icons, routes, weather, ECA overlays. Click vessel → detail panel |
| `/voyages` | Voyage Manager | Active voyages, booking status, cargo allocation, B/L tracking |
| `/fuel` | Bunker Optimizer | Burn rate vs. optimal, slow-steam recommendations, port bunker cost comparison |
| `/environment` | CII & Emissions | Fleet CII ratings A–E, attained vs. required, CO₂/day trend, MARPOL compliance |
| `/scenarios` | What-If Engine | Reroute simulation: pick vessel, break route, animate new route, show cost/emissions delta |
| `/analytics` | Analytics | Lane P&L, fuel cost trends, CII fleet trends, cargo volume vs. capacity charts |

---

## Data Flows

### Scheduled (Vercel Cron)
| Schedule | Endpoint | Source | Target Table |
|----------|----------|--------|-------------|
| Every 30–60 min | `/api/ais-sync` | AISStream.io | `vessel_positions` |
| Every 60 min | `/api/weather-sync` | Open-Meteo | `weather_grid` |
| Daily 00:00 UTC | `/api/fuel-sync` | EIA API | `fuel_prices` |
| Daily 00:00 UTC | `/api/cii-nightly` | `voyages` table | `vessel_ratings` |

### On-Demand (User Action)
| Trigger | Endpoint | Logic | Result |
|---------|----------|-------|--------|
| Click "Reroute" | `/api/optimize` | glpk.js LP solver | GeoJSON route → `vessel_routes` → Realtime push → map animates |

### Realtime (Supabase → Browser)
| Channel | Watches | Browser Effect |
|---------|---------|---------------|
| `fleet-positions` | `vessel_positions` INSERT | Map marker moves |
| `route-updates` | `vessel_routes` INSERT/UPDATE | Route line redraws |
| `weather-updates` | `weather_grid` INSERT | Weather overlay refreshes |

---

## Seed Data (for development)

Build the entire UI against fake data before wiring live APIs:

- **12 vessels** across 3 types (container, tanker, bulk carrier)
- **6 corridors** (Asia–Europe via Suez, Transpacific, Asia–Middle East, Europe–Americas, Intra-Asia, Africa–Europe)
- **10 ports** (Shanghai, Singapore, Rotterdam, Jebel Ali, Los Angeles, Busan, Hamburg, Colombo, Tanjung Pelepas, Piraeus)
- **4 ECA zones** (Baltic Sea, North Sea, North America, US Caribbean)
- **30 days of historical positions** per vessel (interpolated along corridor great-circle routes)
- **Voyage records** with realistic fuel consumption and cargo loads

---

## Build Phases

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **1** | Foundation | Next.js app shell, Supabase schema, seed data, types, Supabase client |
| **2** | The Map | Leaflet + OpenSeaMap, vessel markers, route lines, vessel detail panel, ECA overlays |
| **3** | Live Pipeline | AIS ingestion cron, Supabase Realtime subscription, vessels moving on map |
| **4** | Command Center | KPI bar, CII table, fuel ticker, alerts, corridor chart |
| **5** | Weather + Fuel | Open-Meteo integration, weather overlay, EIA fuel sync, bunker dashboard |
| **6** | CII + Voyages | CII calculator, nightly cron, voyage manager page |
| **7** | Optimizer + Scenarios | glpk.js route optimizer, reroute button, animated comparison, cost delta |
| **8** | Polish + Deploy | Analytics charts, responsive layout, error handling, Vercel production deploy |

---

## Key Formulas

### CII (Carbon Intensity Indicator)
```
CII_attained = (fuel_consumed_mt × 3.206) / (dwt_capacity × distance_nm)

Rating thresholds (container vessel, simplified):
  A: < 0.0042
  B: 0.0042 – 0.0049
  C: 0.0049 – 0.0057
  D: 0.0057 – 0.0066
  E: > 0.0066

3.206 = CO₂ emission factor for VLSFO (tonnes CO₂ per tonne fuel)
```

### Bunker Optimization (LP)
```
Minimize: Σ (fuel_at_port_i × price_at_port_i) across all waypoints
Subject to:
  - arrival_time ≤ ETA_deadline
  - tank_level ≥ 0 at all points
  - tank_level ≤ tank_capacity
Solver: glpk.js (WASM, runs in Node.js)
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AIS Data
AISSTREAM_API_KEY=your_key_here

# EIA Fuel Prices
EIA_API_KEY=your_key_here

# Vercel Cron Secret (protects cron endpoints)
CRON_SECRET=your_secret_here
```

---

## Design Language

- **Style**: WSJ editorial / illustrational — cream backgrounds, muted tones, Georgia serif for headings, clean hairline rules
- **Map aesthetic**: OpenSeaMap nautical chart tiles (depth contours, traffic lanes, buoys) — not generic Google/Mapbox road maps
- **Vessel markers**: Oriented arrow/silhouette shapes colored by status, scaled by DWT class
- **Route lines**: Solid for traveled, dashed+marching for planned, color per corridor
- **Data density**: Ops dashboards show maximum useful information without clutter — every pixel earns its space

---

## Non-Goals (Explicitly Out of Scope for v1)

- Public vessel-tracking service (this is a private fleet tool)
- Mobile-native app (responsive web is sufficient)
- Multi-tenant authentication (single org, single Supabase project)
- Historical voyage replay beyond 30 days (storage constraint)
- Customs/trade compliance document management
- Full ERP/OMS integration (deferred to post-v1; ERPNext/Odoo via REST when ready)
- Machine learning or AI-based forecasting (simple linear stats are sufficient)
