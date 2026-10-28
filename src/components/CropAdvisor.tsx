"use client";

import { useMemo, useState } from "react";
import { CROPS, estimateSustainableDays } from "@/lib/crops";

interface Props {
  deepProfilePct: number;
}

export default function CropAdvisor({ deepProfilePct }: Props) {
  const [cropId, setCropId] = useState(CROPS[0].id);
  const [acres, setAcres] = useState(2);

  const crop = CROPS.find((c) => c.id === cropId) ?? CROPS[0];
  const days = useMemo(
    () => estimateSustainableDays(deepProfilePct, acres, crop),
    [deepProfilePct, acres, crop]
  );

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Crop Water Budget Advisor
      </h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Crop</span>
          <select
            value={cropId}
            onChange={(e) => setCropId(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col gap-1 text-sm sm:w-32">
          <span className="text-zinc-600 dark:text-zinc-400">Irrigated acres</span>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={acres}
            onChange={(e) => setAcres(Number(e.target.value) || 0)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
        </label>
      </div>
      <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
        At today&apos;s subsurface moisture, this borewell could sustain{" "}
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {acres} acre{acres === 1 ? "" : "s"} of {crop.name.toLowerCase()}
        </span>{" "}
        for roughly{" "}
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">~{days} days</span>{" "}
        before relying fully on fresh rainfall or recharge.
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Rough planning estimate from current satellite soil-moisture data, not a substitute for a
        local irrigation schedule.
      </p>
    </div>
  );
}
