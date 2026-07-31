"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataStatusBanner } from "@/components/data-status-banner";
import { Icon } from "@/components/icon";
import { ReviewReminderController } from "@/components/review-reminder";
import { ThemeCaptureIcon } from "@/components/theme-capture-icon";
import { isDestinationActive, primaryDestinations, type Destination } from "@/lib/navigation";
import { useMobileQuickAccess } from "@/lib/navigation-preferences";
import { useThemePreference } from "@/lib/theme-preferences";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const spacesActive = pathname === "/spaces" || pathname.startsWith("/spaces/");
  const { destinations: mobileDestinations } = useMobileQuickAccess();
  const { theme } = useThemePreference();

  return (
    <div className="theme-shell min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center border-r border-slate-200 bg-white px-3 py-5 md:flex">
        <Link href="/" className="theme-home-button flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg" aria-label="Capture a thought">
          <ThemeCaptureIcon theme={theme} className="h-8 w-8" />
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
        <main className="mx-auto min-h-screen max-w-6xl px-4 pb-32 pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-6 md:px-8 md:pb-10 md:pt-8">
          <DataStatusBanner />
          <ReviewReminderController />
          {children}
        </main>
      </div>

      <nav className="mobile-dock theme-dock fixed z-30 grid grid-cols-5 items-end rounded-[1.6rem] border border-slate-200 bg-white/95 px-2 pb-2 pt-1 shadow-xl shadow-slate-900/10 backdrop-blur md:hidden" aria-label="Primary navigation">
        <DockLink destination={mobileDestinations[0]} active={isDestinationActive(pathname, mobileDestinations[0].href)} />
        <DockLink destination={mobileDestinations[1]} active={isDestinationActive(pathname, mobileDestinations[1].href)} />
        <div className="relative mx-auto flex min-h-14 w-16 items-end justify-center">
          <Link href="/" className="theme-home-button absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full shadow-lg" aria-label="Capture a thought" aria-current={pathname === "/" ? "page" : undefined}>
            <ThemeCaptureIcon theme={theme} className="h-9 w-9" />
          </Link>
          <Link
            href="/spaces"
            className={`absolute bottom-0 left-1/2 flex h-5 w-10 -translate-x-1/2 items-center justify-center rounded-full transition ${spacesActive ? "bg-slate-100 text-slate-950" : "text-slate-400 hover:text-slate-600"}`}
            aria-label="Open all spaces"
            aria-current={spacesActive ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 14 6-6 6 6" />
            </svg>
          </Link>
        </div>
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
