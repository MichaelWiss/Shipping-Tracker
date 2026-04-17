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
  { name: "Asia–Europe (Suez)",     color: "#C41230", ports: ["CNSHA", "NLRTM"] },
  { name: "Trans-Pacific",          color: "#C87C18", ports: ["CNSHA", "USLAX"] },
  { name: "Trans-Atlantic",         color: "#3A6B94", ports: ["DEHAM", "USLAX"] },
  { name: "Middle East–Asia",       color: "#4B8A5A", ports: ["SGSIN", "AEJEA"] },
  { name: "S. America–Europe",      color: "#7B5EA7", ports: ["KRPUS", "SGSIN"] },
  { name: "Cape Route (VLCC)",      color: "#B55C2B", ports: ["GRPIR", "NLRTM"] },
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
