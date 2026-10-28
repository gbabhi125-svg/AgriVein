"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { ScanReport } from "@/lib/types";
import Gauge from "./Gauge";
import CropAdvisor from "./CropAdvisor";

const LocationMap = dynamic(() => import("./LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-800">
      Loading map…
    </div>
  ),
});

const DEFAULT_LAT = 20.5937;
const DEFAULT_LON = 78.9629;

export default function ScanDashboard() {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const fetchPlaceName = useCallback(async (la: number, lo: number) => {
    try {
      const res = await fetch(`/api/placename?lat=${la}&lon=${lo}`);
      const data = await res.json();
      setPlaceName(data.label);
    } catch {
      setPlaceName(null);
    }
  }, []);

  const handlePick = useCallback(
    (la: number, lo: number) => {
      setLat(la);
      setLon(lo);
      setReport(null);
      fetchPlaceName(la, lo);
    },
    [fetchPlaceName]
  );

  const useGps = useCallback(() => {
    if (!navigator.geolocation) {
      setError("GPS is not available on this device/browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        handlePick(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setError("Could not access GPS. Check location permissions and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handlePick]);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Scan failed");
      }
      const data: ScanReport = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-72 flex-1 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <LocationMap lat={lat} lon={lon} onPick={handlePick} />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Selected location</p>
            <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-50">
              {placeName ?? "Tap the map or use GPS"}
            </p>
            <p className="text-sm text-zinc-500">
              {lat.toFixed(5)}, {lon.toFixed(5)}
            </p>
          </div>
          <button
            onClick={useGps}
            disabled={locating}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {locating ? "Locating…" : "📍 Use my current GPS location"}
          </button>
          <button
            onClick={scan}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Scanning…" : "🔍 Scan groundwater at this point"}
          </button>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>
      </div>

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }: { report: ScanReport }) {
  const zoneColors: Record<string, string> = {
    GREEN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    YELLOW: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    RED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex items-center justify-between rounded-xl px-5 py-4 ${zoneColors[report.borewell.zone_status]}`}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            Borewell suitability
          </p>
          <p className="text-2xl font-bold">{report.borewell.zone_status} ZONE</p>
        </div>
        <p className="text-4xl font-bold">{report.borewell.success_score}%</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Soil Moisture (satellite-derived)
          </h3>
          <div className="flex flex-col gap-3">
            <Gauge
              label="Topsoil (0–5 cm)"
              value={report.moisture.surface_pct}
              displayValue={`${report.moisture.surface_pct}%`}
            />
            <Gauge
              label="Root zone (0–100 cm)"
              value={report.moisture.root_zone_pct}
              displayValue={`${report.moisture.root_zone_pct}%`}
            />
            <Gauge
              label="Deep profile (full column)"
              value={report.moisture.deep_profile_pct}
              displayValue={`${report.moisture.deep_profile_pct}%`}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            vs. seasonal normal:{" "}
            <span className="font-medium capitalize">{report.moisture.trend_vs_seasonal_normal}</span>
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Estimated Groundwater Depth
          </h3>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {report.groundwater.estimated_depth_range_ft[0]}–
            {report.groundwater.estimated_depth_range_ft[1]} ft
          </p>
          <p className="text-sm text-zinc-500">
            ({report.groundwater.estimated_depth_range_m[0]}–
            {report.groundwater.estimated_depth_range_m[1]} m) · confidence{" "}
            {report.groundwater.confidence_pct}%
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">Elevation</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-50">
              {report.elevation_m} m
            </dd>
            <dt className="text-zinc-500">Terrain position</dt>
            <dd className="text-right font-medium capitalize text-zinc-900 dark:text-zinc-50">
              {report.terrain.terrain_position}
            </dd>
            <dt className="text-zinc-500">Slope</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-50">
              {report.terrain.slope_percent}%
            </dd>
            <dt className="text-zinc-500">Wetness index (TWI)</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-50">
              {report.terrain.topographic_wetness_index}
            </dd>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Rainfall & Drilling Guidance
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <RainStat label="7 days" value={report.rainfall.last_7_days_mm} />
            <RainStat label="30 days" value={report.rainfall.last_30_days_mm} />
            <RainStat label="90 days" value={report.rainfall.last_90_days_mm} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">Recommended drill depth</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-50">
              {report.borewell.recommended_drill_depth_ft} ft
            </dd>
            <dt className="text-zinc-500">Recommended casing depth</dt>
            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-50">
              {report.borewell.recommended_casing_depth_ft} ft
            </dd>
          </dl>
        </div>
      </div>

      <CropAdvisor deepProfilePct={report.moisture.deep_profile_pct} />

      <div className="rounded-xl bg-zinc-100 p-4 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">Data sources</p>
        <ul className="mb-2 list-inside list-disc">
          {report.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p>{report.disclaimer}</p>
      </div>
    </div>
  );
}

function RainStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-100 py-3 dark:bg-zinc-800">
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{value} mm</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
