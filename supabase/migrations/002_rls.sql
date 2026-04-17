-- 002_rls.sql — Row Level Security policies
-- Run in Supabase SQL Editor after 001_schema.sql.
--
-- Strategy:
--   • RLS ON for every table (locked by default)
--   • anon role: SELECT only (browser reads via the public anon key)
--   • service_role bypasses RLS automatically — no explicit policy needed
--     for API routes that use the service role key.

-- ============================================================
-- Enable RLS on all 9 tables
-- ============================================================
ALTER TABLE vessels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE voyages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_positions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_ratings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_routes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE eca_zones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_grid      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Anon read-only policies (one per table)
-- ============================================================
CREATE POLICY "anon_read_vessels"          ON vessels          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_ports"            ON ports            FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_voyages"          ON voyages          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_vessel_positions" ON vessel_positions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_vessel_ratings"   ON vessel_ratings   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_vessel_routes"    ON vessel_routes    FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_eca_zones"        ON eca_zones        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_weather_grid"     ON weather_grid     FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_fuel_prices"      ON fuel_prices      FOR SELECT TO anon USING (true);
