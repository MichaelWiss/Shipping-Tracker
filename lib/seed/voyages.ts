// Voyage assignments — one voyage per vessel, mapped to a corridor.
// Positions and routes are generated from these.

import { CORRIDORS } from "../constants";
import { SEED_PORTS } from "./ports";

// Map each vessel (by index 0–11) to a corridor index and voyage params.
// 2 vessels per corridor = 12 vessels across 6 corridors.
export const VOYAGE_ASSIGNMENTS = [
  // Container vessels → corridors 0–3
  { vesselIdx: 0,  corridorIdx: 0, cargoTeu: 6200,  fuelConsumedMt: 3800, distanceNm: 8400  },
  { vesselIdx: 1,  corridorIdx: 1, cargoTeu: 8500,  fuelConsumedMt: 4200, distanceNm: 5900  },
  { vesselIdx: 2,  corridorIdx: 2, cargoTeu: 5100,  fuelConsumedMt: 2400, distanceNm: 3200  },
  { vesselIdx: 3,  corridorIdx: 3, cargoTeu: 7200,  fuelConsumedMt: 3600, distanceNm: 5100  },
  // Tankers → corridors 0, 2, 4, 5
  { vesselIdx: 4,  corridorIdx: 0, cargoTeu: 0,     fuelConsumedMt: 5200, distanceNm: 8400  },
  { vesselIdx: 5,  corridorIdx: 2, cargoTeu: 0,     fuelConsumedMt: 2800, distanceNm: 3200  },
  { vesselIdx: 6,  corridorIdx: 4, cargoTeu: 0,     fuelConsumedMt: 1600, distanceNm: 2500  },
  { vesselIdx: 7,  corridorIdx: 5, cargoTeu: 0,     fuelConsumedMt: 1900, distanceNm: 2100  },
  // Bulk carriers → corridors 1, 3, 4, 5
  { vesselIdx: 8,  corridorIdx: 1, cargoTeu: 0,     fuelConsumedMt: 3200, distanceNm: 5900  },
  { vesselIdx: 9,  corridorIdx: 3, cargoTeu: 0,     fuelConsumedMt: 3800, distanceNm: 5100  },
  { vesselIdx: 10, corridorIdx: 4, cargoTeu: 0,     fuelConsumedMt: 1400, distanceNm: 2500  },
  { vesselIdx: 11, corridorIdx: 5, cargoTeu: 0,     fuelConsumedMt: 2200, distanceNm: 2100  },
];

/** Resolve a UN/LOCODE to its port seed data. */
export function portByCode(code: string) {
  const p = SEED_PORTS.find((p) => p.unlocode === code);
  if (!p) throw new Error(`Port not found: ${code}`);
  return p;
}

/** Get the waypoints for a corridor as [lat, lng] pairs (origin → dest). */
export function corridorWaypoints(corridorIdx: number): [number, number][] {
  const c = CORRIDORS[corridorIdx];
  const origin = portByCode(c.ports[0]);
  const dest = portByCode(c.ports[1]);
  return [
    [origin.lat, origin.lng],
    [dest.lat, dest.lng],
  ];
}
