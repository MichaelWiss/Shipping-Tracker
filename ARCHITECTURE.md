# Shipping-Tracker Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                           │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  AISStream   │  │  Open-Meteo   │  │ EIA API  │  │  OpenSeaMap  │   │
│  │  (WebSocket) │  │  (REST/free)  │  │  (REST)  │  │   (Tiles)    │   │
│  │              │  │              │  │          │  │              │   │
│  │ Real vessel  │  │ Wind, waves  │  │ VLSFO/   │  │ Nautical     │   │
│  │ positions    │  │ Beaufort     │  │ HSFO     │  │ chart tiles  │   │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘  └──────┬───────┘   │
│         │                 │               │               │           │
└─────────┼─────────────────┼───────────────┼───────────────┼───────────┘
          │                 │               │               │
          ▼                 ▼               ▼               │
┌─────────────────────────────────────────────────────────────────────────┐
│                      VERCEL (Next.js 14 App)                           │
│                                                                        │
│  ┌─────────────────── API Routes ──────────────────────┐               │
│  │                                                      │               │
│  │  /api/ais-sync         Cron: every 30–60 min        │               │
│  │  ├─ Fetch vessel positions from AISStream           │               │
│  │  └─ Upsert into Supabase vessel_positions           │               │
│  │                                                      │               │
│  │  /api/weather-sync     Cron: every 60 min           │               │
│  │  ├─ Fetch Open-Meteo wind + wave grid               │               │
│  │  └─ Write to Supabase weather_grid                  │               │
│  │                                                      │               │
│  │  /api/fuel-sync        Cron: daily at 00:00 UTC     │               │
│  │  ├─ Fetch EIA VLSFO/HSFO prices                    │               │
│  │  └─ Write to Supabase fuel_prices                   │               │
│  │                                                      │               │
│  │  /api/cii-nightly      Cron: daily at 00:00 UTC     │               │
│  │  ├─ Pull voyage_records from last 24h               │               │
│  │  ├─ Run calcCII() per vessel                        │               │
│  │  └─ Write to vessel_ratings                         │               │
│  │                                                      │               │
│  │  /api/optimize         On-demand (user clicks)      │               │
│  │  ├─ Receive vessel + waypoints + fuel prices        │               │
│  │  ├─ Solve LP via glpk.js (WASM)                    │               │
│  │  ├─ Return GeoJSON route                            │               │
│  │  └─ Write to vessel_routes in Supabase              │               │
│  │                                                      │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                        │
│  ┌─────────────────── Pages ───────────────────────────┐               │
│  │                                                      │               │
│  │  /              Command Center (KPIs, alerts, CII)  │               │
│  │  /map           Full-screen fleet map                │               │
│  │  /voyages       Voyage manager (OMS)                │               │
│  │  /fuel          Bunker optimizer                     │               │
│  │  /environment   CII & emissions desk                │               │
│  │  /scenarios     What-if reroute engine               │               │
│  │  /analytics     Built-in charts (Chart.js)          │               │
│  │                                                      │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                        │
│  ┌─────────────────── Shared Lib ──────────────────────┐               │
│  │                                                      │               │
│  │  lib/cii.ts           CII calculator (IMO formula)  │               │
│  │  lib/supabase.ts      Supabase client singleton     │               │
│  │  lib/types.ts         Shared TypeScript interfaces  │               │
│  │  hooks/useFleetPositions.ts   Realtime subscription │               │
│  │  hooks/useWeatherGrid.ts      Weather data hook     │               │
│  │                                                      │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │  Supabase JS Client
                              │  (REST + Realtime WebSocket)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (Backend-as-a-Service)                   │
│                                                                        │
│  ┌──────────────── Postgres + PostGIS ─────────────────┐               │
│  │                                                      │               │
│  │  vessels              Fleet registry (IMO, MMSI,    │               │
│  │                       flag, type, DWT, LOA)          │               │
│  │                                                      │               │
│  │  vessel_positions     AIS data with PostGIS geom    │               │
│  │                       (lat, lng, speed, heading)     │               │
│  │                                                      │               │
│  │  voyages              Active + historical legs       │               │
│  │                       (origin, dest, cargo, fuel)    │               │
│  │                                                      │               │
│  │  vessel_ratings       CII ratings (A–E, attained,   │               │
│  │                       CO₂ per period)                │               │
│  │                                                      │               │
│  │  vessel_routes        GeoJSON route lines per voyage │               │
│  │                                                      │               │
│  │  eca_zones            IMO ECA polygons (PostGIS)     │               │
│  │                                                      │               │
│  │  weather_grid         Wind + wave data per grid cell │               │
│  │                                                      │               │
│  │  fuel_prices          Daily VLSFO/HSFO prices        │               │
│  │                                                      │               │
│  │  ports                Port registry + berth info     │               │
│  │                                                      │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                        │
│  ┌──────────────── Realtime Engine ────────────────────┐               │
│  │                                                      │               │
│  │  Channels:                                           │               │
│  │    fleet-positions  →  vessel_positions INSERT       │               │
│  │    route-updates    →  vessel_routes INSERT/UPDATE   │               │
│  │    weather-updates  →  weather_grid INSERT           │               │
│  │    alerts           →  vessel alerts broadcast       │               │
│  │                                                      │               │
│  │  Pushes changes to browser via WebSocket             │               │
│  │  No Redis, no SSE server, no extra infrastructure    │               │
│  │                                                      │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                        │
│  ┌──────────────── Row Level Security ─────────────────┐               │
│  │  Anon key: read-only on positions, routes, weather  │               │
│  │  Service key: write access for API routes only      │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────┘


## Data Flow Diagram

                    ┌─────────────────────────────────┐
                    │         SCHEDULED FLOWS          │
                    └─────────────────────────────────┘

  Every 30–60 min:
  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────┐
  │AISStream │───▶│/api/ais-sync │───▶│vessel_positions   │───▶│Realtime  │
  │WebSocket │    │(Vercel Cron) │    │(Supabase + geom)  │    │WebSocket │
  └──────────┘    └──────────────┘    └──────────────────┘    │push to   │
                                                               │browser   │
  Every 60 min:                                                └────┬─────┘
  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐         │
  │Open-Meteo│───▶│/api/weather  │───▶│weather_grid       │         │
  │  API     │    │(Vercel Cron) │    │(Supabase)         │         │
  └──────────┘    └──────────────┘    └──────────────────┘         │
                                                                    │
  Daily:                                                            ▼
  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────┐
  │ EIA API  │───▶│/api/fuel-sync│───▶│fuel_prices        │    │ Browser  │
  └──────────┘    └──────────────┘    │(Supabase)         │    │          │
                                      └──────────────────┘    │ Leaflet  │
  Nightly:                                                     │ Map      │
  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐    │ Chart.js │
  │ Postgres │───▶│/api/cii-     │───▶│vessel_ratings     │    │ Panels   │
  │ voyages  │    │nightly       │    │(A–E per vessel)   │    │          │
  └──────────┘    └──────────────┘    └──────────────────┘    └──────────┘

                    ┌─────────────────────────────────┐
                    │         ON-DEMAND FLOWS          │
                    └─────────────────────────────────┘

  User clicks "Reroute":
  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────┐
  │ Browser  │───▶│/api/optimize │───▶│vessel_routes      │───▶│Realtime  │
  │ (click)  │    │(glpk.js LP)  │    │(GeoJSON in PG)    │    │→ map     │
  └──────────┘    └──────────────┘    └──────────────────┘    │animates  │
                                                               └──────────┘


## Map Layer Stack

  ┌─────────────────────────────────────────────────┐
  │              RENDERED MAP (top → bottom)         │
  ├─────────────────────────────────────────────────┤
  │  Alert Layer      Pulsing rings on deviations   │  Dynamic
  │  Vessel Layer     Oriented icons by heading      │  Real-time (Supabase)
  │  Route Layer      Solid=traveled, Dashed=planned │  GeoJSON from DB
  │  Weather Layer    Wind barbs + wave heatmap      │  Toggle on/off
  │  ECA Layer        IMO polygons, hatched fill     │  PostGIS query
  │  Port Layer       Markers + berth info on click  │  Static + DB
  │  Base Tiles       OpenSeaMap nautical charts     │  Free CDN
  └─────────────────────────────────────────────────┘


## Directory Structure

  shipping-tracker/
  ├── app/
  │   ├── layout.tsx                 Root layout + nav
  │   ├── page.tsx                   Command Center (/)
  │   ├── map/
  │   │   └── page.tsx               Full-screen fleet map
  │   ├── voyages/
  │   │   └── page.tsx               Voyage manager
  │   ├── fuel/
  │   │   └── page.tsx               Bunker optimizer
  │   ├── environment/
  │   │   └── page.tsx               CII & emissions
  │   ├── scenarios/
  │   │   └── page.tsx               What-if engine
  │   ├── analytics/
  │   │   └── page.tsx               Charts dashboard
  │   └── api/
  │       ├── ais-sync/
  │       │   └── route.ts           Cron: fetch AIS positions
  │       ├── weather-sync/
  │       │   └── route.ts           Cron: fetch weather grid
  │       ├── fuel-sync/
  │       │   └── route.ts           Cron: fetch fuel prices
  │       ├── cii-nightly/
  │       │   └── route.ts           Cron: compute CII ratings
  │       └── optimize/
  │           └── route.ts           On-demand: route optimizer
  ├── components/
  │   ├── map/
  │   │   ├── FleetMap.tsx           Main map component
  │   │   ├── VesselMarker.tsx       Oriented vessel icon
  │   │   ├── RouteLayer.tsx         GeoJSON route lines
  │   │   ├── WeatherLayer.tsx       Wind/wave overlay
  │   │   ├── ECALayer.tsx           ECA zone polygons
  │   │   └── VesselPanel.tsx        Click-to-open detail panel
  │   ├── dashboard/
  │   │   ├── KPIBar.tsx             TEU, speed, fuel cost
  │   │   ├── CIITable.tsx           Fleet CII ratings
  │   │   ├── FuelTicker.tsx         VLSFO/HSFO price strip
  │   │   ├── AlertsFeed.tsx         Active alerts list
  │   │   └── CorridorChart.tsx      Volume by corridor
  │   └── ui/
  │       ├── Card.tsx               Reusable card wrapper
  │       ├── Badge.tsx              Status badges
  │       └── Sidebar.tsx            Navigation sidebar
  ├── hooks/
  │   ├── useFleetPositions.ts       Supabase Realtime subscription
  │   ├── useWeatherGrid.ts          Weather data hook
  │   ├── useVoyages.ts              Voyage data hook
  │   └── useFuelPrices.ts           Fuel price hook
  ├── lib/
  │   ├── supabase.ts                Client + server Supabase instances
  │   ├── cii.ts                     CII calculator (IMO formula)
  │   ├── types.ts                   Shared TypeScript interfaces
  │   ├── constants.ts               Corridors, vessel types, thresholds
  │   └── seed.ts                    Seed data generator
  ├── public/
  │   └── vessels/                   SVG vessel icons by type
  ├── vercel.json                    Cron job definitions
  ├── .env.local                     Supabase + API keys
  ├── package.json
  ├── tsconfig.json
  └── next.config.js


## Technology Stack Summary

  ┌────────────────┬──────────────────────────┬─────────────────────────┐
  │ Layer          │ Technology               │ Cost                    │
  ├────────────────┼──────────────────────────┼─────────────────────────┤
  │ Frontend + API │ Next.js 14 (App Router)  │ Free (Vercel)           │
  │ Database       │ Supabase Postgres+PostGIS│ Free tier (500MB)       │
  │ Realtime       │ Supabase Realtime        │ Free tier (included)    │
  │ Map tiles      │ Leaflet + OpenSeaMap     │ Free forever            │
  │ Charts         │ Chart.js / Recharts      │ Free (MIT)              │
  │ Route math     │ glpk.js (WASM)           │ Free (GPL)              │
  │ CII calc       │ TypeScript function      │ N/A                     │
  │ AIS feed       │ AISStream.io WebSocket   │ Free tier               │
  │ Weather        │ Open-Meteo API           │ Free (no key)           │
  │ Fuel prices    │ EIA Open Data API        │ Free                    │
  │ Scheduling     │ Vercel Cron Jobs         │ Free (in vercel.json)   │
  │ Language       │ TypeScript only           │ N/A                     │
  └────────────────┴──────────────────────────┴─────────────────────────┘

  Total monthly cost: $0 (within free tiers for a ≤50 vessel fleet)
