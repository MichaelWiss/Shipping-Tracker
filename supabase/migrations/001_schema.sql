-- 001_schema.sql — Core tables for Shipping Tracker
-- Run in Supabase SQL Editor (or via `supabase db push` if using the CLI).
-- Requires PostGIS extension (enabled in Cell 1.3).

-- ============================================================
-- 1. vessels
-- ============================================================
CREATE TABLE vessels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imo         text NOT NULL UNIQUE,
  mmsi        text NOT NULL UNIQUE,
  name        text NOT NULL,
  flag        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('container', 'tanker', 'bulk_carrier')),
  dwt_capacity numeric NOT NULL,
  loa_metres  numeric NOT NULL,
  current_route_id uuid
);

-- ============================================================
-- 2. ports
-- ============================================================
CREATE TABLE ports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  unlocode            text NOT NULL UNIQUE,
  lat                 double precision NOT NULL,
  lng                 double precision NOT NULL,
  country             text NOT NULL,
  berth_count         integer NOT NULL,
  avg_port_call_hours numeric NOT NULL
);

-- ============================================================
-- 3. voyages
-- ============================================================
CREATE TABLE voyages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id        uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  origin_port      uuid NOT NULL REFERENCES ports(id),
  dest_port        uuid NOT NULL REFERENCES ports(id),
  departure_at     timestamptz NOT NULL,
  eta              timestamptz NOT NULL,
  actual_arrival   timestamptz,
  cargo_teu        integer NOT NULL DEFAULT 0,
  fuel_consumed_mt numeric NOT NULL DEFAULT 0,
  distance_nm      numeric NOT NULL DEFAULT 0
);

CREATE INDEX idx_voyages_vessel ON voyages (vessel_id);

-- ============================================================
-- 4. vessel_positions (with PostGIS geom)
-- ============================================================
CREATE TABLE vessel_positions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id   uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  timestamp   timestamptz NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  speed_kn    numeric NOT NULL,
  heading_deg numeric NOT NULL,
  nav_status  text NOT NULL DEFAULT 'underway',
  draught     numeric NOT NULL DEFAULT 0,
  geom        geometry(Point, 4326)
);

CREATE INDEX idx_vp_vessel_ts ON vessel_positions (vessel_id, timestamp DESC);
CREATE INDEX idx_vp_geom ON vessel_positions USING GIST (geom);

-- Auto-populate geom from lat/lng on insert/update
CREATE OR REPLACE FUNCTION set_position_geom()
RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_position_geom
  BEFORE INSERT OR UPDATE ON vessel_positions
  FOR EACH ROW
  EXECUTE FUNCTION set_position_geom();

-- ============================================================
-- 5. vessel_ratings
-- ============================================================
CREATE TABLE vessel_ratings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id    uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  attained_cii numeric NOT NULL,
  rating       text NOT NULL CHECK (rating IN ('A', 'B', 'C', 'D', 'E')),
  co2_mt       numeric NOT NULL
);

-- ============================================================
-- 6. vessel_routes
-- ============================================================
CREATE TABLE vessel_routes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voyage_id      uuid NOT NULL REFERENCES voyages(id) ON DELETE CASCADE,
  route_geojson  jsonb NOT NULL,
  computed_at    timestamptz NOT NULL DEFAULT now(),
  is_active      boolean NOT NULL DEFAULT true
);

-- ============================================================
-- 7. eca_zones (with PostGIS boundary)
-- ============================================================
CREATE TABLE eca_zones (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  regulation text NOT NULL,
  boundary   geometry(Polygon, 4326) NOT NULL
);

CREATE INDEX idx_eca_boundary ON eca_zones USING GIST (boundary);

-- ============================================================
-- 8. weather_grid
-- ============================================================
CREATE TABLE weather_grid (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp     timestamptz NOT NULL,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  wind_speed_kn numeric NOT NULL,
  wind_dir_deg  numeric NOT NULL,
  wave_height_m numeric NOT NULL,
  beaufort      integer NOT NULL
);

-- ============================================================
-- 9. fuel_prices
-- ============================================================
CREATE TABLE fuel_prices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL,
  fuel_type       text NOT NULL CHECK (fuel_type IN ('VLSFO', 'HSFO')),
  price_usd_per_mt numeric NOT NULL,
  source          text NOT NULL
);

CREATE INDEX idx_fuel_date ON fuel_prices (date DESC);

-- ============================================================
-- Wire vessels.current_route_id FK (deferred because vessel_routes
-- didn't exist when vessels was created)
-- ============================================================
ALTER TABLE vessels
  ADD CONSTRAINT fk_vessels_current_route
  FOREIGN KEY (current_route_id) REFERENCES vessel_routes(id)
  ON DELETE SET NULL;
