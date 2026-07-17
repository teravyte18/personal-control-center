import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { PersonalDataProvider } from "@/providers/personal-data-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Control Center",
  description: "Capture, organise, and reflect on what deserves attention.",
  applicationName: "Personal Control Center",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Control Center",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PersonalDataProvider>
          <AppShell>{children}</AppShell>
        </PersonalDataProvider>
      </body>
    </html>
  );
}
