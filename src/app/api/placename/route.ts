import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const label = [data.locality, data.principalSubdivision, data.countryName]
      .filter(Boolean)
      .join(", ");
    return NextResponse.json({ label: label || "Unknown location" });
  } catch (err) {
    console.error("placename failed", err);
    return NextResponse.json({ label: null });
  }
}
