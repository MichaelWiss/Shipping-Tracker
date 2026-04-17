// 4 Emission Control Areas with simplified polygon boundaries.
// Coordinates are [lng, lat] per GeoJSON spec.

export const SEED_ECA_ZONES = [
  {
    name: "Baltic Sea ECA",
    regulation: "MARPOL Annex VI — SOx/NOx",
    boundary: {
      type: "Polygon" as const,
      coordinates: [[
        [10.0, 53.5], [10.0, 60.0], [12.0, 62.0], [16.0, 63.0],
        [20.0, 63.5], [24.0, 65.8], [30.0, 65.8], [30.0, 60.0],
        [28.0, 56.0], [22.0, 54.5], [14.0, 53.5], [10.0, 53.5],
      ]],
    },
  },
  {
    name: "North Sea ECA",
    regulation: "MARPOL Annex VI — SOx/NOx",
    boundary: {
      type: "Polygon" as const,
      coordinates: [[
        [-5.0, 48.0], [-5.0, 51.0], [0.0, 53.5], [5.0, 55.5],
        [7.0, 57.5], [10.0, 57.5], [10.0, 53.5], [7.0, 51.0],
        [3.0, 49.5], [-1.0, 48.0], [-5.0, 48.0],
      ]],
    },
  },
  {
    name: "North American ECA",
    regulation: "MARPOL Annex VI — SOx/NOx/PM",
    boundary: {
      type: "Polygon" as const,
      coordinates: [[
        [-130.0, 32.0], [-130.0, 50.0], [-120.0, 55.0], [-60.0, 55.0],
        [-60.0, 28.0], [-80.0, 24.0], [-100.0, 25.0], [-120.0, 30.0],
        [-130.0, 32.0],
      ]],
    },
  },
  {
    name: "US Caribbean ECA",
    regulation: "MARPOL Annex VI — SOx/NOx/PM",
    boundary: {
      type: "Polygon" as const,
      coordinates: [[
        [-86.0, 28.0], [-86.0, 18.0], [-67.0, 18.0],
        [-67.0, 28.0], [-80.0, 28.0], [-86.0, 28.0],
      ]],
    },
  },
];
