export interface ScanRequest {
  lat: number;
  lon: number;
}

export interface ScanReport {
  coordinates: { lat: number; lon: number };
  elevation_m: number;
  terrain: {
    slope_percent: number;
    terrain_position: "valley" | "slope" | "ridge" | "flat";
    topographic_wetness_index: number;
  };
  moisture: {
    surface_pct: number; // top ~5cm, 0-100
    root_zone_pct: number; // ~0-100cm, 0-100
    deep_profile_pct: number; // full profile, 0-100
    trend_vs_seasonal_normal: "above" | "near" | "below";
  };
  rainfall: {
    last_7_days_mm: number;
    last_30_days_mm: number;
    last_90_days_mm: number;
  };
  groundwater: {
    estimated_depth_range_m: [number, number];
    estimated_depth_range_ft: [number, number];
    confidence_pct: number;
  };
  borewell: {
    success_score: number; // 0-100
    zone_status: "GREEN" | "YELLOW" | "RED";
    recommended_drill_depth_ft: number;
    recommended_casing_depth_ft: number;
  };
  sources: string[];
  disclaimer: string;
}
