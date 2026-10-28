import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/hydrology";

function validateCoords(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

async function scanAndRespond(lat: number, lon: number) {
  if (!validateCoords(lat, lon)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  try {
    const report = await runScan(lat, lon);
    return NextResponse.json(report);
  } catch (err) {
    console.error("scan failed", err);
    return NextResponse.json(
      { error: "Upstream data source unavailable. Please try again shortly." },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { lat?: unknown; lon?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  return scanAndRespond(Number(body.lat), Number(body.lon));
}

/** Supports shareable/testable scan links: /api/scan?lat=..&lon=.. */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  return scanAndRespond(lat, lon);
}
