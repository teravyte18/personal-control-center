"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { id: "books", label: "Books", href: "/library" },
  { id: "movies", label: "Movies", href: "/library/movies" },
  { id: "series", label: "Series", href: "/library/series" },
] as const;

export function LibrarySectionTabs() {
  const pathname = usePathname();
  const active = pathname.startsWith("/library/movies")
    ? "movies"
    : pathname.startsWith("/library/series")
      ? "series"
      : "books";

  return (
    <nav aria-label="Library sections" className="pcc-library-tabs">
      <div className="grid grid-cols-3 gap-2">
        {sections.map((section) => {
          const selected = section.id === active;
          return (
            <Link
              key={section.id}
              href={section.href}
              aria-current={selected ? "page" : undefined}
              className={`pcc-control ${
                selected
                  ? "is-selected"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
