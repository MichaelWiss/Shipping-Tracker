# Shipping-Tracker — Cellular Build Plan

## How This Plan Works

This is a **building tool**, not a feature list. Every cell is a single, atomic unit of work with:

- **What to build** — exactly one thing, no ambiguity
- **Inputs** — what must exist before this cell can start
- **Outputs** — the verifiable artifact this cell produces
- **Verify** — how to confirm the cell is complete before moving on
- **Status** — `[ ]` not started, `[~]` in progress, `[x]` done

**Rules:**
1. Never start a cell until its inputs are verified complete
2. Never skip a cell — each one builds on the last
3. Never combine cells — if it feels like two things, it is two things
4. Mark a cell done only when the verify step passes
5. Ask to implement each cell — nothing auto-builds

---

## Phase 1 — Project Scaffold

The empty repo becomes a running Next.js app with a connected database. No features, no UI beyond a shell. The goal is: `npm run dev` works, Supabase responds, types compile.

---

### Cell 1.1 — Initialize Next.js Project
**What:** Create a Next.js 14 app with App Router, TypeScript strict mode, Tailwind CSS, ESLint.
**Inputs:** Empty repo
**Outputs:**
- `package.json` with next, react, react-dom, typescript, tailwindcss
- `tsconfig.json` with `strict: true`
- `tailwind.config.ts`
- `app/layout.tsx` (root layout, no nav yet — just a `<html>` shell)
- `app/page.tsx` (placeholder: "Shipping Tracker" heading)
- `.gitignore`

**Verify:** `npm run dev` → browser shows "Shipping Tracker" at localhost:3000. `npm run build` completes with zero errors.

**Status:** `[x]`

---

### Cell 1.2 — Environment Configuration
**What:** Create environment variable structure and `.env.local` template.
**Inputs:** Cell 1.1 complete
**Outputs:**
- `.env.local` with placeholder values for all required keys
- `.env.example` (committed, no secrets) documenting every variable
- `next.config.js` — no special config yet, just the default export

**Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AISSTREAM_API_KEY=
EIA_API_KEY=
CRON_SECRET=
```

**Verify:** `.env.example` exists in repo. `.env.local` is in `.gitignore`. App still builds.

**Status:** `[x]`

---

### Cell 1.3 — Supabase Project Setup
**What:** Create a Supabase project (manually, in the Supabase dashboard). Enable PostGIS extension. Record the project URL and keys.
**Inputs:** Cell 1.2 complete
**Outputs:**
- Supabase project created at supabase.com
- PostGIS extension enabled (`CREATE EXTENSION IF NOT EXISTS postgis;`)
- `.env.local` populated with real Supabase URL, anon key, and service role key

**Verify:** In the Supabase SQL Editor, run `SELECT PostGIS_Version();` — returns a version string. `.env.local` has three real Supabase values.

**Status:** `[x]`

---

### Cell 1.4 — Supabase Client Library
**What:** Install `@supabase/supabase-js`. Create typed client instances for browser and server use.
**Inputs:** Cell 1.3 complete
**Outputs:**
- `@supabase/supabase-js` in `package.json`
- `lib/supabase.ts` — exports:
  - `supabaseBrowser()` — uses `NEXT_PUBLIC_` keys (for client components + Realtime)
  - `supabaseServer()` — uses `SUPABASE_SERVICE_ROLE_KEY` (for API routes, bypasses RLS)

**Verify:** In a temporary test page or `app/page.tsx`, call `supabaseBrowser()` and log the result of `supabase.from('_dummy').select()` — should return an error about table not existing (proves connection works). Remove test code after.

**Status:** `[x]`

---

### Cell 1.5 — TypeScript Type Definitions
**What:** Define all shared TypeScript interfaces matching the database schema. No tables created yet — just the types.
**Inputs:** Cell 1.4 complete
**Outputs:**
- `lib/types.ts` containing interfaces for:
  - `Vessel` (id, imo, mmsi, name, flag, type, dwt_capacity, loa_metres, current_route_id)
  - `VesselPosition` (id, vessel_id, timestamp, lat, lng, speed_kn, heading_deg, nav_status, draught)
  - `Voyage` (id, vessel_id, origin_port, dest_port, departure_at, eta, actual_arrival, cargo_teu, fuel_consumed_mt, distance_nm)
  - `VesselRating` (id, vessel_id, period_start, period_end, attained_cii, rating: 'A'|'B'|'C'|'D'|'E', co2_mt)
  - `VesselRoute` (id, voyage_id, route_geojson: GeoJSON.FeatureCollection, computed_at, is_active)
  - `ECAZone` (id, name, regulation, boundary: GeoJSON.Polygon)
  - `WeatherGrid` (id, timestamp, lat, lng, wind_speed_kn, wind_dir_deg, wave_height_m, beaufort)
  - `FuelPrice` (id, date, fuel_type: 'VLSFO'|'HSFO', price_usd_per_mt, source)
  - `Port` (id, name, unlocode, lat, lng, country, berth_count, avg_port_call_hours)

**Verify:** `npm run build` completes. No TypeScript errors. Types are importable from any file via `import { Vessel } from '@/lib/types'`.

**Status:** `[x]`

---

### Cell 1.6 — Database Schema: Core Tables
**What:** Create the 9 database tables in Supabase via SQL migration.
**Inputs:** Cell 1.5 complete
**Outputs:**
- SQL migration file: `supabase/migrations/001_schema.sql`
- Tables created in Supabase:
  - `vessels`
  - `vessel_positions` (with PostGIS `geom` column)
  - `voyages`
  - `vessel_ratings`
  - `vessel_routes`
  - `eca_zones` (with PostGIS `boundary` column)
  - `weather_grid`
  - `fuel_prices`
  - `ports`
- Indexes on: `vessel_positions(vessel_id, timestamp)`, `voyages(vessel_id)`, `fuel_prices(date)`
- Spatial indexes on: `vessel_positions(geom)`, `eca_zones(boundary)`

**Verify:** In Supabase Table Editor, all 9 tables visible. Run `SELECT * FROM vessels;` — returns empty result (no rows, but table exists). Run `SELECT * FROM geometry_columns;` — shows `vessel_positions.geom` and `eca_zones.boundary`.

**Status:** `[x]`

---

### Cell 1.7 — Row Level Security Policies
**What:** Enable RLS on all tables and create policies for anon (read) and service_role (write) access.
**Inputs:** Cell 1.6 complete
**Outputs:**
- SQL migration file: `supabase/migrations/002_rls.sql`
- RLS enabled on all 9 tables
- Anon key can SELECT on all tables (read-only for the browser)
- Service role key can INSERT/UPDATE/DELETE on all tables (for API routes)

**Verify:** Using the anon key, `supabase.from('vessels').select()` returns empty array (not an auth error). Using the anon key, `supabase.from('vessels').insert({...})` returns a permission error. Using the service role key, insert succeeds.

**Status:** `[x]`

---

### Cell 1.8 — Supabase Realtime Configuration
**What:** Enable Realtime on the tables that need live push: `vessel_positions`, `vessel_routes`, `weather_grid`.
**Inputs:** Cell 1.7 complete
**Outputs:**
- Realtime publication enabled for `vessel_positions`, `vessel_routes`, `weather_grid`
- SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE vessel_positions, vessel_routes, weather_grid;`

**Verify:** In the Supabase dashboard, under Database → Replication, confirm the three tables are listed under `supabase_realtime`. Insert a test row into `vessel_positions` via SQL editor while a browser console is subscribed to the channel — the console logs the new row.

**Status:** `[x]`

---

### Cell 1.9 — Constants File
**What:** Define application constants — corridors, vessel types, CII thresholds, color codes.
**Inputs:** Cell 1.5 complete
**Outputs:**
- `lib/constants.ts` containing:
  - `CORRIDORS` — array of 6 corridor objects (name, color, port pairs)
  - `VESSEL_TYPES` — 'container' | 'tanker' | 'bulk_carrier'
  - `CII_THRESHOLDS` — { A: 0.0042, B: 0.0049, C: 0.0057, D: 0.0066 }
  - `VESSEL_STATUS_COLORS` — { underway: green, slow: amber, deviation: red }
  - `VLSFO_EMISSION_FACTOR` = 3.206

**Verify:** `npm run build` compiles. Constants importable from any file.

**Status:** `[x]`

---

### Cell 1.10 — Seed Data: Vessels & Ports
**What:** Create seed data for the 12 vessels and 10 ports. Write a seed script that inserts them into Supabase.
**Inputs:** Cell 1.6, Cell 1.9 complete
**Outputs:**
- `lib/seed/vessels.ts` — 12 vessel objects (4 container, 4 tanker, 4 bulk carrier) with realistic IMO numbers, names, flags, DWT, LOA
- `lib/seed/ports.ts` — 10 port objects with real coordinates, UN/LOCODE, country, berth counts
- `lib/seed/index.ts` — runnable script that inserts vessels and ports into Supabase using the service role key
- `package.json` script: `"seed": "npx tsx lib/seed/index.ts"`

**Verify:** Run `npm run seed`. Query Supabase: `SELECT count(*) FROM vessels;` → 12. `SELECT count(*) FROM ports;` → 10. Each vessel has a valid IMO number. Each port has real lat/lng coordinates.

**Status:** `[x]`

---

### Cell 1.11 — Seed Data: ECA Zones
**What:** Insert the 4 ECA zone polygons as PostGIS geometries.
**Inputs:** Cell 1.10 complete
**Outputs:**
- `lib/seed/eca-zones.ts` — 4 ECA zone polygon definitions:
  - Baltic Sea ECA
  - North Sea ECA
  - North American ECA
  - US Caribbean ECA
- Seed script updated to insert ECA zones with `ST_GeomFromGeoJSON()`

**Verify:** Run seed. `SELECT count(*) FROM eca_zones;` → 4. `SELECT name, ST_AsText(boundary) FROM eca_zones;` returns valid polygon WKT for each zone.

**Status:** `[x]`

---

### Cell 1.12 — Seed Data: Voyages, Positions & Routes
**What:** Generate historical voyage data, position tracks, and route lines for all 12 vessels across the 6 corridors.
**Inputs:** Cell 1.11 complete
**Outputs:**
- `lib/seed/voyages.ts` — 12 active voyages (one per vessel), each assigned to a corridor with realistic departure times, ETAs, cargo TEU, fuel consumed, distance
- `lib/seed/positions.ts` — 30 days of position history per vessel (one position every 60 minutes, interpolated along the corridor great-circle path) = ~720 positions per vessel = ~8,640 total rows
- `lib/seed/routes.ts` — One GeoJSON LineString route per voyage (waypoints along the corridor)
- Seed script inserts all

**Verify:** `SELECT count(*) FROM voyages;` → 12. `SELECT count(*) FROM vessel_positions;` → ~8,640. `SELECT count(*) FROM vessel_routes;` → 12. Positions for vessel #1 trace a path from origin to current position.

**Status:** `[x]`

---

### Cell 1.13 — Seed Data: Fuel Prices & Weather (Static)
**What:** Insert 30 days of historical fuel prices and a single weather grid snapshot.
**Inputs:** Cell 1.12 complete
**Outputs:**
- `lib/seed/fuel-prices.ts` — 30 daily VLSFO + HSFO price entries (60 rows total) with realistic market values
- `lib/seed/weather.ts` — One weather grid snapshot: 20–30 grid points across active corridors with wind speed, direction, wave height, Beaufort
- Seed script inserts all

**Verify:** `SELECT count(*) FROM fuel_prices;` → 60. `SELECT count(*) FROM weather_grid;` → ~25. Fuel prices show a realistic daily range ($550–650/MT for VLSFO).

**Status:** `[x]`

---

### Cell 1.14 — CII Calculator Function
**What:** Write the TypeScript CII calculation function as a pure, testable function.
**Inputs:** Cell 1.9 complete
**Outputs:**
- `lib/cii.ts` — exports `calcCII(voyage: { fuelConsumedMT, distanceNM, capacityDWT }) → { attained: number, rating: 'A'|'B'|'C'|'D'|'E' }`
- Uses `VLSFO_EMISSION_FACTOR` from constants
- Uses `CII_THRESHOLDS` from constants

**Verify:** Manual test: `calcCII({ fuelConsumedMT: 500, distanceNM: 5000, capacityDWT: 80000 })` → `attained ≈ 0.004008` → rating `'A'`. Adjust inputs to verify B, C, D, E thresholds each return correctly.

**Status:** `[x]`

---

### Cell 1.15 — Verify Full Foundation
**What:** End-to-end check of the entire foundation phase.
**Inputs:** All cells 1.1–1.14 complete
**Outputs:** Nothing new built. This is a verification cell.

**Verify checklist:**
- [ ] `npm run dev` → app loads at localhost:3000
- [ ] `npm run build` → zero errors
- [ ] `.env.local` has real Supabase credentials
- [ ] Supabase has 9 tables, all with RLS enabled
- [ ] Realtime enabled on `vessel_positions`, `vessel_routes`, `weather_grid`
- [ ] `npm run seed` populates all tables with test data
- [ ] `calcCII()` returns correct ratings for edge cases
- [ ] All TypeScript types compile without errors
- [ ] PostGIS spatial queries work: `SELECT v.name FROM vessels v JOIN vessel_positions vp ON v.id = vp.vessel_id WHERE ST_DWithin(vp.geom, (SELECT boundary FROM eca_zones WHERE name='North Sea ECA'), 0) LIMIT 1;`

**Status:** `[x]`

---

## Phase 2 — App Shell & Navigation

The app gets its layout, navigation sidebar, and page stubs. No data display yet — just the routing skeleton and visual frame.

---

### Cell 2.0 — Static Design Demo (HTML Prototype)
**What:** Build a standalone HTML/CSS/JS prototype that locks in the editorial visual language before any Tailwind tokens are wired into the app. The demo lives in `References/` and doubles as a design reference for Cell 2.1.
**Inputs:** Phase 1 complete
**Outputs:**
- `References/design-demo.html` — single-file page, no build step, opens in any browser. Contains:
  - Masthead strip with dateline (WSJ-style rule + small caps)
  - Editorial hero with serif headline, kicker, deck, and accent-italic treatment
  - Numbered section spine (`01/`, `02/`, `03/`) borrowed from DHQ portfolio
  - Two-column editorial intro with drop-cap and inline SVG illustration (container ship + compass rose, hand-drawn feel, no external assets)
  - Four-up stat grid (TEU, speed, bunker cost, alerts) with editorial rules
  - Pullquote block with oxblood quotation marks
  - Fleet table with CII rating badges (A–E)
- Palette explicitly **not** cream: cool paper white `#f4f1ec` + ink black `#111418` + oxblood accent `#8b2e2a` + steel-blue ocean `#1b3a55`
- Typography: Playfair/Georgia serif for headlines and body editorial, system sans for UI chrome, JetBrains Mono for tabular data

**Verify:** `References/shipping-map.html` serves as the approved design prototype. Its visual language (cream `#F3EDE0`, ink `#1A1610`, red `#C41230`, Georgia serif, Courier New monospace, 0.5px rules, translucent panels) is the source of truth for Cell 2.1.

**Status:** `[x]`

---

### Cell 2.1 — Design Tokens & Global Styles
**What:** Define the WSJ-inspired design system as Tailwind config and CSS custom properties.
**Inputs:** Phase 1 complete
**Outputs:**
- `tailwind.config.ts` updated with custom colors, fonts, spacing:
  - Colors: cream background, steel-blue ocean, amber/green/red status, muted grays
  - Font: Georgia (serif) for headings, system sans-serif for body/data
- `app/globals.css` — base styles, CSS custom properties for the palette

**Verify:** App renders with cream background, Georgia heading font. No Tailwind purge warnings.

**Status:** `[x]`

---

### Cell 2.2 — Navigation Sidebar Component
**What:** Build the sidebar navigation component with links to all 7 pages.
**Inputs:** Cell 2.1 complete
**Outputs:**
- `components/ui/Sidebar.tsx` — vertical nav with:
  - App logo/title at top
  - Links: Command Center, Fleet Map, Voyages, Fuel, Environment, Scenarios, Analytics
  - Active state highlighting (reads current pathname)
  - Collapsible on mobile (hamburger toggle)

**Verify:** Sidebar renders on all pages. Clicking each link navigates to the correct route (pages can be blank stubs). Active link is visually distinct. Sidebar collapses on < 768px width.

**Status:** `[x]`

---

### Cell 2.3 — Root Layout Integration
**What:** Wire the sidebar into the root layout so every page shares it.
**Inputs:** Cell 2.2 complete
**Outputs:**
- `app/layout.tsx` updated: sidebar on the left, main content area on the right
- Content area fills remaining width with proper padding
- Page metadata (title, description)

**Verify:** Every route shows the sidebar. Content area is scrollable independently. Layout doesn't break at any viewport width.

**Status:** `[x]`

---

### Cell 2.4 — Page Stubs (All 7 Routes)
**What:** Create placeholder pages for every route with just a heading and "Coming soon" text.
**Inputs:** Cell 2.3 complete
**Outputs:**
- `app/page.tsx` — "Command Center"
- `app/map/page.tsx` — "Fleet Map"
- `app/voyages/page.tsx` — "Voyages"
- `app/fuel/page.tsx` — "Fuel"
- `app/environment/page.tsx` — "Environment"
- `app/scenarios/page.tsx` — "Scenarios"
- `app/analytics/page.tsx` — "Analytics"

**Verify:** Navigate to each route via sidebar. Each page shows its heading. No 404s. No layout shift.

**Status:** `[x]`

---

### Cell 2.5 — Reusable UI Components
**What:** Build the base UI components that will be reused across all pages.
**Inputs:** Cell 2.1 complete
**Outputs:**
- `components/ui/Card.tsx` — bordered card container with optional title, padding
- `components/ui/Badge.tsx` — small colored label (for CII ratings, vessel status)
- `components/ui/LoadingSpinner.tsx` — loading state indicator

**Verify:** Import and render each component in a stub page. Card shows border + title. Badge shows colored text. Spinner animates. All match the design token palette.

**Status:** `[x]`

---

### Cell 2.6 — Verify App Shell
**What:** End-to-end check of the app shell.
**Inputs:** All cells 2.1–2.5 complete
**Outputs:** Nothing new.

**Verify checklist:**
- [ ] App loads with sidebar + content layout
- [ ] All 7 routes are navigable
- [ ] Design tokens (colors, fonts) are consistent
- [ ] Mobile responsive — sidebar collapses
- [ ] `npm run build` → zero errors
- [ ] UI components (Card, Badge, Spinner) render correctly

**Status:** `[x]`

---

## Phase 3 — The Map (Static Data)

The map renders with seed data. No live feeds, no Realtime subscriptions yet. The goal is: vessel markers, route lines, ECA zones, port markers, and a click-to-panel interaction — all from Supabase seed data fetched at page load.

---

### Cell 3.1 — Install Map Dependencies
**What:** Install Leaflet and its React wrapper. Configure for Next.js (dynamic import, no SSR).
**Inputs:** Phase 2 complete
**Outputs:**
- `leaflet`, `react-leaflet`, `@types/leaflet` in `package.json`
- Leaflet CSS imported in `app/globals.css` or layout
- Confirmed dynamic import pattern works (Leaflet needs `window`)

**Verify:** A minimal `<MapContainer>` renders on `/map` with default OpenStreetMap tiles. No SSR hydration errors.

**Status:** `[x]`

---

### Cell 3.2 — OpenSeaMap Tile Layer
**What:** Replace default tiles with OpenSeaMap nautical chart tiles. Add base land/ocean tiles underneath.
**Inputs:** Cell 3.1 complete
**Outputs:**
- `components/map/FleetMap.tsx` — main map component with:
  - Base layer: OpenStreetMap or CartoDB Positron (clean land)
  - Overlay: OpenSeaMap tiles (nautical features: depth, buoys, traffic lanes)
  - Default center: Atlantic Ocean view showing major shipping lanes
  - Default zoom: world overview (~zoom 3)

**Verify:** Map shows nautical features (depth contours, buoy symbols) when zoomed into a port area like Rotterdam or Singapore.

**Status:** `[x]`

---

### Cell 3.3 — Vessel Markers (Static)
**What:** Fetch vessels + their latest position from Supabase, render as oriented markers on the map.
**Inputs:** Cell 3.2, Cell 1.12 complete (seed positions exist)
**Outputs:**
- `components/map/VesselMarker.tsx` — custom Leaflet marker:
  - Arrow/triangle icon rotated by `heading_deg`
  - Color: green (underway), amber (< 10 kn), red (stationary/deviation)
  - Size scales with vessel `dwt_capacity` (3 size classes)
  - Tooltip on hover: vessel name, speed, heading
- `hooks/useFleetPositions.ts` — fetches latest position per vessel from Supabase on mount (no Realtime yet)
- `FleetMap.tsx` updated to render `VesselMarker` for each position

**Verify:** 12 vessel markers visible on the map at their seed positions. Markers point in the correct heading direction. Hover shows name + speed.

**Status:** `[x]`

---

### Cell 3.4 — Route Lines (Static)
**What:** Fetch active routes from Supabase, render as GeoJSON polylines on the map.
**Inputs:** Cell 3.3 complete
**Outputs:**
- `components/map/RouteLayer.tsx` — renders GeoJSON routes:
  - Solid line for traveled portion (origin → vessel's current position)
  - Dashed line for planned portion (current position → destination)
  - Color per corridor (uses `CORRIDORS` color map from constants)
- `FleetMap.tsx` updated to include `RouteLayer`

**Verify:** 12 route lines visible, each connecting origin port to destination via waypoints. Solid/dashed split is visually distinct. Colors differ by corridor.

**Status:** `[x]`

---

### Cell 3.5 — ECA Zone Overlays
**What:** Fetch ECA zone polygons from Supabase, render as semi-transparent overlays on the map.
**Inputs:** Cell 3.4 complete
**Outputs:**
- `components/map/ECALayer.tsx` — renders PostGIS polygon boundaries:
  - Semi-transparent fill (hatched or 20% opacity)
  - Dashed border
  - Label with zone name on hover
- `FleetMap.tsx` updated to include `ECALayer`

**Verify:** 4 ECA zones render as shaded areas. balticsea, North Sea, NA coast, and Caribbean are visually correct geographic shapes.

**Status:** `[x]`

---

### Cell 3.6 — Port Markers
**What:** Fetch ports from Supabase, render as small dot markers with labels.
**Inputs:** Cell 3.5 complete
**Outputs:**
- Port markers as small circle markers (not vessel-like)
- Label with port name visible at higher zoom levels
- Tooltip on hover: port name, country, berth count
- `FleetMap.tsx` updated to include port markers

**Verify:** 10 port markers visible at appropriate zoom. Labels don't overlap vessel markers. Hover shows port info.

**Status:** `[x]`

---

### Cell 3.7 — Vessel Detail Panel (Click Interaction)
**What:** Clicking a vessel marker opens a slide-in side panel with vessel details.
**Inputs:** Cell 3.6 complete
**Outputs:**
- `components/map/VesselPanel.tsx` — slide-in panel from the right:
  - Vessel name, IMO, MMSI, flag, type
  - Current position: lat, lng, speed, heading
  - Draft, DWT capacity
  - Current voyage: origin → destination, ETA
  - Cargo: TEU count + utilization %
  - Fuel: burn rate (from voyage data)
  - CII: attained value + letter rating badge
  - Placeholder buttons: [Reroute] [Bunker Plan] [B/L Docs] (non-functional yet)
- Clicking another vessel switches the panel. Clicking the map (not a vessel) closes it.

**Verify:** Click vessel on map → panel slides in with correct data from Supabase. Click different vessel → panel updates. Click empty map → panel closes. Panel doesn't overlap map controls.

**Status:** `[x]`

---

### Cell 3.8 — Map Layer Toggle Controls
**What:** Add toggle buttons to show/hide map layers (Routes, ECA Zones, Ports, Weather placeholder).
**Inputs:** Cell 3.7 complete
**Outputs:**
- Toggle control UI (top-right of map, Leaflet control style)
- Toggles for: Routes (on by default), ECA Zones (on), Ports (on), Weather (off, placeholder)
- State persists during session (not across page reloads)

**Verify:** Each toggle shows/hides its layer. Defaults are correct. Toggling doesn't cause map re-render flicker.

**Status:** `[x]`

---

### Cell 3.9 — Full-Screen Map Page Layout
**What:** The `/map` page fills the entire content area (no extra padding/chrome). Map controls are overlaid.
**Inputs:** Cell 3.8 complete
**Outputs:**
- `/map` page renders `FleetMap` at 100% width × 100% height of content area
- No scroll bars on the map page
- Sidebar remains accessible
- Vessel panel overlays the map (doesn't shrink it)

**Verify:** Map fills available space. Resizing browser window → map resizes. No scroll bars. Panel slides over map, not beside it.

**Status:** `[x]`

---

### Cell 3.10 — Verify Static Map
**What:** End-to-end check of the complete static map.
**Inputs:** All cells 3.1–3.9 complete
**Outputs:** Nothing new.

**Verify checklist:**
- [ ] Map renders with OpenSeaMap nautical tiles
- [ ] 12 vessel markers at correct positions, oriented by heading
- [ ] 12 route lines with solid/dashed split
- [ ] 4 ECA zones as shaded polygons
- [ ] 10 port markers with labels
- [ ] Click vessel → detail panel with correct data
- [ ] Layer toggles work
- [ ] Map fills the page, no scroll bars
- [ ] `npm run build` → zero errors
- [ ] No hydration errors (Leaflet dynamic import)

**Status:** `[x]`

---

## Phase 4 — Live Data Pipeline

The map becomes live. AIS positions flow from an external source into Supabase, and Supabase Realtime pushes them to the browser. Vessel markers move without page refresh.

---

### Cell 4.1 — AIS Sync API Route (Cron Endpoint)
**What:** Create the `/api/ais-sync` API route that fetches vessel positions from AISStream.io and upserts them into Supabase.
**Inputs:** Phase 3 complete, AISStream.io API key obtained
**Outputs:**
- `app/api/ais-sync/route.ts`:
  - Validates `CRON_SECRET` header (blocks unauthorized calls)
  - Reads vessel IMO list from `vessels` table
  - Fetches current positions from AISStream.io API
  - Upserts into `vessel_positions` with `ST_SetSRID(ST_MakePoint(lng, lat), 4326)` for the geom column
  - Returns JSON summary: `{ updated: N, errors: [] }`

**Verify:** Call the endpoint manually with the cron secret header. Check `vessel_positions` table — new rows with fresh timestamps appear. Response shows count of updated vessels.

**Status:** `[ ]`

---

### Cell 4.2 — Vercel Cron Configuration
**What:** Configure `vercel.json` with cron schedules for all scheduled endpoints.
**Inputs:** Cell 4.1 complete
**Outputs:**
- `vercel.json` with cron definitions:
  ```json
  {
    "crons": [
      { "path": "/api/ais-sync", "schedule": "*/30 * * * *" },
      { "path": "/api/weather-sync", "schedule": "0 * * * *" },
      { "path": "/api/fuel-sync", "schedule": "0 0 * * *" },
      { "path": "/api/cii-nightly", "schedule": "0 0 * * *" }
    ]
  }
  ```
- Note: weather-sync, fuel-sync, and cii-nightly routes don't exist yet — that's fine, the cron config is just the schedule declaration

**Verify:** `vercel.json` passes JSON linting. The ais-sync cron path matches the actual API route.

**Status:** `[ ]`

---

### Cell 4.3 — Supabase Realtime Hook (Live Positions)
**What:** Update `useFleetPositions` hook to subscribe to Supabase Realtime for live position updates instead of just fetching once.
**Inputs:** Cell 4.1, Cell 1.8 complete
**Outputs:**
- `hooks/useFleetPositions.ts` updated:
  - Fetches latest positions on mount (existing behavior)
  - Subscribes to `fleet-positions` channel for `vessel_positions` INSERT events
  - On new position: updates the matching vessel's position in state
  - Cleans up subscription on unmount

**Verify:** Open the map in a browser. In another tab, manually insert a position row into Supabase for one vessel with a new lat/lng. The vessel marker on the map moves to the new position without page refresh.

**Status:** `[ ]`

---

### Cell 4.4 — Vessel Marker Animation
**What:** When a vessel's position updates via Realtime, animate the marker smoothly from old to new position instead of jumping.
**Inputs:** Cell 4.3 complete
**Outputs:**
- `VesselMarker.tsx` updated: on position change, transition marker lat/lng over ~1 second
- Heading rotation also transitions smoothly

**Verify:** Insert a position update for a vessel with a slightly different lat/lng. Marker slides to new position over ~1 second rather than jumping.

**Status:** `[ ]`

---

### Cell 4.5 — Verify Live Pipeline
**What:** End-to-end verification of the full live data flow.
**Inputs:** All cells 4.1–4.4 complete
**Outputs:** Nothing new.

**Verify checklist:**
- [ ] Call `/api/ais-sync` manually → new positions in Supabase
- [ ] Map browser receives Realtime event → marker moves
- [ ] Marker animation is smooth
- [ ] Unauthorized calls to `/api/ais-sync` (no cron secret) are rejected
- [ ] `vercel.json` cron config is valid
- [ ] No memory leaks — Realtime subscription cleans up on unmount

**Status:** `[ ]`

---

## Phase 5 — Command Center Dashboard

The `/` page becomes the ops home screen with live KPIs, CII ratings, fuel ticker, alerts, and a corridor volume chart — all fed by Supabase queries.

---

### Cell 5.1 — KPI Bar Component
**What:** Build the top-of-page KPI bar showing fleet summary stats.
**Inputs:** Phase 4 complete
**Outputs:**
- `components/dashboard/KPIBar.tsx` — horizontal bar with 4 cards:
  - TEU in transit (sum of `cargo_teu` from active voyages)
  - Average fleet speed (mean of latest `speed_kn` per vessel)
  - Bunker cost/day (calculated from burn rates × latest fuel price)
  - Active alerts count (vessels with deviation or low-speed status)
- Data fetched from Supabase on page load

**Verify:** KPI bar renders on `/` with 4 values from seed data. Values are numerically correct against the seed data.

**Status:** `[ ]`

---

### Cell 5.2 — CII Ratings Table
**What:** Build a table showing every vessel's CII rating with color-coded badges.
**Inputs:** Cell 5.1 complete
**Outputs:**
- `components/dashboard/CIITable.tsx` — table with columns:
  - Vessel name
  - Type (container/tanker/bulk)
  - Attained CII (numeric)
  - Rating (A–E badge, colored green→red)
  - YTD trend indicator (↑/↓/→)
- Sortable by rating column
- Data from `vessel_ratings` (generate seed ratings using `calcCII()` if not already seeded)

**Verify:** Table shows 12 vessels with CII ratings. Badges are correctly colored. Sorting works.

**Status:** `[ ]`

---

### Cell 5.3 — Fuel Price Ticker
**What:** Build a horizontal ticker strip showing latest VLSFO and HSFO prices.
**Inputs:** Cell 5.2 complete
**Outputs:**
- `components/dashboard/FuelTicker.tsx` — compact strip:
  - Latest VLSFO price + daily change (↑/↓ with delta)
  - Latest HSFO price + daily change
  - Data from `fuel_prices` table

**Verify:** Ticker shows prices from seed data. Daily change is calculated correctly from the last two entries.

**Status:** `[ ]`

---

### Cell 5.4 — Alerts Feed
**What:** Build a live alerts list showing operational warnings.
**Inputs:** Cell 5.3 complete
**Outputs:**
- `components/dashboard/AlertsFeed.tsx` — scrollable list of alerts:
  - Derived from vessel state: speed < 5 kn = "Slow speed alert", heading change > 30° = "Course deviation", vessel inside ECA = "ECA zone entry"
  - Each alert: timestamp, vessel name, alert type, severity badge
  - Sorted by most recent first
- Alert logic lives in a utility function, not hardcoded

**Verify:** Alerts feed shows entries derived from seed data. At least one vessel triggers an alert (adjust seed data if needed).

**Status:** `[ ]`

---

### Cell 5.5 — Corridor Volume Chart
**What:** Build a bar chart showing cargo volume (TEU) by corridor.
**Inputs:** Cell 5.4 complete, Chart.js installed
**Outputs:**
- `chart.js` and `react-chartjs-2` added to `package.json`
- `components/dashboard/CorridorChart.tsx` — horizontal bar chart:
  - One bar per corridor (6 corridors)
  - Bar value = sum of `cargo_teu` for voyages on that corridor
  - Corridor colors from `CORRIDORS` constants
- Uses Chart.js with the WSJ design tokens (cream bg, serif labels)

**Verify:** Chart renders 6 bars with correct TEU values from seed voyages. Colors match corridor definitions.

**Status:** `[ ]`

---

### Cell 5.6 — Command Center Page Assembly
**What:** Compose all dashboard components into the `/` page layout.
**Inputs:** Cells 5.1–5.5 complete
**Outputs:**
- `app/page.tsx` updated with layout:
  - KPI bar at top (full width)
  - Left column: CII table (main content)
  - Right column: Alerts feed
  - Bottom: Fuel ticker + Corridor chart side by side

**Verify:** Command Center page loads with all 5 components visible. No layout overflow. Responsive at tablet/mobile widths.

**Status:** `[ ]`

---

### Cell 5.7 — Verify Command Center
**What:** End-to-end check.
**Inputs:** Cell 5.6 complete
**Outputs:** Nothing new.

**Verify checklist:**
- [ ] KPI bar shows 4 correct values
- [ ] CII table shows 12 vessels, sortable
- [ ] Fuel ticker shows VLSFO/HSFO with change indicators
- [ ] Alerts feed shows derived alerts
- [ ] Corridor chart shows 6 bars with correct values
- [ ] Page layout is responsive
- [ ] `npm run build` → zero errors

**Status:** `[ ]`

---

## Phase 6 — Weather & Fuel Integration

Connect Open-Meteo and EIA APIs. Weather overlay on the map. Fuel sync populates real prices. Bunker dashboard page.

---

### Cell 6.1 — Weather Sync API Route
**What:** Create `/api/weather-sync` to fetch wind + wave data from Open-Meteo and write to Supabase.
**Inputs:** Phase 5 complete
**Outputs:**
- `app/api/weather-sync/route.ts`:
  - Validates `CRON_SECRET`
  - Fetches Open-Meteo marine weather for a grid of points across active corridors
  - Writes to `weather_grid` table (upsert by lat/lng + timestamp)
  - Returns `{ points_updated: N }`

**Verify:** Call endpoint manually. `weather_grid` table has new rows with real wind and wave data.

**Status:** `[ ]`

---

### Cell 6.2 — Weather Map Overlay
**What:** Render weather data as a visual overlay on the fleet map.
**Inputs:** Cell 6.1 complete
**Outputs:**
- `components/map/WeatherLayer.tsx`:
  - Wind barbs or arrows at grid points showing direction + speed
  - Wave height as opacity-blended colored circles (blue→orange by intensity)
  - Color scale legend
- `hooks/useWeatherGrid.ts` — fetches latest weather grid from Supabase
- Wired into `FleetMap.tsx` layer toggles (off by default)

**Verify:** Toggle weather layer on → wind indicators and wave blobs appear across the map. Data matches values in `weather_grid` table.

**Status:** `[ ]`

---

### Cell 6.3 — Fuel Sync API Route
**What:** Create `/api/fuel-sync` to fetch daily VLSFO/HSFO prices from EIA API.
**Inputs:** Phase 5 complete, EIA API key obtained
**Outputs:**
- `app/api/fuel-sync/route.ts`:
  - Validates `CRON_SECRET`
  - Fetches EIA petroleum price series
  - Inserts into `fuel_prices` table (VLSFO + HSFO rows)
  - Returns `{ prices_inserted: N }`

**Verify:** Call endpoint manually. `fuel_prices` has new rows with today's date and real price data.

**Status:** `[ ]`

---

### Cell 6.4 — Fuel Dashboard Page
**What:** Build the `/fuel` page with bunker cost analysis.
**Inputs:** Cell 6.3 complete
**Outputs:**
- `app/fuel/page.tsx` with:
  - Vessel list with columns: name, current burn rate (MT/day), optimal burn rate, delta, daily cost
  - Slow-steam recommendation indicator per vessel
  - 30-day fuel price chart (VLSFO + HSFO lines, Chart.js)
  - Fleet fuel spend running total
- `hooks/useFuelPrices.ts` — fetches fuel price history from Supabase

**Verify:** Page loads with 12 vessels and their fuel stats. Price chart shows 30 days of data. Slow-steam recommendations appear for vessels burning above optimal.

**Status:** `[ ]`

---

### Cell 6.5 — Verify Weather & Fuel
**What:** End-to-end check.
**Inputs:** Cells 6.1–6.4 complete

**Verify checklist:**
- [ ] `/api/weather-sync` writes real weather data
- [ ] Weather overlay renders on map with toggle
- [ ] `/api/fuel-sync` writes real fuel prices
- [ ] `/fuel` page shows vessel burn rates + price chart
- [ ] Command Center fuel ticker now shows real prices (if fuel-sync has run)

**Status:** `[ ]`

---

## Phase 7 — CII & Voyage Management

Nightly CII calculation cron. Environment page. Voyage manager page.

---

### Cell 7.1 — CII Nightly API Route
**What:** Create `/api/cii-nightly` to compute CII ratings for all vessels.
**Inputs:** Phase 6 complete, Cell 1.14 (calcCII exists)
**Outputs:**
- `app/api/cii-nightly/route.ts`:
  - Validates `CRON_SECRET`
  - Pulls all voyages with fuel + distance data
  - Runs `calcCII()` per vessel
  - Upserts results into `vessel_ratings` (one row per vessel per period)
  - Returns `{ vessels_rated: N }`

**Verify:** Call endpoint manually. `vessel_ratings` has fresh rows with correct CII values matching the `calcCII()` formula.

**Status:** `[ ]`

---

### Cell 7.2 — Environment Page
**What:** Build the `/environment` page with CII compliance dashboard.
**Inputs:** Cell 7.1 complete
**Outputs:**
- `app/environment/page.tsx` with:
  - Fleet CII overview: count of vessels at each rating (A–E bar chart)
  - Per-vessel table: name, attained CII, required CII, rating badge, YTD trend
  - CO₂/day trending line chart (30 days)
  - Vessels needing slow-steam to close the year at CII-B or better (highlighted rows)

**Verify:** Page loads with CII data for all 12 vessels. Rating badges are correctly colored. Chart shows 30-day trend.

**Status:** `[ ]`

---

### Cell 7.3 — Voyage Manager Page
**What:** Build the `/voyages` page showing all active and recent voyages.
**Inputs:** Cell 7.2 complete
**Outputs:**
- `app/voyages/page.tsx` with:
  - Table: vessel name, origin → destination, departure date, ETA, actual arrival (if complete), cargo TEU, fuel consumed, distance
  - Status badges: In Transit, Arrived, Delayed
  - Filter by corridor dropdown
  - Filter by vessel type
  - Click row → detail view or link to vessel on map
- `hooks/useVoyages.ts` — fetches from `voyages` table with vessel + port joins

**Verify:** Page shows 12 voyages with correct data. Filters narrow the list. Click navigates to map with vessel selected.

**Status:** `[ ]`

---

### Cell 7.4 — Verify CII & Voyages
**What:** End-to-end check.
**Inputs:** Cells 7.1–7.3 complete

**Verify checklist:**
- [ ] `/api/cii-nightly` computes correct ratings
- [ ] `/environment` shows fleet CII overview + per-vessel table
- [ ] CO₂ trend chart renders
- [ ] `/voyages` shows all voyages with working filters
- [ ] Command Center CII table reflects nightly results

**Status:** `[ ]`

---

## Phase 8 — Route Optimizer & Scenario Engine

The "wow factor"— reroute a vessel with an LP solver, animate the new route, show cost/emissions deltas.

---

### Cell 8.1 — Install glpk.js
**What:** Install the WASM LP solver and verify it runs in a Next.js API route.
**Inputs:** Phase 7 complete
**Outputs:**
- `glpk.js` in `package.json`
- Test API route that solves a trivial LP problem and returns the result

**Verify:** Call test endpoint → returns correct LP solution. No WASM loading errors in serverless environment.

**Status:** `[ ]`

---

### Cell 8.2 — Optimize API Route
**What:** Build `/api/optimize` — the route optimizer endpoint.
**Inputs:** Cell 8.1 complete
**Outputs:**
- `app/api/optimize/route.ts`:
  - Accepts: `{ vesselId, waypoints, fuelPrices }`
  - Formulates LP: minimize total fuel cost across waypoint segments
  - Constraints: arrival time ≤ ETA deadline, tank level ≥ 0, tank ≤ capacity
  - Solves via `glpk.js`
  - Returns GeoJSON route + cost summary + emissions delta
  - Writes new route to `vessel_routes` in Supabase

**Verify:** POST to `/api/optimize` with a test vessel → returns valid GeoJSON route. New row appears in `vessel_routes`. Cost summary includes fuel cost and CO₂ estimate.

**Status:** `[ ]`

---

### Cell 8.3 — Reroute Button in Vessel Panel
**What:** Wire the [Reroute] button in the vessel detail panel to call `/api/optimize`.
**Inputs:** Cell 8.2 complete
**Outputs:**
- `VesselPanel.tsx` [Reroute] button:
  - Shows loading state while optimizer runs
  - Calls `/api/optimize` with vessel's current state
  - On success: new route appears on map via Realtime subscription
  - Shows cost delta card: before vs. after fuel cost + CO₂

**Verify:** Click [Reroute] on a vessel → loading spinner → new route line appears on map → cost delta card shows meaningful numbers.

**Status:** `[ ]`

---

### Cell 8.4 — Scenario Engine Page
**What:** Build the `/scenarios` page for what-if rerouting.
**Inputs:** Cell 8.3 complete
**Outputs:**
- `app/scenarios/page.tsx` with:
  - Vessel selector dropdown
  - Scenario type: Suez closure, port congestion, weather avoidance (each pre-configures waypoint modifications)
  - Duration slider (how many days the disruption lasts)
  - [Run Scenario] button → calls `/api/optimize` with modified constraints
  - Embedded mini-map showing original vs. new route
  - Before/after comparison card: cost, time, emissions, distance

**Verify:** Select vessel + scenario type → Run → mini-map shows two routes (original vs. rerouted). Comparison card shows meaningful deltas.

**Status:** `[ ]`

---

### Cell 8.5 — Verify Optimizer & Scenarios
**What:** End-to-end check.
**Inputs:** Cells 8.1–8.4 complete

**Verify checklist:**
- [ ] `/api/optimize` solves LP and returns valid GeoJSON
- [ ] Reroute button works from vessel panel
- [ ] New route appears on map via Realtime
- [ ] Scenario page runs what-if analysis
- [ ] Before/after comparison shows correct deltas
- [ ] Optimizer handles edge cases (no waypoints, single-leg voyage)

**Status:** `[ ]`

---

## Phase 9 — Analytics & Polish

Built-in analytics charts, responsive polish, error handling, and production readiness.

---

### Cell 9.1 — Analytics Page: Lane P&L Chart
**What:** Build the first analytics chart — profit/loss by shipping lane.
**Inputs:** Phase 8 complete
**Outputs:**
- `app/analytics/page.tsx` with:
  - Lane P&L bar chart (revenue vs. cost per corridor)
  - Revenue estimated from cargo TEU × market rate
  - Cost from fuel consumed × fuel price
  - Net margin % per corridor

**Verify:** Chart shows 6 corridors with revenue, cost, margin. Values derived from seed/live data.

**Status:** `[ ]`

---

### Cell 9.2 — Analytics Page: Additional Charts
**What:** Add remaining analytics charts.
**Inputs:** Cell 9.1 complete
**Outputs:**
- Fuel cost over time (30-day line chart, VLSFO + HSFO)
- CII trend by fleet (30-day line, average CII per week)
- Cargo volume vs. capacity (stacked bar, utilized vs. available TEU)

**Verify:** All charts render with data. No empty states.

**Status:** `[ ]`

---

### Cell 9.3 — Error Handling & Loading States
**What:** Add consistent error and loading states across all pages.
**Inputs:** Cell 9.2 complete
**Outputs:**
- Every data-fetching component shows `LoadingSpinner` while loading
- API errors show a user-friendly message (not a raw stack trace)
- Supabase connection failure shows a reconnection prompt
- API routes return proper HTTP status codes (400, 401, 500)

**Verify:** Disconnect from Supabase (invalid key) → pages show error state, not blank. API routes return correct status codes on bad input.

**Status:** `[ ]`

---

### Cell 9.4 — Responsive Layout Polish
**What:** Verify and fix responsive behavior across all pages.
**Inputs:** Cell 9.3 complete
**Outputs:**
- All pages functional at 1920px, 1440px, 1024px, 768px, 375px widths
- Map page: vessel panel stacks below map on mobile
- Dashboard: KPI cards stack vertically on mobile
- Tables: horizontal scroll on narrow screens
- Charts: resize without distortion

**Verify:** Test each page at each breakpoint. No overflow, no hidden content, no broken layouts.

**Status:** `[ ]`

---

### Cell 9.5 — Production Environment Setup
**What:** Prepare for Vercel production deployment.
**Inputs:** Cell 9.4 complete
**Outputs:**
- All environment variables set in Vercel dashboard (not in code)
- `next.config.js` — any production-specific settings (image domains, headers)
- `vercel.json` — cron schedules confirmed
- Build command verified: `npm run build` succeeds with production env vars

**Verify:** `npm run build` produces zero errors and zero warnings. All env vars documented in `.env.example`.

**Status:** `[ ]`

---

### Cell 9.6 — Deploy to Vercel
**What:** First production deployment.
**Inputs:** Cell 9.5 complete
**Outputs:**
- Git repo connected to Vercel
- Production deployment live at a `.vercel.app` URL
- All cron jobs registered and running
- Supabase connected with production credentials

**Verify:** Visit the production URL. All pages load. Cron jobs fire on schedule (check Vercel logs). Map shows vessel positions. Realtime updates work.

**Status:** `[ ]`

---

### Cell 9.7 — Final Verification
**What:** Complete end-to-end system check on production.
**Inputs:** Cell 9.6 complete
**Outputs:** Nothing new.

**Verify checklist:**
- [ ] Command Center: KPIs, CII table, fuel ticker, alerts, corridor chart — all live
- [ ] Fleet Map: vessels, routes, ECA zones, ports, weather toggle, vessel panel
- [ ] Realtime: position updates flow through without page refresh
- [ ] Voyages: table with filters, navigation to map
- [ ] Fuel: burn rate table, price chart, slow-steam recommendations
- [ ] Environment: CII fleet overview, trend chart
- [ ] Scenarios: what-if reroute with comparison
- [ ] Analytics: 4 charts with live data
- [ ] All cron jobs firing correctly
- [ ] Error states handled gracefully
- [ ] Responsive at all breakpoints
- [ ] No TypeScript errors, no console errors, no build warnings

**Status:** `[ ]`

---

## Cell Index (Quick Reference)

| Cell | Name | Phase | Status |
|------|------|-------|--------|
| 1.1 | Initialize Next.js Project | Foundation | `[x]` |
| 1.2 | Environment Configuration | Foundation | `[ ]` |
| 1.3 | Supabase Project Setup | Foundation | `[ ]` |
| 1.4 | Supabase Client Library | Foundation | `[ ]` |
| 1.5 | TypeScript Type Definitions | Foundation | `[ ]` |
| 1.6 | Database Schema: Core Tables | Foundation | `[ ]` |
| 1.7 | Row Level Security Policies | Foundation | `[ ]` |
| 1.8 | Supabase Realtime Configuration | Foundation | `[ ]` |
| 1.9 | Constants File | Foundation | `[ ]` |
| 1.10 | Seed Data: Vessels & Ports | Foundation | `[ ]` |
| 1.11 | Seed Data: ECA Zones | Foundation | `[ ]` |
| 1.12 | Seed Data: Voyages, Positions & Routes | Foundation | `[ ]` |
| 1.13 | Seed Data: Fuel Prices & Weather | Foundation | `[ ]` |
| 1.14 | CII Calculator Function | Foundation | `[ ]` |
| 1.15 | Verify Full Foundation | Foundation | `[ ]` |
| 2.1 | Design Tokens & Global Styles | App Shell | `[ ]` |
| 2.2 | Navigation Sidebar Component | App Shell | `[ ]` |
| 2.3 | Root Layout Integration | App Shell | `[ ]` |
| 2.4 | Page Stubs (All 7 Routes) | App Shell | `[ ]` |
| 2.5 | Reusable UI Components | App Shell | `[ ]` |
| 2.6 | Verify App Shell | App Shell | `[ ]` |
| 3.1 | Install Map Dependencies | Map (Static) | `[ ]` |
| 3.2 | OpenSeaMap Tile Layer | Map (Static) | `[ ]` |
| 3.3 | Vessel Markers (Static) | Map (Static) | `[ ]` |
| 3.4 | Route Lines (Static) | Map (Static) | `[ ]` |
| 3.5 | ECA Zone Overlays | Map (Static) | `[ ]` |
| 3.6 | Port Markers | Map (Static) | `[ ]` |
| 3.7 | Vessel Detail Panel | Map (Static) | `[ ]` |
| 3.8 | Map Layer Toggle Controls | Map (Static) | `[ ]` |
| 3.9 | Full-Screen Map Page Layout | Map (Static) | `[ ]` |
| 3.10 | Verify Static Map | Map (Static) | `[ ]` |
| 4.1 | AIS Sync API Route | Live Pipeline | `[ ]` |
| 4.2 | Vercel Cron Configuration | Live Pipeline | `[ ]` |
| 4.3 | Supabase Realtime Hook | Live Pipeline | `[ ]` |
| 4.4 | Vessel Marker Animation | Live Pipeline | `[ ]` |
| 4.5 | Verify Live Pipeline | Live Pipeline | `[ ]` |
| 5.1 | KPI Bar Component | Command Center | `[ ]` |
| 5.2 | CII Ratings Table | Command Center | `[ ]` |
| 5.3 | Fuel Price Ticker | Command Center | `[ ]` |
| 5.4 | Alerts Feed | Command Center | `[ ]` |
| 5.5 | Corridor Volume Chart | Command Center | `[ ]` |
| 5.6 | Command Center Page Assembly | Command Center | `[ ]` |
| 5.7 | Verify Command Center | Command Center | `[ ]` |
| 6.1 | Weather Sync API Route | Weather & Fuel | `[ ]` |
| 6.2 | Weather Map Overlay | Weather & Fuel | `[ ]` |
| 6.3 | Fuel Sync API Route | Weather & Fuel | `[ ]` |
| 6.4 | Fuel Dashboard Page | Weather & Fuel | `[ ]` |
| 6.5 | Verify Weather & Fuel | Weather & Fuel | `[ ]` |
| 7.1 | CII Nightly API Route | CII & Voyages | `[ ]` |
| 7.2 | Environment Page | CII & Voyages | `[ ]` |
| 7.3 | Voyage Manager Page | CII & Voyages | `[ ]` |
| 7.4 | Verify CII & Voyages | CII & Voyages | `[ ]` |
| 8.1 | Install glpk.js | Optimizer | `[ ]` |
| 8.2 | Optimize API Route | Optimizer | `[ ]` |
| 8.3 | Reroute Button in Vessel Panel | Optimizer | `[ ]` |
| 8.4 | Scenario Engine Page | Optimizer | `[ ]` |
| 8.5 | Verify Optimizer & Scenarios | Optimizer | `[ ]` |
| 9.1 | Analytics: Lane P&L Chart | Polish | `[ ]` |
| 9.2 | Analytics: Additional Charts | Polish | `[ ]` |
| 9.3 | Error Handling & Loading States | Polish | `[ ]` |
| 9.4 | Responsive Layout Polish | Polish | `[ ]` |
| 9.5 | Production Environment Setup | Polish | `[ ]` |
| 9.6 | Deploy to Vercel | Polish | `[ ]` |
| 9.7 | Final Verification | Polish | `[ ]` |

**Total: 53 cells across 9 phases**
