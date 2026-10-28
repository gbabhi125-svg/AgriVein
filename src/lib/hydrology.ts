import type { ScanReport } from "./types";

const POWER_BASE = "https://power.larc.nasa.gov/api/temporal/daily/point";
const ELEVATION_BASE = "https://api.open-meteo.com/v1/elevation";

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return res.json();
}

/** NASA POWER agroclimatology daily point data: soil wetness fractions + precipitation. */
async function fetchPowerData(lat: number, lon: number) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2); // POWER has ~2 day latency
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 400); // extra history for seasonal-normal comparison

  const params = new URLSearchParams({
    parameters: "PRECTOTCORR,GWETTOP,GWETROOT,GWETPROF",
    community: "AG",
    longitude: lon.toString(),
    latitude: lat.toString(),
    start: fmtDate(start),
    end: fmtDate(end),
    format: "JSON",
  });

  const data = await fetchJson(`${POWER_BASE}?${params.toString()}`);
  const p = data?.properties?.parameter;
  if (!p) throw new Error("NASA POWER response missing parameters");
  return p as Record<string, Record<string, number>>;
}

/** Open-Meteo elevation API, sampled at a small cross pattern to approximate local slope. */
async function fetchElevationGrid(lat: number, lon: number) {
  const offset = 0.0045; // ~500m at mid-latitudes
  const points = [
    [lat, lon],
    [lat + offset, lon],
    [lat - offset, lon],
    [lat, lon + offset],
    [lat, lon - offset],
  ];
  const lats = points.map((p) => p[0]).join(",");
  const lons = points.map((p) => p[1]).join(",");
  const data = await fetchJson(
    `${ELEVATION_BASE}?latitude=${lats}&longitude=${lons}`
  );
  const elevations: number[] = data.elevation;
  return elevations; // [center, north, south, east, west]
}

function average(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v) && v > -900);
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function sumLastNDays(series: Record<string, number>, n: number): number {
  const dates = Object.keys(series).sort();
  const lastN = dates.slice(-n);
  return lastN.reduce((acc, d) => {
    const v = series[d];
    return acc + (Number.isFinite(v) && v > -900 ? v : 0);
  }, 0);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export async function runScan(lat: number, lon: number): Promise<ScanReport> {
  const [power, elevations] = await Promise.all([
    fetchPowerData(lat, lon),
    fetchElevationGrid(lat, lon),
  ]);

  const [elevCenter, elevN, elevS, elevE, elevW] = elevations;
  const neighborAvg = average([elevN, elevS, elevE, elevW]);
  const reliefRange = Math.max(elevN, elevS, elevE, elevW, elevCenter) -
    Math.min(elevN, elevS, elevE, elevW, elevCenter);
  // ~500m spacing between sample points -> percent slope
  const slopePercent = clamp((reliefRange / 500) * 100, 0, 60);
  const relativePosition = elevCenter - neighborAvg; // negative = local low point (valley)

  let terrainPosition: "valley" | "slope" | "ridge" | "flat";
  if (slopePercent < 1.5) terrainPosition = "flat";
  else if (relativePosition < -2) terrainPosition = "valley";
  else if (relativePosition > 2) terrainPosition = "ridge";
  else terrainPosition = "slope";

  // Topographic Wetness Index proxy: ln(upslope-accumulation-proxy / tan(slope))
  // We don't have a real flow-accumulation grid, so we use the inverse local
  // relief as an accumulation proxy (flatter, lower spots collect more water).
  const slopeRad = Math.max(slopePercent, 0.5) * (Math.PI / 180);
  const accumulationProxy = clamp(10 - relativePosition, 1, 30);
  const twi = Math.log(accumulationProxy / Math.tan(slopeRad));

  const gwetTopSeries = power.GWETTOP;
  const gwetRootSeries = power.GWETROOT;
  const gwetProfSeries = power.GWETPROF;
  const precipSeries = power.PRECTOTCORR;

  const dates = Object.keys(gwetProfSeries).sort();
  const isValid = (v: number) => Number.isFinite(v) && v > -900;
  const latestValidDate = [...dates]
    .reverse()
    .find(
      (d) =>
        isValid(gwetTopSeries[d]) && isValid(gwetRootSeries[d]) && isValid(gwetProfSeries[d])
    );
  const latestDate = latestValidDate ?? dates[dates.length - 1];
  const surfaceFrac = gwetTopSeries[latestDate];
  const rootFrac = gwetRootSeries[latestDate];
  const profFrac = gwetProfSeries[latestDate];

  // Seasonal-normal comparison: average profile wetness over the full ~400-day
  // history vs the most recent 14 days.
  const recentDates = dates.slice(-14);
  const recentAvgProf = average(recentDates.map((d) => gwetProfSeries[d]));
  const historicalAvgProf = average(dates.map((d) => gwetProfSeries[d]));
  let trend: "above" | "near" | "below" = "near";
  if (Number.isFinite(recentAvgProf) && Number.isFinite(historicalAvgProf)) {
    const delta = recentAvgProf - historicalAvgProf;
    if (delta > 0.03) trend = "above";
    else if (delta < -0.03) trend = "below";
  }

  const rain7 = sumLastNDays(precipSeries, 7);
  const rain30 = sumLastNDays(precipSeries, 30);
  const rain90 = sumLastNDays(precipSeries, 90);

  const surfacePct = clamp(surfaceFrac * 100, 0, 100);
  const rootPct = clamp(rootFrac * 100, 0, 100);
  const deepPct = clamp(profFrac * 100, 0, 100);

  // --- Groundwater depth heuristic ---
  // Base depth driven by terrain position + regional moisture; this is a
  // transparent statistical estimate from satellite/model data, NOT a
  // physical sounding. It is meant to guide where to prioritize a proper
  // resistivity survey, not replace one.
  let baseDepthM: number;
  if (terrainPosition === "valley") baseDepthM = 25;
  else if (terrainPosition === "flat") baseDepthM = 40;
  else if (terrainPosition === "slope") baseDepthM = 60;
  else baseDepthM = 90; // ridge

  const moistureAdjustM = (0.5 - profFrac) * 60; // wetter profile -> shallower
  const slopeAdjustM = slopePercent * 0.6; // steeper -> deeper
  const rainAdjustM = -clamp(rain90 / 20, 0, 15); // more recent rain -> shallower

  const centerDepthM = clamp(
    baseDepthM + moistureAdjustM + slopeAdjustM + rainAdjustM,
    8,
    300
  );
  const uncertaintyM = clamp(centerDepthM * 0.35, 10, 60);
  const depthLowM = Math.max(5, Math.round(centerDepthM - uncertaintyM));
  const depthHighM = Math.round(centerDepthM + uncertaintyM);

  const metersToFeet = (m: number) => Math.round(m * 3.28084);

  // --- Borewell success score (0-100) ---
  const twiScore = clamp(((twi + 2) / 6) * 100, 0, 100); // higher TWI -> better
  const moistureScore = (deepPct + rootPct) / 2;
  const slopePenalty = clamp(slopePercent * 1.2, 0, 40);
  const rainBonus = clamp(rain30 / 3, 0, 20);

  let successScore = 0.4 * twiScore + 0.4 * moistureScore + rainBonus - slopePenalty;
  successScore = clamp(Math.round(successScore), 5, 97);

  let zoneStatus: "GREEN" | "YELLOW" | "RED";
  if (successScore >= 70) zoneStatus = "GREEN";
  else if (successScore >= 45) zoneStatus = "YELLOW";
  else zoneStatus = "RED";

  const recommendedDrillDepthFt = metersToFeet(depthHighM) + 30;
  const recommendedCasingDepthFt = metersToFeet(centerDepthM) + 40;

  const confidencePct = clamp(
    Math.round(60 + (Number.isFinite(historicalAvgProf) ? 15 : 0) - slopePercent * 0.3),
    30,
    85
  );

  return {
    coordinates: { lat, lon },
    elevation_m: Math.round(elevCenter),
    terrain: {
      slope_percent: Math.round(slopePercent * 10) / 10,
      terrain_position: terrainPosition,
      topographic_wetness_index: Math.round(twi * 100) / 100,
    },
    moisture: {
      surface_pct: Math.round(surfacePct),
      root_zone_pct: Math.round(rootPct),
      deep_profile_pct: Math.round(deepPct),
      trend_vs_seasonal_normal: trend,
    },
    rainfall: {
      last_7_days_mm: Math.round(rain7 * 10) / 10,
      last_30_days_mm: Math.round(rain30 * 10) / 10,
      last_90_days_mm: Math.round(rain90 * 10) / 10,
    },
    groundwater: {
      estimated_depth_range_m: [depthLowM, depthHighM],
      estimated_depth_range_ft: [metersToFeet(depthLowM), metersToFeet(depthHighM)],
      confidence_pct: confidencePct,
    },
    borewell: {
      success_score: successScore,
      zone_status: zoneStatus,
      recommended_drill_depth_ft: recommendedDrillDepthFt,
      recommended_casing_depth_ft: recommendedCasingDepthFt,
    },
    sources: [
      "NASA POWER (soil moisture profile, precipitation)",
      "Open-Meteo Elevation (terrain slope & position)",
    ],
    disclaimer:
      "This is a statistical estimate from public satellite and model data, not a ground-truth measurement. Confirm with a certified hydrogeologist or an electrical resistivity survey before drilling.",
  };
}
