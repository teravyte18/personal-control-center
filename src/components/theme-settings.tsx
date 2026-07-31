"use client";

import { ThemeCaptureIcon } from "@/components/theme-capture-icon";
import { themes } from "@/lib/theme";
import { useThemePreference } from "@/lib/theme-preferences";

export function ThemeSettings() {
  const { theme, setTheme } = useThemePreference();

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-sm font-semibold">Theme</h3>
        <p className="mt-1 text-sm text-slate-500">Stored on this device.</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {themes.map((candidate) => {
          const selected = candidate.id === theme;
          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setTheme(candidate.id)}
              aria-pressed={selected}
              className={`min-h-28 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                selected
                  ? "border-slate-950 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full border shadow-sm"
                  style={{
                    backgroundColor: candidate.iconBackground,
                    borderColor: candidate.iconBorder,
                  }}
                >
                  <ThemeCaptureIcon theme={candidate.id} className="h-7 w-7" />
                </span>
                <span className={`text-lg ${selected ? "text-slate-950" : "text-transparent"}`} aria-hidden="true">✓</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-5 text-slate-900">{candidate.label}</p>
              <span className="mt-2 flex gap-1.5" aria-hidden="true">
                {candidate.preview.map((color) => (
                  <span key={color} className="h-2.5 flex-1 rounded-full border border-black/5" style={{ backgroundColor: color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
