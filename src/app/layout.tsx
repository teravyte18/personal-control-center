import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Control Center",
  description: "Capture, reflect, and decide what deserves attention.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
