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
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">All spaces</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Everything has a place without crowding the phone dock.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Open any available space below. Desktop shows every primary space in the side rail.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/account" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 font-semibold text-white">A</span>
            <div><p className="font-semibold">Account & access</p><p className="mt-1 text-sm leading-5 text-slate-500">Sign out, export your data, and manage invited accounts.</p></div>
          </div>
        </Link>

        {available.map((destination) => (
          <Link key={destination.id} href={destination.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon name={destination.icon} /></span>
              <div><p className="font-semibold">{destination.label}</p><p className="mt-1 text-sm leading-5 text-slate-500">{destination.description}</p></div>
            </div>
          </Link>
        ))}

        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition open:sm:col-span-2">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon name="settings" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Mobile quick access</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">Choose the four spaces shown around Capture on this device.</p>
            </div>
            <span className="text-xl text-slate-400 transition group-open:rotate-45" aria-hidden="true">＋</span>
          </summary>

          <div className="border-t border-slate-200 px-4 pb-5 pt-4 sm:px-5">
            <p className="text-sm leading-6 text-slate-500">
              The choice is stored in this browser, so your phone and PC can use different layouts. Selecting an already-used space swaps the two positions.
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
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Later spaces</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {future.map((destination) => (
            <div key={destination.id} className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50"><Icon name={destination.icon} /></span>
                <div><p className="font-semibold text-slate-500">{destination.label}</p><p className="mt-1 text-sm leading-5">{destination.description}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
