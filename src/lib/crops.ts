export interface CropProfile {
  id: string;
  name: string;
  // Typical peak-season crop water demand in mm/day (evapotranspiration-based).
  waterDemandMmPerDay: number;
  rootDepthM: number;
}

export const CROPS: CropProfile[] = [
  { id: "sugarcane", name: "Sugarcane", waterDemandMmPerDay: 6.5, rootDepthM: 1.5 },
  { id: "rice", name: "Rice (paddy)", waterDemandMmPerDay: 7.5, rootDepthM: 0.5 },
  { id: "cotton", name: "Cotton", waterDemandMmPerDay: 5.0, rootDepthM: 1.2 },
  { id: "wheat", name: "Wheat", waterDemandMmPerDay: 4.5, rootDepthM: 1.0 },
  { id: "maize", name: "Maize", waterDemandMmPerDay: 5.5, rootDepthM: 1.0 },
  { id: "groundnut", name: "Groundnut", waterDemandMmPerDay: 4.0, rootDepthM: 0.6 },
  { id: "millet", name: "Millet / Ragi", waterDemandMmPerDay: 3.0, rootDepthM: 0.8 },
  { id: "vegetables", name: "Vegetables (mixed)", waterDemandMmPerDay: 4.5, rootDepthM: 0.4 },
];

/**
 * Rough sustainability estimate: usable stored-water depth in the root zone,
 * derived from the deep-profile soil-moisture fraction, divided by the crop's
 * daily demand. This is a planning aid, not an irrigation schedule.
 */
export function estimateSustainableDays(
  deepProfilePct: number,
  acres: number,
  crop: CropProfile
): number {
  const availableWaterMm = (deepProfilePct / 100) * crop.rootDepthM * 1000 * 0.3;
  const demandAdjustedForScale = crop.waterDemandMmPerDay * clampAcreFactor(acres);
  if (demandAdjustedForScale <= 0) return 0;
  return Math.max(0, Math.round(availableWaterMm / demandAdjustedForScale));
}

function clampAcreFactor(acres: number): number {
  // Larger irrigated areas draw down a shared aquifer faster per unit area
  // due to interference between wells; mild non-linear penalty above 3 acres.
  if (acres <= 3) return 1;
  return 1 + (acres - 3) * 0.08;
}
