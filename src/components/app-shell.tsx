"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataStatusBanner } from "@/components/data-status-banner";
import { Icon } from "@/components/icon";
import { ReviewPeriodController } from "@/components/review-reminder";
import { ThemeCaptureIcon } from "@/components/theme-capture-icon";
import { isDestinationActive, type Destination } from "@/lib/navigation";
import { useDesktopQuickAccess, useMobileQuickAccess } from "@/lib/navigation-preferences";
import { useThemePreference } from "@/lib/theme-preferences";
import { usePersonalData } from "@/lib/personal-data";

const designIcons = new Set(["projects", "tasks", "rhythm", "review"]);

function NavigationIcon({ destination }: { destination: Destination }) {
  return designIcons.has(destination.id)
    ? <span aria-hidden="true" className="pcc-navigation-icon" style={{ maskImage: `url(/focus-atlas/${destination.id}.svg)` }} />
    : <Icon name={destination.icon} className="h-5 w-5" />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const spacesActive = pathname === "/spaces" || pathname.startsWith("/spaces/");
  const { destinations: desktopDestinations } = useDesktopQuickAccess();
  const { destinations: mobileDestinations } = useMobileQuickAccess();
  const { theme } = useThemePreference();
  const { loaded } = usePersonalData();

  return (
    <div className="theme-shell pcc-shell" data-space={pathname.split("/")[1] || "home"}>
      <a className="pcc-skip-link" href="#working-surface">Skip to content</a>
      <aside className="pcc-rail" aria-label="Desktop navigation">
        <Link href="/" className="pcc-brand" aria-label="Personal Control Center">PCC</Link>
        <p className="pcc-brand-context">Personal Control Center</p>
        <nav className="pcc-pins" aria-label="Pinned navigation">
          {desktopDestinations.map((destination) => (
            <Link key={destination.id} href={destination.href} className={isDestinationActive(pathname, destination.href) ? "pcc-nav-link theme-nav-active" : "pcc-nav-link"} aria-current={isDestinationActive(pathname, destination.href) ? "page" : undefined}>
              {destination.id === "rhythm" ? "Week" : destination.label}
            </Link>
          ))}
        </nav>
        <nav className="pcc-permanent" aria-label="Permanent navigation">
          <Link href="/" className="pcc-control theme-home-button" aria-label="Capture a thought">
            <ThemeCaptureIcon theme={theme} className="h-5 w-5" /><span>Capture</span>
          </Link>
          <Link href="/spaces" className="pcc-control" aria-current={spacesActive ? "page" : undefined}>All Spaces</Link>
          <Link href="/account" className="pcc-control" aria-current={pathname === "/account" ? "page" : undefined}>Account &amp; access</Link>
        </nav>
      </aside>

      <header className="pcc-phone-header">
        <Link href="/" className="pcc-brand" aria-label="Personal Control Center">PCC</Link>
        <Link href="/account" className="pcc-control">Account</Link>
      </header>
      <div className="pcc-workspace">
        <main id="working-surface" tabIndex={-1} className="pcc-main">
          <DataStatusBanner />
          <ReviewPeriodController />
          {loaded ? children : <div role="status" aria-live="polite" className="pcc-loading"><p>Loading your space…</p><div /><div /><div /></div>}
        </main>
      </div>

      <nav className="pcc-phone-dock" aria-label="Primary navigation">
        <div className="pcc-dock-pins">
          {mobileDestinations.slice(0, 2).map(destination => <DockLink key={destination.id} destination={destination} active={isDestinationActive(pathname, destination.href)} />)}
          <Link href="/" className="pcc-dock-link theme-home-button" aria-label="Capture a thought" aria-current={pathname === "/" ? "page" : undefined}>
            <ThemeCaptureIcon theme={theme} className="h-5 w-5" /><span>Capture</span>
          </Link>
          {mobileDestinations.slice(2).map(destination => <DockLink key={destination.id} destination={destination} active={isDestinationActive(pathname, destination.href)} />)}
        </div>
        <Link href="/spaces" className="pcc-all-spaces" aria-current={spacesActive ? "page" : undefined}>All Spaces</Link>
      </nav>
    </div>
  );
}

function DockLink({ destination, active }: { destination: Destination; active: boolean }) {
  return (
    <Link href={destination.href} className={`pcc-dock-link ${active ? "theme-nav-active" : ""}`} aria-current={active ? "page" : undefined}>
      <NavigationIcon destination={destination} />
      <span>{destination.id === "rhythm" ? "Week" : destination.label}</span>
    </Link>
  );
}
