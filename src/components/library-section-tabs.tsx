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
    <nav aria-label="Library sections" className="mx-auto mb-5 max-w-6xl">
      <div className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {sections.map((section) => {
          const selected = section.id === active;
          return (
            <Link
              key={section.id}
              href={section.href}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                selected
                  ? "bg-slate-950 text-white"
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
