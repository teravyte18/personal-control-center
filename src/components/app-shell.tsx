"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataStatusBanner } from "@/components/data-status-banner";
import { Icon } from "@/components/icon";
import { ReviewReminderController } from "@/components/review-reminder";
import { isDestinationActive, primaryDestinations, type Destination } from "@/lib/navigation";
import { useMobileQuickAccess } from "@/lib/navigation-preferences";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const spacesActive = pathname === "/spaces" || pathname.startsWith("/spaces/");
  const { destinations: mobileDestinations } = useMobileQuickAccess();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center border-r border-slate-200 bg-white px-3 py-5 md:flex">
        <Link href="/" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white" aria-label="Capture a thought">
          <Icon name="capture" className="h-6 w-6" />
        </Link>
        <nav className="mt-8 flex w-full flex-1 flex-col gap-2 overflow-y-auto" aria-label="Primary navigation">
          {primaryDestinations.map((destination) => (
            <RailLink key={destination.id} destination={destination} active={isDestinationActive(pathname, destination.href)} />
          ))}
        </nav>
        <Link href="/spaces" className={`mt-4 flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium ${spacesActive ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`} aria-current={spacesActive ? "page" : undefined}>
          <Icon name="spaces" />
          Spaces
        </Link>
      </aside>

      <div className="md:pl-24">
        <Link href="/spaces" className={`fixed right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm md:hidden ${spacesActive ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white/95 text-slate-600 backdrop-blur"}`} aria-label="Open all spaces" aria-current={spacesActive ? "page" : undefined}>
          <Icon name="spaces" />
        </Link>

        <main className="mx-auto min-h-screen max-w-6xl px-4 pb-32 pt-20 sm:px-6 md:px-8 md:pb-10 md:pt-8">
          <DataStatusBanner />
          <ReviewReminderController />
          {children}
        </main>
      </div>

      <nav className="mobile-dock fixed z-30 grid grid-cols-5 items-end rounded-[1.6rem] border border-slate-200 bg-white/95 px-2 pb-2 pt-1 shadow-xl shadow-slate-900/10 backdrop-blur md:hidden" aria-label="Primary navigation">
        <DockLink destination={mobileDestinations[0]} active={isDestinationActive(pathname, mobileDestinations[0].href)} />
        <DockLink destination={mobileDestinations[1]} active={isDestinationActive(pathname, mobileDestinations[1].href)} />
        <Link href="/" className="relative -top-5 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-900/25" aria-label="Capture a thought" aria-current={pathname === "/" ? "page" : undefined}>
          <Icon name="capture" className="h-7 w-7" />
        </Link>
        <DockLink destination={mobileDestinations[2]} active={isDestinationActive(pathname, mobileDestinations[2].href)} />
        <DockLink destination={mobileDestinations[3]} active={isDestinationActive(pathname, mobileDestinations[3].href)} />
      </nav>
    </div>
  );
}

function RailLink({ destination, active }: { destination: Destination; active: boolean }) {
  return (
    <Link href={destination.href} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium transition ${active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`} aria-current={active ? "page" : undefined}>
      <Icon name={destination.icon} />
      {destination.label}
    </Link>
  );
}

function DockLink({ destination, active }: { destination: Destination; active: boolean }) {
  return (
    <Link href={destination.href} className={`flex min-h-14 flex-col items-center justify-end gap-1 rounded-2xl pb-1 text-[0.68rem] font-medium transition ${active ? "text-slate-950" : "text-slate-400"}`} aria-current={active ? "page" : undefined}>
      <span className={`flex h-8 w-11 items-center justify-center rounded-xl ${active ? "bg-slate-100" : ""}`}>
        <Icon name={destination.icon} />
      </span>
      {destination.label}
    </Link>
  );
}
