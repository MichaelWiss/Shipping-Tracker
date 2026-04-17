// 30 days of VLSFO + HSFO prices (60 rows total).

export function generateFuelPrices(): Array<{
  date: string;
  fuel_type: "VLSFO" | "HSFO";
  price_usd_per_mt: number;
  source: string;
}> {
  const rows: ReturnType<typeof generateFuelPrices> = [];
  const now = new Date();

  for (let d = 29; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);

    // VLSFO base ~$600, small daily random walk
    const vlsfo = 600 + Math.sin(d * 0.5) * 30 + Math.cos(d * 0.3) * 15;
    // HSFO base ~$420, correlated but cheaper
    const hsfo = 420 + Math.sin(d * 0.5) * 20 + Math.cos(d * 0.3) * 10;

    rows.push({
      date: dateStr,
      fuel_type: "VLSFO",
      price_usd_per_mt: Math.round(vlsfo * 100) / 100,
      source: "EIA",
    });
    rows.push({
      date: dateStr,
      fuel_type: "HSFO",
      price_usd_per_mt: Math.round(hsfo * 100) / 100,
      source: "EIA",
    });
  }

  return rows;
}
