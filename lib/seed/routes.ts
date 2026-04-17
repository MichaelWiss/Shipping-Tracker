// Generate a GeoJSON route (LineString) for a voyage.

import type { Feature, FeatureCollection, LineString } from "geojson";

export function generateRoute(
  origin: [number, number], // [lat, lng]
  dest: [number, number],
  progress: number,         // 0–1 how far vessel is
): FeatureCollection {
  // Simple straight-line route with a few intermediate waypoints
  const steps = 10;
  const coords: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = origin[0] + (dest[0] - origin[0]) * t;
    const lng = origin[1] + (dest[1] - origin[1]) * t;
    coords.push([
      Math.round(lng * 10000) / 10000,
      Math.round(lat * 10000) / 10000,
    ]); // GeoJSON = [lng, lat]
  }

  const traveled: Feature<LineString> = {
    type: "Feature",
    properties: { segment: "traveled" },
    geometry: {
      type: "LineString",
      coordinates: coords.slice(0, Math.ceil(progress * steps) + 1),
    },
  };

  const planned: Feature<LineString> = {
    type: "Feature",
    properties: { segment: "planned" },
    geometry: {
      type: "LineString",
      coordinates: coords.slice(Math.floor(progress * steps)),
    },
  };

  return {
    type: "FeatureCollection",
    features: [traveled, planned],
  };
}
