# 🌾 AgriVein

A satellite-driven groundwater, soil moisture, and borewell-suitability scanner for farmers.
Stand on a spot (or drop a pin on the map), scan, and get an estimate of:

- **Topsoil / root-zone / deep-profile soil moisture** — from NASA POWER agroclimatology data.
- **Estimated groundwater (water table) depth range** — a transparent statistical model combining
  terrain slope/position (via Open-Meteo elevation) with soil-moisture and rainfall trends.
- **Borewell success score & GREEN/YELLOW/RED zone status** — a topographic-wetness-index-based
  suitability score.
- **Recommended drill & casing depth**.
- **Rainfall recharge trend** (7/30/90-day totals, vs. seasonal normal).
- **Crop water budget advisor** — how many days a given crop/acreage could be sustained at the
  current moisture level.

## Why this works without IoT hardware

There's no way to see 300 ft underground from a phone sensor. Instead, this app pulls **free,
public, real satellite/model data** for whatever GPS coordinate you're standing on and runs it
through a documented hydrological heuristic:

| Metric | Source |
|---|---|
| Soil moisture (surface / root-zone / profile) | [NASA POWER](https://power.larc.nasa.gov/) daily agroclimatology (`GWETTOP`, `GWETROOT`, `GWETPROF`) |
| Precipitation (7/30/90-day) | NASA POWER (`PRECTOTCORR`) |
| Elevation & slope | [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) |
| Reverse geocoding (place name) | [BigDataCloud](https://www.bigdatacloud.com/) free reverse-geocode |

All of these are free, keyless, public APIs — no IoT device required. The groundwater **depth**
and **borewell success score** are a transparent statistical estimate (the exact formula is in
[`src/lib/hydrology.ts`](src/lib/hydrology.ts)), not a physical measurement. Treat it as a
prioritization tool for where to run a proper electrical resistivity survey — not a replacement
for one.

## Tech stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- React-Leaflet / OpenStreetMap for the pick-a-point map
- Server-side API routes (`/api/scan`, `/api/placename`) do all external data fetching, so no
  API keys are ever exposed to the browser.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, allow location access (or click the map), then click **Scan**.

## Roadmap (not yet built)

Bigger ideas that need hardware, partners, or data this MVP doesn't have yet: a
phone-magnetometer fracture-mapping walk, AR subsurface visualization, sonic borewell-depth
verification, a drilling-rig marketplace, dry-well insurance, and a community aquifer-depletion
alert network.
