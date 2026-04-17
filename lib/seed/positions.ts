// Generate ~720 position records per vessel (30 days × 24 per day)
// by linearly interpolating along the corridor route.

/**
 * Interpolate positions between two points over a time range.
 * Returns one position per hour for `days` days.
 * `progress` (0–1) = how far along the route the vessel currently is.
 */
export function generatePositions(
  origin: [number, number], // [lat, lng]
  dest: [number, number],
  daysAgo: number,          // voyage started this many days ago
  progress: number,         // 0.0–1.0 — how far along right now
): Array<{
  lat: number;
  lng: number;
  speed_kn: number;
  heading_deg: number;
  nav_status: string;
  draught: number;
  hoursAgo: number;
}> {
  const totalHours = daysAgo * 24;
  const positions: ReturnType<typeof generatePositions> = [];

  for (let h = totalHours; h >= 0; h--) {
    // Progress at this hour: linearly interpolate from 0 to `progress`
    const t = ((totalHours - h) / totalHours) * progress;

    const lat = origin[0] + (dest[0] - origin[0]) * t;
    const lng = origin[1] + (dest[1] - origin[1]) * t;

    // Bearing approximation (constant for a straight line)
    const dLat = dest[0] - origin[0];
    const dLng = dest[1] - origin[1];
    const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    const headingNorm = ((heading % 360) + 360) % 360;

    // Speed with slight random jitter (12–16 kn typical)
    const baseSpeed = 14;
    const jitter = (Math.sin(h * 0.3) + Math.cos(h * 0.7)) * 1.5;
    const speed = Math.max(3, baseSpeed + jitter);

    positions.push({
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      speed_kn: Math.round(speed * 10) / 10,
      heading_deg: Math.round(headingNorm * 10) / 10,
      nav_status: speed < 5 ? "moored" : "underway",
      draught: 12.5,
      hoursAgo: h,
    });
  }

  return positions;
}
