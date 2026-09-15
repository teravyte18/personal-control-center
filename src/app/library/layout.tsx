import type { ReactNode } from "react";
import { LibrarySectionTabs } from "@/components/library-section-tabs";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LibrarySectionTabs />
      {children}
    </>
  );
}
