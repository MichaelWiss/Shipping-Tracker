-- 003_realtime.sql — Enable Supabase Realtime for live-push tables.
-- Run in Supabase SQL Editor after 002_rls.sql.
--
-- Only 3 tables need Realtime:
--   • vessel_positions — vessel markers move on the map
--   • vessel_routes    — route lines update on reroute
--   • weather_grid     — weather overlay refreshes

ALTER PUBLICATION supabase_realtime ADD TABLE vessel_positions, vessel_routes, weather_grid;
