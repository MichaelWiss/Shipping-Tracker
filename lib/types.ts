// ---------------------------------------------------------------------------
// Domain types — one interface per database table.
// These are the single source of truth for field names and value constraints.
// The SQL migration (Cell 1.6) mirrors these exactly.
// ---------------------------------------------------------------------------

export interface Vessel {
  id: string;
  imo: string;
  mmsi: string;
  name: string;
  flag: string;
  type: "container" | "tanker" | "bulk_carrier";
  dwt_capacity: number;
  loa_metres: number;
  current_route_id: string | null;
}

export interface VesselPosition {
  id: string;
  vessel_id: string;
  timestamp: string; // ISO-8601
  lat: number;
  lng: number;
  speed_kn: number;
  heading_deg: number;
  nav_status: string;
  draught: number;
}

export interface Voyage {
  id: string;
  vessel_id: string;
  origin_port: string;
  dest_port: string;
  departure_at: string; // ISO-8601
  eta: string; // ISO-8601
  actual_arrival: string | null; // ISO-8601
  cargo_teu: number;
  fuel_consumed_mt: number;
  distance_nm: number;
}

export interface VesselRating {
  id: string;
  vessel_id: string;
  period_start: string; // ISO-8601 date
  period_end: string; // ISO-8601 date
  attained_cii: number;
  rating: "A" | "B" | "C" | "D" | "E";
  co2_mt: number;
}

export interface VesselRoute {
  id: string;
  voyage_id: string;
  route_geojson: GeoJSON.FeatureCollection;
  computed_at: string; // ISO-8601
  is_active: boolean;
}

export interface ECAZone {
  id: string;
  name: string;
  regulation: string;
  boundary: GeoJSON.Polygon;
}

export interface WeatherGrid {
  id: string;
  timestamp: string; // ISO-8601
  lat: number;
  lng: number;
  wind_speed_kn: number;
  wind_dir_deg: number;
  wave_height_m: number;
  beaufort: number;
}

export interface FuelPrice {
  id: string;
  date: string; // YYYY-MM-DD
  fuel_type: "VLSFO" | "HSFO";
  price_usd_per_mt: number;
  source: string;
}

export interface Port {
  id: string;
  name: string;
  unlocode: string;
  lat: number;
  lng: number;
  country: string;
  berth_count: number;
  avg_port_call_hours: number;
}
