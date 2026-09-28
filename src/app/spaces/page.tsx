"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { destinations, primaryDestinations, type Destination } from "@/lib/navigation";
import {
  resetDesktopQuickAccess,
  resetMobileQuickAccess,
  setDesktopQuickAccess,
  setMobileQuickAccess,
  useDesktopQuickAccess,
  useMobileQuickAccess,
} from "@/lib/navigation-preferences";

const mobileSlotLabels = ["Left 1", "Left 2", "Right 1", "Right 2"] as const;

const destinationGroups = [
  { label: "Plan", ids: ["inbox", "projects", "tasks", "agenda", "review"] },
  { label: "Reference", ids: ["thoughts", "notes", "library", "food"] },
  { label: "Tracking", ids: ["expenses", "markets"] },
  { label: "System", ids: ["keychain", "accomplishments", "archive"] },
] as const;

function availableDestination(id: string) {
  return destinations.find((destination) => destination.id === id && destination.available);
}

function swapOrReplace(ids: readonly string[], index: number, destinationId: string) {
  const next = [...ids];
  const existingIndex = next.indexOf(destinationId);
  if (existingIndex >= 0) {
    [next[index], next[existingIndex]] = [next[existingIndex], next[index]];
  } else {
    next[index] = destinationId;
  }
  return next;
}

export default function SpacesPage() {
  const future = destinations.filter((destination) => !destination.available);
  const { ids: mobileQuickAccessIds } = useMobileQuickAccess();
  const { ids: desktopQuickAccessIds } = useDesktopQuickAccess();

  return (
    <section className="mx-auto max-w-4xl">
      <h2 className="text-3xl font-semibold tracking-tight">Spaces</h2>

      <div className="mt-6 space-y-6">
        {destinationGroups.map((group) => {
          const groupDestinations = group.ids.flatMap((id) => {
            const destination = availableDestination(id);
            return destination ? [destination] : [];
          });
          if (!groupDestinations.length) return null;

          return (
            <section key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{group.label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {groupDestinations.map((destination) => (
                  <DestinationCard key={destination.id} destination={destination} />
                ))}
              </div>
            </section>
          );
        })}

        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Access</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <details className="group col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2.5 sm:px-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon name="settings" />
                </span>
                <p className="min-w-0 flex-1 font-semibold">Navigation</p>
                <span className="text-lg text-slate-400 transition group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>

              <div className="border-t border-slate-200 px-4 pb-5 pt-4">
                <NavigationPreferences
                  title="Phone dock"
                  description="Choose the four shortcuts around Capture."
                  ids={mobileQuickAccessIds}
                  labels={mobileSlotLabels}
                  onChange={(index, destinationId) => setMobileQuickAccess(swapOrReplace(mobileQuickAccessIds, index, destinationId))}
                  onReset={resetMobileQuickAccess}
                />

                <div className="mt-6 hidden border-t border-slate-200 pt-5 md:block">
                  <NavigationPreferences
                    title="Desktop rail"
                    description="Choose the seven shortcuts shown between Capture and Spaces."
                    ids={desktopQuickAccessIds}
                    labels={desktopQuickAccessIds.map((_, index) => `Pin ${index + 1}`)}
                    onChange={(index, destinationId) => setDesktopQuickAccess(swapOrReplace(desktopQuickAccessIds, index, destinationId))}
                    onReset={resetDesktopQuickAccess}
                  />
                </div>
              </div>
            </details>

            <Link href="/account" className="col-span-2 flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-slate-400 sm:px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-semibold text-white">A</span>
              <p className="font-semibold">Account & access</p>
            </Link>
          </div>
        </section>

        {future.length ? (
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Later</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {future.map((destination) => (
                <div key={destination.id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-2.5 text-slate-400 sm:px-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                    <Icon name={destination.icon} />
                  </span>
                  <p className="min-w-0 truncate font-semibold text-slate-500">{destination.label}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <Link
      href={destination.href}
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-slate-400 sm:px-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon name={destination.icon} />
      </span>
      <p className="min-w-0 truncate font-semibold">{destination.label}</p>
    </Link>
  );
}

function NavigationPreferences({
  title,
  description,
  ids,
  labels,
  onChange,
  onReset,
}: {
  title: string;
  description: string;
  ids: readonly string[];
  labels: readonly string[];
  onChange: (index: number, destinationId: string) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {ids.map((destinationId, index) => (
          <label key={labels[index]} className="text-sm font-medium text-slate-700">
            {labels[index]}
            <select className="input mt-1.5" value={destinationId} onChange={(event) => onChange(index, event.target.value)}>
              {primaryDestinations.map((destination) => (
                <option key={destination.id} value={destination.id}>{destination.label}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 active:bg-slate-100"
      >
        Reset
      </button>
    </div>
  );
}
