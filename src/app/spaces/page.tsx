import Link from "next/link";
import { Icon } from "@/components/icon";
import { destinations } from "@/lib/navigation";

export default function SpacesPage() {
  const available = destinations.filter((destination) => destination.available);
  const future = destinations.filter((destination) => !destination.available);

  return (
    <section className="mx-auto max-w-4xl">
      <div className="max-w-2xl">
        <p className="text-sm text-slate-500">All spaces</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight">Everything has a place without crowding the dock.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">The four pinned destinations stay focused. Future modules can be added here and pinned later.</p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <Link href="/account" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 font-semibold text-white">A</span>
            <div><p className="font-semibold">Account & access</p><p className="mt-1 text-sm leading-5 text-slate-500">Sign out, export your data, and manage invited accounts.</p></div>
          </div>
        </Link>

        {available.map((destination) => (
          <Link key={destination.id} href={destination.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon name={destination.icon} /></span>
              <div><p className="font-semibold">{destination.label}</p><p className="mt-1 text-sm leading-5 text-slate-500">{destination.description}</p></div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Later spaces</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {future.map((destination) => (
            <div key={destination.id} className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50"><Icon name={destination.icon} /></span>
                <div><p className="font-semibold text-slate-500">{destination.label}</p><p className="mt-1 text-sm leading-5">{destination.description}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
