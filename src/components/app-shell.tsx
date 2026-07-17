"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { defaultPinnedDestinations, destinations, isDestinationActive } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [spacesOpen, setSpacesOpen] = useState(false);
  const title = pathname === "/"
    ? "Capture"
    : destinations.find((destination) => isDestinationActive(pathname, destination.href))?.label ?? "Personal Control Center";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center border-r border-slate-200 bg-white px-3 py-5 md:flex">
        <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white" aria-label="Capture a thought">
          <Icon name="capture" className="h-6 w-6" />
        </Link>
        <nav className="mt-8 flex w-full flex-col gap-2" aria-label="Primary navigation">
          {defaultPinnedDestinations.map((destination) => (
            <RailLink key={destination.id} destination={destination} active={isDestinationActive(pathname, destination.href)} />
          ))}
        </nav>
        <button type="button" onClick={() => setSpacesOpen(true)} className="mt-auto flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950">
          <Icon name="spaces" />
          Spaces
        </button>
      </aside>

      <div className="md:pl-24">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Personal Control Center</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h1>
          </div>
          <button type="button" onClick={() => setSpacesOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm md:hidden" aria-label="Open all spaces">
            <Icon name="spaces" />
          </button>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl px-4 pb-32 pt-6 sm:px-6 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>

      <nav className="mobile-dock fixed z-30 grid grid-cols-5 items-end rounded-[1.6rem] border border-slate-200 bg-white/95 px-2 pb-2 pt-1 shadow-xl shadow-slate-900/10 backdrop-blur md:hidden" aria-label="Primary navigation">
        <DockLink destination={defaultPinnedDestinations[0]} active={isDestinationActive(pathname, defaultPinnedDestinations[0].href)} />
        <DockLink destination={defaultPinnedDestinations[1]} active={isDestinationActive(pathname, defaultPinnedDestinations[1].href)} />
        <Link href="/" className="relative -top-5 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-900/25" aria-label="Capture a thought" aria-current={pathname === "/" ? "page" : undefined}>
          <Icon name="capture" className="h-7 w-7" />
        </Link>
        <DockLink destination={defaultPinnedDestinations[2]} active={isDestinationActive(pathname, defaultPinnedDestinations[2].href)} />
        <DockLink destination={defaultPinnedDestinations[3]} active={isDestinationActive(pathname, defaultPinnedDestinations[3].href)} />
      </nav>

      {spacesOpen ? <SpacesSheet pathname={pathname} onClose={() => setSpacesOpen(false)} /> : null}
    </div>
  );
}

function RailLink({ destination, active }: { destination: (typeof defaultPinnedDestinations)[number]; active: boolean }) {
  return (
    <Link href={destination.href} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium transition ${active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`} aria-current={active ? "page" : undefined}>
      <Icon name={destination.icon} />
      {destination.label}
    </Link>
  );
}

function DockLink({ destination, active }: { destination: (typeof defaultPinnedDestinations)[number]; active: boolean }) {
  return (
    <Link href={destination.href} className={`flex min-h-14 flex-col items-center justify-end gap-1 rounded-2xl pb-1 text-[0.68rem] font-medium transition ${active ? "text-slate-950" : "text-slate-400"}`} aria-current={active ? "page" : undefined}>
      <span className={`flex h-8 w-11 items-center justify-center rounded-xl ${active ? "bg-slate-100" : ""}`}>
        <Icon name={destination.icon} />
      </span>
      {destination.label}
    </Link>
  );
}

function SpacesSheet({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const available = destinations.filter((destination) => destination.available);
  const future = destinations.filter((destination) => !destination.available);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="All spaces">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close spaces" />
      <section className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">All spaces</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your app can grow without crowding the dock.</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-600" aria-label="Close">×</button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {available.map((destination) => (
            <Link key={destination.id} href={destination.href} onClick={onClose} className={`rounded-2xl border p-4 transition ${isDestinationActive(pathname, destination.href) ? "border-slate-950 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon name={destination.icon} /></span>
                <div><p className="font-semibold">{destination.label}</p><p className="mt-1 text-sm leading-5 text-slate-500">{destination.description}</p></div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Later spaces</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {future.map((destination) => (
              <div key={destination.id} className="rounded-2xl border border-dashed border-slate-200 p-4 text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50"><Icon name={destination.icon} /></span>
                  <div><p className="font-semibold text-slate-500">{destination.label}</p><p className="mt-1 text-sm leading-5">{destination.description}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
