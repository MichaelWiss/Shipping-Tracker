// Seed script — inserts all test data into Supabase.
// Run with: npm run seed

import { createClient } from "@supabase/supabase-js";
import { SEED_VESSELS } from "./vessels";
import { SEED_PORTS } from "./ports";
import { SEED_ECA_ZONES } from "./eca-zones";
import { VOYAGE_ASSIGNMENTS, corridorWaypoints } from "./voyages";
import { generatePositions } from "./positions";
import { generateRoute } from "./routes";
import { generateFuelPrices } from "./fuel-prices";
import { generateWeatherGrid } from "./weather";
import { CORRIDORS } from "../constants";

// ---------------------------------------------------------------------------
// Supabase client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clearTables() {
  // Delete in FK-safe order
  const tables = [
    "vessel_positions", "vessel_routes", "vessel_ratings",
    "weather_grid", "fuel_prices", "voyages", "eca_zones",
    "vessels", "ports",
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.warn(`  Warning clearing ${t}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeding Shipping Tracker...\n");

  // -- Clear existing data ---------------------------------------------------
  console.log("  Clearing existing data...");
  await clearTables();

  // -- Ports -----------------------------------------------------------------
  console.log("  Inserting 10 ports...");
  const { data: ports, error: portErr } = await supabase
    .from("ports")
    .insert(SEED_PORTS)
    .select();
  if (portErr) throw new Error(`Ports: ${portErr.message}`);
  console.log(`    ✓ ${ports.length} ports`);

  // Build lookup: unlocode → port id
  const portIdByCode: Record<string, string> = {};
  for (const p of ports) {
    portIdByCode[p.unlocode] = p.id;
  }

  // -- Vessels ---------------------------------------------------------------
  console.log("  Inserting 12 vessels...");
  const { data: vessels, error: vesselErr } = await supabase
    .from("vessels")
    .insert(SEED_VESSELS.map((v) => ({ ...v, current_route_id: null })))
    .select();
  if (vesselErr) throw new Error(`Vessels: ${vesselErr.message}`);
  console.log(`    ✓ ${vessels.length} vessels`);

  // -- ECA Zones -------------------------------------------------------------
  console.log("  Inserting 4 ECA zones...");
  const ecaInserts = SEED_ECA_ZONES.map((z) => ({
    name: z.name,
    regulation: z.regulation,
    boundary: JSON.stringify(z.boundary),
  }));
  const { data: ecaData, error: ecaErr } = await supabase
    .from("eca_zones")
    .insert(ecaInserts)
    .select("id, name");
  if (ecaErr) throw new Error(`ECA Zones: ${ecaErr.message}`);
  console.log(`    ✓ ${ecaData.length} ECA zones`);

  // -- Voyages ---------------------------------------------------------------
  console.log("  Inserting 12 voyages...");
  const now = new Date();
  const voyageInserts = VOYAGE_ASSIGNMENTS.map((va) => {
    const corridor = CORRIDORS[va.corridorIdx];
    const originCode = corridor.ports[0];
    const destCode = corridor.ports[1];

    const daysAgo = 20 + Math.floor(Math.random() * 10); // departed 20–30 days ago
    const departure = new Date(now);
    departure.setDate(departure.getDate() - daysAgo);

    const etaDaysFromNow = 5 + Math.floor(Math.random() * 10); // arrives 5–15 days from now
    const eta = new Date(now);
    eta.setDate(eta.getDate() + etaDaysFromNow);

    return {
      vessel_id: vessels[va.vesselIdx].id,
      origin_port: portIdByCode[originCode],
      dest_port: portIdByCode[destCode],
      departure_at: departure.toISOString(),
      eta: eta.toISOString(),
      actual_arrival: null,
      cargo_teu: va.cargoTeu,
      fuel_consumed_mt: va.fuelConsumedMt,
      distance_nm: va.distanceNm,
    };
  });

  const { data: voyages, error: voyageErr } = await supabase
    .from("voyages")
    .insert(voyageInserts)
    .select();
  if (voyageErr) throw new Error(`Voyages: ${voyageErr.message}`);
  console.log(`    ✓ ${voyages.length} voyages`);

  // -- Routes ----------------------------------------------------------------
  console.log("  Inserting 12 routes...");
  const routeInserts = VOYAGE_ASSIGNMENTS.map((va, i) => {
    const wp = corridorWaypoints(va.corridorIdx);
    const progress = 0.4 + Math.random() * 0.4; // 40–80% along
    const route = generateRoute(wp[0], wp[1], progress);

    return {
      voyage_id: voyages[i].id,
      route_geojson: route,
      is_active: true,
    };
  });

  const { data: routes, error: routeErr } = await supabase
    .from("vessel_routes")
    .insert(routeInserts)
    .select("id");
  if (routeErr) throw new Error(`Routes: ${routeErr.message}`);
  console.log(`    ✓ ${routes.length} routes`);

  // -- Positions -------------------------------------------------------------
  console.log("  Generating positions (this may take a moment)...");
  let totalPositions = 0;

  for (let i = 0; i < VOYAGE_ASSIGNMENTS.length; i++) {
    const va = VOYAGE_ASSIGNMENTS[i];
    const wp = corridorWaypoints(va.corridorIdx);
    const progress = 0.4 + Math.random() * 0.4;
    const daysAgo = 30;

    const positions = generatePositions(wp[0], wp[1], daysAgo, progress);

    // Insert in batches of 500 to avoid payload limits
    const batchSize = 500;
    for (let b = 0; b < positions.length; b += batchSize) {
      const batch = positions.slice(b, b + batchSize).map((pos) => {
        const ts = new Date(now);
        ts.setHours(ts.getHours() - pos.hoursAgo);
        return {
          vessel_id: vessels[va.vesselIdx].id,
          timestamp: ts.toISOString(),
          lat: pos.lat,
          lng: pos.lng,
          speed_kn: pos.speed_kn,
          heading_deg: pos.heading_deg,
          nav_status: pos.nav_status,
          draught: pos.draught,
        };
      });

      const { error: posErr } = await supabase
        .from("vessel_positions")
        .insert(batch);
      if (posErr) throw new Error(`Positions batch: ${posErr.message}`);
      totalPositions += batch.length;
    }
    process.stdout.write(`    Vessel ${i + 1}/12 done\r`);
  }
  console.log(`    ✓ ${totalPositions} positions                `);

  // -- Fuel prices -----------------------------------------------------------
  console.log("  Inserting 60 fuel prices...");
  const fuelPrices = generateFuelPrices();
  const { error: fuelErr } = await supabase.from("fuel_prices").insert(fuelPrices);
  if (fuelErr) throw new Error(`Fuel prices: ${fuelErr.message}`);
  console.log(`    ✓ ${fuelPrices.length} fuel prices`);

  // -- Weather grid ----------------------------------------------------------
  console.log("  Inserting weather grid...");
  const weather = generateWeatherGrid();
  const { error: weatherErr } = await supabase.from("weather_grid").insert(weather);
  if (weatherErr) throw new Error(`Weather: ${weatherErr.message}`);
  console.log(`    ✓ ${weather.length} weather points`);

  // -- Done ------------------------------------------------------------------
  console.log("\n✅ Seed complete!");
  console.log(`   Vessels: ${vessels.length}`);
  console.log(`   Ports: ${ports.length}`);
  console.log(`   ECA Zones: ${ecaData.length}`);
  console.log(`   Voyages: ${voyages.length}`);
  console.log(`   Routes: ${routes.length}`);
  console.log(`   Positions: ${totalPositions}`);
  console.log(`   Fuel Prices: ${fuelPrices.length}`);
  console.log(`   Weather Points: ${weather.length}`);
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
