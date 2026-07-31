"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { destinations, primaryDestinations } from "@/lib/navigation";
import {
  resetMobileQuickAccess,
  setMobileQuickAccess,
  useMobileQuickAccess,
} from "@/lib/navigation-preferences";

const slotLabels = ["Left 1", "Left 2", "Right 1", "Right 2"] as const;

export default function SpacesPage() {
  const available = destinations.filter((destination) => destination.available);
  const future = destinations.filter((destination) => !destination.available);
  const { ids: mobileQuickAccessIds } = useMobileQuickAccess();

  function updateSlot(index: number, destinationId: string) {
    const next = [...mobileQuickAccessIds];
    const existingIndex = next.indexOf(destinationId);
    if (existingIndex >= 0) {
      [next[index], next[existingIndex]] = [next[existingIndex], next[index]];
    } else {
      next[index] = destinationId;
    }
    setMobileQuickAccess(next);
  }

  return (
    <section className="mx-auto max-w-4xl">
      <h2 className="text-3xl font-semibold tracking-tight">Spaces</h2>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {available.map((destination) => (
          <Link key={destination.id} href={destination.href} className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-400">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon name={destination.icon} /></span>
            <p className="font-semibold">{destination.label}</p>
          </Link>
        ))}

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition open:sm:col-span-2">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon name="settings" /></span>
            <p className="min-w-0 flex-1 font-semibold">Mobile quick access</p>
            <span className="text-xl text-slate-400 transition group-open:rotate-45" aria-hidden="true">＋</span>
          </summary>

          <div className="border-t border-slate-200 px-4 pb-5 pt-4 sm:px-5">
            <p className="text-sm leading-6 text-slate-500">
              Choose the four spaces shown around Capture on this device. Selecting an already-used space swaps the two positions.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {mobileQuickAccessIds.map((destinationId, index) => (
                <label key={slotLabels[index]} className="text-sm font-medium text-slate-700">
                  {slotLabels[index]}
                  <select className="input mt-2" value={destinationId} onChange={(event) => updateSlot(index, event.target.value)}>
                    {primaryDestinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>{destination.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button type="button" onClick={resetMobileQuickAccess} className="mt-4 min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 active:bg-slate-100">
              Reset to default
            </button>
          </div>
        </details>

        <Link href="/account" className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-400">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-semibold text-white">A</span>
          <p className="font-semibold">Account & access</p>
        </Link>
      </div>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Later spaces</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {future.map((destination) => (
            <div key={destination.id} className="flex min-h-16 items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-3 text-slate-400">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50"><Icon name={destination.icon} /></span>
              <p className="font-semibold text-slate-500">{destination.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
