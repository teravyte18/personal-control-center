"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { defaultPinnedDestinations, destinations, isDestinationActive } from "@/lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = pathname === "/"
    ? "Capture"
    : pathname === "/spaces"
      ? "All spaces"
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
        <Link href="/spaces" className={`mt-auto flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium ${pathname === "/spaces" ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`} aria-current={pathname === "/spaces" ? "page" : undefined}>
          <Icon name="spaces" />
          Spaces
        </Link>
      </aside>

      <div className="md:pl-24">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Personal Control Center</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h1>
          </div>
          <Link href="/spaces" className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm md:hidden ${pathname === "/spaces" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`} aria-label="Open all spaces" aria-current={pathname === "/spaces" ? "page" : undefined}>
            <Icon name="spaces" />
          </Link>
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
