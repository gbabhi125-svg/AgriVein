import ScanDashboard from "@/components/ScanDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            🌾 AgriVein
          </h1>
          <p className="text-sm text-zinc-500">
            Satellite-driven groundwater &amp; soil moisture scanner for farmers — find where to
            dig your next borewell.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        <ScanDashboard />
      </main>
      <footer className="mx-auto max-w-4xl px-4 py-8 text-xs text-zinc-400 sm:px-8">
        AgriVein uses public NASA and Open-Meteo satellite/model data. It is a planning aid, not a
        replacement for a certified hydrogeological survey.
      </footer>
    </div>
  );
}
