// CII (Carbon Intensity Indicator) calculator.
// Pure function — no side effects, no DB access.

import { CII_THRESHOLDS, VLSFO_EMISSION_FACTOR } from "./constants";

export type CiiRating = "A" | "B" | "C" | "D" | "E";

/**
 * Calculate the CII attained value and rating for a vessel/voyage.
 *
 * CII = (fuel consumed × emission factor) / (distance × DWT capacity)
 *
 * - fuelConsumedMt:  total fuel burned (metric tonnes)
 * - distanceNm:      distance sailed (nautical miles)
 * - dwtCapacity:     vessel DWT capacity (metric tonnes)
 *
 * Returns the raw CII value and the letter rating (A–E).
 */
export function calculateCii(
  fuelConsumedMt: number,
  distanceNm: number,
  dwtCapacity: number,
): { cii: number; rating: CiiRating } {
  if (distanceNm <= 0 || dwtCapacity <= 0) {
    return { cii: 0, rating: "E" };
  }

  const co2Mt = fuelConsumedMt * VLSFO_EMISSION_FACTOR;
  const cii = co2Mt / (distanceNm * dwtCapacity);

  let rating: CiiRating;
  if (cii <= CII_THRESHOLDS.A) {
    rating = "A";
  } else if (cii <= CII_THRESHOLDS.B) {
    rating = "B";
  } else if (cii <= CII_THRESHOLDS.C) {
    rating = "C";
  } else if (cii <= CII_THRESHOLDS.D) {
    rating = "D";
  } else {
    rating = "E";
  }

  return { cii: Math.round(cii * 1_000_000) / 1_000_000, rating };
}
