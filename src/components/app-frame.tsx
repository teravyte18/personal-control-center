"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SessionGuard } from "@/components/session-guard";
import { PersonalDataProvider } from "@/providers/personal-data-provider";

const PUBLIC_AUTH_PATHS = new Set(["/login", "/activate"]);

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_AUTH_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <SessionGuard>
      <PersonalDataProvider>
        <AppShell>{children}</AppShell>
      </PersonalDataProvider>
    </SessionGuard>
  );
}
