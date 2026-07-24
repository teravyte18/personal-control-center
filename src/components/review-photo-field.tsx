"use client";

import Image from "next/image";
import { useState, type ChangeEvent } from "react";

const PHOTO_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DEVELOPMENT = process.env.NEXT_PUBLIC_PCC_LOCAL_DEV_MODE === "1";

export function ReviewPhotoField({ photoName, onChange }: { photoName: string; onChange: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const durable = PHOTO_ID.test(photoName);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || LOCAL_DEVELOPMENT) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("photo", file);
      const response = await fetch("/api/review-photos", { method: "POST", body: form });
      const body = await response.json() as { photo?: { id?: string }; error?: string };
      const nextId = body.photo?.id;
      if (!response.ok || !nextId || !PHOTO_ID.test(nextId)) throw new Error(body.error || "The photo could not be uploaded.");
      const previous = durable ? photoName : "";
      onChange(nextId);
      if (previous && previous !== nextId) void fetch(`/api/review-photos/${previous}`, { method: "DELETE" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The photo could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!durable || LOCAL_DEVELOPMENT) {
      onChange("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/review-photos/${photoName}`, { method: "DELETE" });
      if (!response.ok) throw new Error("The photo could not be removed.");
      onChange("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The photo could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  if (LOCAL_DEVELOPMENT) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">Photo persistence is skipped in browser-only development mode. Test it again after deployment.</div>;
  }

  return (
    <div>
      {durable ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <Image src={`/api/review-photos/${photoName}`} alt="Current weekly review location" width={960} height={640} unoptimized className="max-h-72 w-full object-cover" />
          <div className="flex items-center justify-between gap-3 p-3">
            <PhotoPicker busy={busy} label={busy ? "Uploading…" : "Replace"} onChange={choose} />
            <button type="button" onClick={() => void remove()} disabled={busy} className="text-sm font-semibold text-rose-700 disabled:opacity-50">Remove</button>
          </div>
        </div>
      ) : (
        <div>
          <PhotoPicker busy={busy} label={busy ? "Uploading photo…" : "Choose a photo"} onChange={choose} boxed />
          {photoName ? <p className="mt-2 text-xs text-amber-700">An older filename was recorded without an image. Choose a photo to replace it.</p> : null}
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
      <p className="mt-2 text-xs text-slate-500">JPEG, PNG, WebP, or GIF. Maximum 15 MB.</p>
    </div>
  );
}

function PhotoPicker({ busy, label, onChange, boxed = false }: { busy: boolean; label: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; boxed?: boolean }) {
  return (
    <label className={`cursor-pointer text-sm font-semibold text-slate-700 ${boxed ? "flex min-h-12 items-center justify-between rounded-xl border border-dashed border-slate-300 px-4 font-normal text-slate-600" : ""} ${busy ? "pointer-events-none opacity-60" : ""}`}>
      <span className="truncate">{label}</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" className="sr-only" disabled={busy} onChange={onChange} />
    </label>
  );
}
