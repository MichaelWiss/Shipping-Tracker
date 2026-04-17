// Static weather grid snapshot — ~25 points across active corridors.

export function generateWeatherGrid(): Array<{
  timestamp: string;
  lat: number;
  lng: number;
  wind_speed_kn: number;
  wind_dir_deg: number;
  wave_height_m: number;
  beaufort: number;
}> {
  const now = new Date().toISOString();

  // Grid points along major shipping lanes
  const points: [number, number][] = [
    // Suez corridor (Mediterranean → Red Sea)
    [35.0, 20.0], [30.0, 32.0], [25.0, 35.0], [20.0, 40.0], [15.0, 50.0],
    // Indian Ocean
    [10.0, 65.0], [5.0, 75.0], [3.0, 85.0], [5.0, 95.0],
    // South China Sea
    [10.0, 110.0], [15.0, 115.0], [22.0, 118.0], [28.0, 122.0],
    // North Pacific
    [30.0, 140.0], [35.0, 160.0], [38.0, 180.0], [37.0, -160.0], [35.0, -140.0],
    // North Atlantic
    [50.0, -10.0], [48.0, -25.0], [45.0, -40.0], [42.0, -55.0], [40.0, -70.0],
    // North Sea / Baltic
    [54.0, 5.0], [57.0, 10.0],
  ];

  return points.map(([lat, lng], i) => {
    const windSpeed = 8 + Math.sin(i * 1.3) * 6 + Math.cos(i * 0.7) * 4;
    const windDir = ((i * 47) % 360);
    const waveHeight = 1.0 + Math.abs(Math.sin(i * 0.9)) * 3.5;
    const beaufort = windSpeedToBeaufort(Math.max(0, windSpeed));

    return {
      timestamp: now,
      lat,
      lng,
      wind_speed_kn: Math.round(windSpeed * 10) / 10,
      wind_dir_deg: windDir,
      wave_height_m: Math.round(waveHeight * 10) / 10,
      beaufort,
    };
  });
}

function windSpeedToBeaufort(kn: number): number {
  if (kn < 1) return 0;
  if (kn < 4) return 1;
  if (kn < 7) return 2;
  if (kn < 11) return 3;
  if (kn < 17) return 4;
  if (kn < 22) return 5;
  if (kn < 28) return 6;
  if (kn < 34) return 7;
  if (kn < 41) return 8;
  if (kn < 48) return 9;
  if (kn < 56) return 10;
  if (kn < 64) return 11;
  return 12;
}
