// ---------------------------------------------------------------------------
// Application constants — single source for magic numbers, corridors, and
// color mappings used across the UI and API routes.
// ---------------------------------------------------------------------------

import type { Vessel } from "./types";

// -- Vessel types -----------------------------------------------------------

export const VESSEL_TYPES = ["container", "tanker", "bulk_carrier"] as const;
export type VesselType = Vessel["type"];

// -- Shipping corridors -----------------------------------------------------

export interface Corridor {
  name: string;
  color: string; // hex color for map route lines + charts
  ports: [string, string]; // [origin UN/LOCODE, destination UN/LOCODE]
}

export const CORRIDORS: Corridor[] = [
  { name: "Asia–Europe via Suez",   color: "#2563eb", ports: ["CNSHA", "NLRTM"] },
  { name: "Transpacific",           color: "#7c3aed", ports: ["CNSHA", "USLAX"] },
  { name: "Asia–Middle East",       color: "#0891b2", ports: ["SGSIN", "AEJEA"] },
  { name: "Europe–Americas",        color: "#059669", ports: ["DEHAM", "USLAX"] },
  { name: "Intra-Asia",             color: "#d97706", ports: ["KRPUS", "SGSIN"] },
  { name: "Africa–Europe",          color: "#dc2626", ports: ["GRPIR", "NLRTM"] },
];

// -- CII thresholds ---------------------------------------------------------
// Simplified container-vessel thresholds (g CO₂ / DWT·nm).
// Values below A → rating A, between A and B → rating B, etc.

export const CII_THRESHOLDS = {
  A: 0.0042,
  B: 0.0049,
  C: 0.0057,
  D: 0.0066,
} as const;

export type CIIRating = "A" | "B" | "C" | "D" | "E";

// -- Emission factor --------------------------------------------------------
// Tonnes of CO₂ emitted per tonne of VLSFO burned (IMO default for
// Very Low Sulphur Fuel Oil).

export const VLSFO_EMISSION_FACTOR = 3.206;

// -- Vessel status colors ---------------------------------------------------

export const VESSEL_STATUS_COLORS = {
  underway:  "#22c55e", // green-500
  slow:      "#f59e0b", // amber-500
  deviation: "#ef4444", // red-500
} as const;
