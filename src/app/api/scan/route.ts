import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/hydrology";

export async function POST(req: NextRequest) {
  let body: { lat?: unknown; lon?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lon = Number(body.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
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
