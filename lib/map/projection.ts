// ---------------------------------------------------------------------------
// Map projection helpers — Natural Earth projection + polyline interpolation
// utilities for the canvas-based fleet map.
// ---------------------------------------------------------------------------

import { geoNaturalEarth1, geoInterpolate, type GeoProjection } from "d3-geo";
import type { RouteDef } from "./routes";

export type Pt = [number, number];

export function makeProjection(W: number, H: number): GeoProjection {
  return geoNaturalEarth1()
    .scale(W / 6.4)
    .translate([W * 0.5, H * 0.5]);
}

/** Interpolate a route's waypoints into a dense polyline in projected pixels. */
export function calcPts(route: RouteDef, proj: GeoProjection): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < route.wp.length - 1; i++) {
    const interp = geoInterpolate(route.wp[i], route.wp[i + 1]);
    const steps = 16;
    for (let s = 0; s < steps; s++) {
      const p = proj(interp(s / steps));
      if (p) pts.push([p[0], p[1]]);
    }
  }
  const last = proj(route.wp[route.wp.length - 1]);
  if (last) pts.push([last[0], last[1]]);
  return pts;
}

export function ptAtT(pts: Pt[] | undefined, t: number): Pt | null {
  if (!pts || pts.length < 2) return null;
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (pts.length - 1);
  const i = Math.floor(idx);
  const f = idx - i;
  if (i >= pts.length - 1) return pts[pts.length - 1];
  const a = pts[i];
  const b = pts[i + 1];
  if (!a || !b) return null;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export function headAtT(pts: Pt[] | undefined, t: number): number {
  const e = 0.008;
  const p1 = ptAtT(pts, Math.max(0, t - e));
  const p2 = ptAtT(pts, Math.min(1, t + e));
  if (!p1 || !p2) return 0;
  return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
}

/** Convert canvas pixel coords to "world" (untransformed projected) coords. */
export function screenToWorld(
  sx: number,
  sy: number,
  k: number,
  tx: number,
  ty: number,
): Pt {
  return [(sx - tx) / k, (sy - ty) / k];
}
