// 12 vessels: 4 container, 4 tanker, 4 bulk carrier
// IMO numbers are realistic format (7 digits). MMSI = 9 digits.

export const SEED_VESSELS = [
  // -- Container vessels (prefix: Ever / Maersk / CMA CGM / COSCO style) ----
  { imo: "9893890", mmsi: "477123401", name: "Ever Harmony",      flag: "PA", type: "container"    as const, dwt_capacity: 82000,  loa_metres: 336 },
  { imo: "9893902", mmsi: "477123402", name: "Maersk Sentosa",    flag: "DK", type: "container"    as const, dwt_capacity: 120000, loa_metres: 399 },
  { imo: "9893914", mmsi: "215876001", name: "CMA CGM Riviera",   flag: "MT", type: "container"    as const, dwt_capacity: 95000,  loa_metres: 366 },
  { imo: "9893926", mmsi: "413456001", name: "COSCO Nebula",      flag: "CN", type: "container"    as const, dwt_capacity: 108000, loa_metres: 400 },
  // -- Tankers ---------------------------------------------------------------
  { imo: "9894001", mmsi: "538006701", name: "Stena Superior",    flag: "MH", type: "tanker"       as const, dwt_capacity: 157000, loa_metres: 274 },
  { imo: "9894013", mmsi: "636019801", name: "Minerva Libra",     flag: "LR", type: "tanker"       as const, dwt_capacity: 113000, loa_metres: 250 },
  { imo: "9894025", mmsi: "538006702", name: "Pacific Voyager",   flag: "MH", type: "tanker"       as const, dwt_capacity: 300000, loa_metres: 333 },
  { imo: "9894037", mmsi: "249101001", name: "Maran Apollo",      flag: "MT", type: "tanker"       as const, dwt_capacity: 160000, loa_metres: 277 },
  // -- Bulk carriers ---------------------------------------------------------
  { imo: "9894101", mmsi: "477234501", name: "Star Vega",         flag: "HK", type: "bulk_carrier" as const, dwt_capacity: 82000,  loa_metres: 229 },
  { imo: "9894113", mmsi: "636019802", name: "Golden Sarina",     flag: "LR", type: "bulk_carrier" as const, dwt_capacity: 180000, loa_metres: 292 },
  { imo: "9894125", mmsi: "311001201", name: "Navios Altair",     flag: "BS", type: "bulk_carrier" as const, dwt_capacity: 75000,  loa_metres: 225 },
  { imo: "9894137", mmsi: "538006703", name: "Cape Fortuna",      flag: "MH", type: "bulk_carrier" as const, dwt_capacity: 206000, loa_metres: 300 },
];
