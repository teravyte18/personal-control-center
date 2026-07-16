"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Status = "inbox" | "active" | "waiting" | "incubating" | "completed";
type Item = { id: string; title: string; status: Status; createdAt: string; completedAt?: string };
type Review = {
  location: string;
  happened: string;
  wentWell: string;
  difficult: string;
  learned: string;
  nextWeek: string;
};

const ITEMS_KEY = "pcc-items-v1";
const REVIEW_KEY = "pcc-review-v1";
const starterItems: Item[] = [
  { id: "thesis", title: "Define the next concrete thesis milestone", status: "active", createdAt: new Date().toISOString() },
  { id: "licence", title: "Choose the next driving licence action", status: "inbox", createdAt: new Date().toISOString() },
];
const emptyReview: Review = { location: "", happened: "", wentWell: "", difficult: "", learned: "", nextWeek: "" };

export default function Home() {
  const [items, setItems] = useState<Item[]>(starterItems);
  const [capture, setCapture] = useState("");
  const [review, setReview] = useState<Review>(emptyReview);
  const [photoName, setPhotoName] = useState("");
  const [view, setView] = useState<"now" | "review">("now");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(ITEMS_KEY);
      const storedReview = localStorage.getItem(REVIEW_KEY);
      if (storedItems) setItems(JSON.parse(storedItems) as Item[]);
      if (storedReview) setReview(JSON.parse(storedReview) as Review);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(REVIEW_KEY, JSON.stringify(review));
  }, [items, review, loaded]);

  const openItems = useMemo(() => items.filter((item) => item.status !== "completed"), [items]);
  const closedThisWeek = useMemo(() => items.filter(isCompletedThisWeek), [items]);
  const inbox = items.filter((item) => item.status === "inbox");

  function submitCapture(event: FormEvent) {
    event.preventDefault();
    const title = capture.trim();
    if (!title) return;
    setItems((current) => [{ id: crypto.randomUUID(), title, status: "inbox", createdAt: new Date().toISOString() }, ...current]);
    setCapture("");
  }

  function toggleCompleted(id: string) {
    setItems((current) => current.map((item) => item.id === id
      ? item.status === "completed"
        ? { ...item, status: "active", completedAt: undefined }
        : { ...item, status: "completed", completedAt: new Date().toISOString() }
      : item));
  }

  function updateReview(field: keyof Review, value: string) {
    setReview((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Personal Control Center</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Capture what is open. Review what happened.</h1>
        </div>
        <nav className="flex rounded-xl bg-slate-200 p-1">
          {(["now", "review"] as const).map((option) => (
            <button key={option} onClick={() => setView(option)} className={`rounded-lg px-4 py-2.5 text-sm font-medium ${view === option ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>
              {option === "now" ? "Now" : "Weekly review"}
            </button>
          ))}
        </nav>
      </header>

      {view === "now" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-sm font-medium text-slate-500">Quick capture</p>
              <form onSubmit={submitCapture} className="mt-3 flex min-w-0 gap-2">
                <input value={capture} onChange={(event) => setCapture(event.target.value)} className="input min-w-0 flex-1" placeholder="What is on your mind?" aria-label="Quick capture" />
                <button className="shrink-0 rounded-xl bg-slate-950 px-4 py-2 font-medium text-white">Save</button>
              </form>
              <p className="mt-2 text-xs text-slate-500">Only the thought is required. Organise it later.</p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Open items</h2>
                <span className="text-sm text-slate-500">{openItems.length}</span>
              </div>
              <ItemList items={openItems} onToggle={toggleCompleted} />
            </div>
          </section>

          <aside className="space-y-6">
            <Summary label="Inbox" value={inbox.length} />
            <Summary label="Closed this week" value={closedThisWeek.length} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Saturday ritual</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Review the system’s memory first, then write about the few things that actually mattered.</p>
              <button onClick={() => setView("review")} className="mt-2 flex min-h-11 items-center text-sm font-semibold text-slate-950 underline underline-offset-4">Open weekly review</button>
            </div>
          </aside>
        </div>
      ) : (
        <section className="mt-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusPanel title={`Still open (${openItems.length})`} items={openItems} />
            <StatusPanel title={`Closed this week (${closedThisWeek.length})`} items={closedThisWeek} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Where are you doing this review?">
                <input className="input" value={review.location} onChange={(event) => updateReview("location", event.target.value)} placeholder="Café, park, library, home…" />
              </Field>
              <Field label="Photo of the place">
                <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-600">
                  <span>{photoName || "Choose a photo"}</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(event: ChangeEvent<HTMLInputElement>) => setPhotoName(event.target.files?.[0]?.name ?? "")} />
                </label>
              </Field>
            </div>
            <div className="mt-7 grid gap-6">
              <Prompt label="What happened this week?" value={review.happened} onChange={(value) => updateReview("happened", value)} />
              <div className="grid gap-6 md:grid-cols-2">
                <Prompt label="What went well?" value={review.wentWell} onChange={(value) => updateReview("wentWell", value)} />
                <Prompt label="What felt difficult?" value={review.difficult} onChange={(value) => updateReview("difficult", value)} />
              </div>
              <Prompt label="What did you learn or notice?" value={review.learned} onChange={(value) => updateReview("learned", value)} />
              <Prompt label="What deserves attention next week?" value={review.nextWeek} onChange={(value) => updateReview("nextWeek", value)} />
            </div>
            <p className="mt-4 text-xs text-slate-500">Draft text and items are currently saved in this browser.</p>
          </div>
        </section>
      )}
    </main>
  );
}

function isCompletedThisWeek(item: Item) {
  if (!item.completedAt) return false;
  const now = new Date();
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return new Date(item.completedAt) >= start;
}

function ItemList({ items, onToggle }: { items: Item[]; onToggle: (id: string) => void }) {
  if (!items.length) return <p className="mt-4 text-sm text-slate-500">Nothing here yet.</p>;
  return <ul className="mt-4 divide-y divide-slate-100">{items.map((item) => (
    <li key={item.id} className="flex items-start py-3">
      <button onClick={() => onToggle(item.id)} className="-ml-3 flex h-11 w-11 shrink-0 items-start justify-center pt-0.5" aria-label={`Complete ${item.title}`}>
        <span className="h-5 w-5 rounded-full border border-slate-400" aria-hidden="true" />
      </button>
      <div><p className="text-sm font-medium text-slate-800">{item.title}</p><p className="mt-1 text-xs capitalize text-slate-500">{item.status}</p></div>
    </li>
  ))}</ul>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p></div>;
}

function StatusPanel({ title, items }: { title: string; items: Item[] }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-950">{title}</h2>{items.length ? <ul className="mt-4 space-y-2">{items.slice(0, 10).map((item) => <li key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.title}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">Nothing to show.</p>}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>{children}</label>;
}

function Prompt({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-800">{label}</span><textarea className="input resize-y" rows={5} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
