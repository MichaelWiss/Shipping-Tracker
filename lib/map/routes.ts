// ---------------------------------------------------------------------------
// Static route / port / weather / ECA data — ported verbatim from the
// References/shipping-map.html prototype so the canvas map renders the
// exact same scene. Live Supabase data layers on top in a later phase.
// ---------------------------------------------------------------------------

export interface RouteDef {
  id: string;
  name: string;
  shortName: string;
  color: string;
  from: string;
  to: string;
  vessel: string;
  flag: string;
  dwt: string;
  cargo: string;
  teu: string;
  speed: string;
  fuel: string;
  cii: "A" | "B" | "C" | "D";
  eta: string;
  initT: number;
  wp: [number, number][];
}

export const ROUTES: RouteDef[] = [
  {
    id: "r1", name: "Asia–Europe (Suez)", shortName: "Asia–EU", color: "#C41230",
    from: "Shanghai", to: "Rotterdam",
    vessel: "EVER GOLDEN", flag: "Panama", dwt: "220,000 t",
    cargo: "Electronics / Machinery", teu: "21,413 TEU",
    speed: "18.4 kn", fuel: "148 MT/day", cii: "A", eta: "02 Apr 2026",
    initT: 0.38,
    wp: [[121.5, 31.2], [112, 24], [103.8, 1.3], [90, 5], [79.8, 6.9], [70, 12],
         [44.9, 11.8], [43.6, 12.6], [32.5, 29.9], [32.3, 31.3], [25, 35], [14, 38],
         [5, 37], [-5.4, 36], [-9, 38], [-5, 44], [0, 48], [4.5, 51.9]],
  },
  {
    id: "r2", name: "Trans-Pacific", shortName: "Trans-Pac", color: "#C87C18",
    from: "Yantian", to: "Long Beach",
    vessel: "MSC AURORA", flag: "Panama", dwt: "198,000 t",
    cargo: "Consumer goods", teu: "19,224 TEU",
    speed: "17.8 kn", fuel: "136 MT/day", cii: "B", eta: "28 Mar 2026",
    initT: 0.62,
    wp: [[114.5, 22.5], [130, 27], [148, 25], [165, 22], [179, 20],
         [-175, 19], [-158, 18], [-138, 22], [-122, 31], [-118.2, 33.7]],
  },
  {
    id: "r3", name: "Trans-Atlantic", shortName: "Trans-Atl", color: "#3A6B94",
    from: "Rotterdam", to: "New York",
    vessel: "MAERSK ELBA", flag: "Denmark", dwt: "141,000 t",
    cargo: "Chemicals / Autos", teu: "13,102 TEU",
    speed: "20.1 kn", fuel: "112 MT/day", cii: "A", eta: "20 Mar 2026",
    initT: 0.55,
    wp: [[4.5, 51.9], [-2, 50], [-8, 47], [-20, 45], [-36, 44], [-52, 42], [-63, 41], [-74, 40.7]],
  },
  {
    id: "r4", name: "Middle East–Asia", shortName: "Mid East", color: "#4B8A5A",
    from: "Jebel Ali", to: "Singapore",
    vessel: "COSCO HARMONY", flag: "HK SAR", dwt: "176,000 t",
    cargo: "Oil products / Bulk", teu: "8,200 TEU",
    speed: "15.2 kn", fuel: "98 MT/day", cii: "C", eta: "22 Mar 2026",
    initT: 0.28,
    wp: [[55.1, 25.0], [58, 20], [62, 15], [65, 12], [72.8, 18.9], [72, 13], [78, 8], [80, 5], [103.8, 1.3]],
  },
  {
    id: "r5", name: "S. America–Europe", shortName: "S.Am–EU", color: "#7B5EA7",
    from: "Santos", to: "Hamburg",
    vessel: "HAMBURG SÜND", flag: "Germany", dwt: "92,000 t",
    cargo: "Soy / Agri / Auto parts", teu: "10,600 TEU",
    speed: "16.5 kn", fuel: "89 MT/day", cii: "A", eta: "08 Apr 2026",
    initT: 0.18,
    wp: [[-46.3, -23.9], [-38, -18], [-26, -5], [-18, 5], [-12, 15], [-8, 25],
         [-5, 33], [0, 38], [2, 44], [5, 50], [9.8, 53.5]],
  },
  {
    id: "r6", name: "Cape Route (VLCC)", shortName: "Cape VLCC", color: "#B55C2B",
    from: "Ras Tanura", to: "Rotterdam",
    vessel: "NORDIC DIANA", flag: "Norway", dwt: "315,000 t",
    cargo: "Crude oil (VLCC)", teu: "N/A — VLCC",
    speed: "14.0 kn", fuel: "186 MT/day", cii: "B", eta: "15 Apr 2026",
    initT: 0.32,
    wp: [[50.1, 26.6], [55, 20], [58, 12], [60, 5], [60, -10], [47, -25], [32, -32],
         [18.4, -33.9], [10, -28], [5, -15], [-2, 5], [-8, 20], [-10, 32],
         [-6, 36], [0, 44], [4.5, 51.9]],
  },
];

export const MAP_PORTS: { name: string; c: [number, number] }[] = [
  { name: "Shanghai",   c: [121.5, 31.2] },
  { name: "Rotterdam",  c: [4.5, 51.9] },
  { name: "Long Beach", c: [-118.2, 33.7] },
  { name: "Yantian",    c: [114.5, 22.5] },
  { name: "Singapore",  c: [103.8, 1.3] },
  { name: "Jebel Ali",  c: [55.1, 25.0] },
  { name: "Santos",     c: [-46.3, -23.9] },
  { name: "Hamburg",    c: [9.8, 53.5] },
  { name: "New York",   c: [-74, 40.7] },
  { name: "Ras Tanura", c: [50.1, 26.6] },
];

export const MAP_WEATHER: { name: string; c: [number, number]; r: number; type: "storm" | "high" | "monsoon" | "wind"; s: number }[] = [
  { name: "N. Atlantic Low", c: [-35, 52],  r: 8,  type: "storm",   s: 0.72 },
  { name: "Pacific High",    c: [-140, 30], r: 12, type: "high",    s: 0.45 },
  { name: "Monsoon belt",    c: [75, 15],   r: 11, type: "monsoon", s: 0.55 },
  { name: "Cape Horn low",   c: [-60, -54], r: 7,  type: "storm",   s: 0.80 },
  { name: "Gulf wind",       c: [58, 22],   r: 6,  type: "wind",    s: 0.42 },
];

export const MAP_ECA: { name: string; c: [number, number]; r: number }[] = [
  { name: "North Sea ECA",  c: [5, 56],   r: 7 },
  { name: "Baltic ECA",     c: [18, 58],  r: 6 },
  { name: "N.America ECA",  c: [-70, 40], r: 9 },
  { name: "Med ECA (prop.)", c: [15, 38], r: 8 },
];

// Curated country labels — manually placed centroids for editorial clarity at
// default world view. Not exhaustive; chosen for geographic coverage.
export const COUNTRY_LABELS: { name: string; c: [number, number] }[] = [
  { name: "United States",  c: [-98, 39] },
  { name: "Canada",         c: [-105, 58] },
  { name: "Mexico",         c: [-102, 24] },
  { name: "Brazil",         c: [-52, -12] },
  { name: "Argentina",      c: [-65, -35] },
  { name: "Colombia",       c: [-73, 4] },
  { name: "Peru",           c: [-75, -10] },
  { name: "Chile",          c: [-71, -33] },
  { name: "Greenland",      c: [-42, 72] },
  { name: "United Kingdom", c: [-2, 54] },
  { name: "France",         c: [2, 47] },
  { name: "Spain",          c: [-4, 40] },
  { name: "Germany",        c: [10, 51] },
  { name: "Italy",          c: [12, 43] },
  { name: "Norway",         c: [10, 64] },
  { name: "Sweden",         c: [16, 62] },
  { name: "Turkey",         c: [35, 39] },
  { name: "Russia",         c: [90, 62] },
  { name: "China",          c: [105, 35] },
  { name: "India",          c: [79, 22] },
  { name: "Japan",          c: [138, 37] },
  { name: "South Korea",    c: [128, 36] },
  { name: "Indonesia",      c: [118, -3] },
  { name: "Australia",      c: [134, -25] },
  { name: "Saudi Arabia",   c: [45, 24] },
  { name: "Iran",           c: [53, 33] },
  { name: "Egypt",          c: [30, 27] },
  { name: "South Africa",   c: [25, -30] },
  { name: "Nigeria",        c: [8, 10] },
  { name: "DR Congo",       c: [24, -3] },
  { name: "Algeria",        c: [3, 28] },
  { name: "Libya",          c: [18, 28] },
  { name: "Kazakhstan",     c: [67, 48] },
  { name: "Mongolia",       c: [105, 47] },
];
