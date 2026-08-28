"use client";

import { useMemo, useState } from "react";
import {
  categoriesForType,
  getExpenseCategory,
  type ExpenseSettings,
  type ExpenseTransaction,
} from "@/domain/expenses";

type PeriodPreset = "month" | "3m" | "6m" | "year" | "all" | "custom";

type BreakdownRow = {
  key: string;
  label: string;
  cents: number;
  count: number;
};

const periodOptions: { value: PeriodPreset; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom months" },
];

const chartPalette = [
  "var(--theme-accent)",
  "var(--color-slate-950)",
  "var(--color-slate-700)",
  "var(--color-slate-500)",
  "var(--theme-line)",
  "var(--color-slate-400)",
  "var(--theme-accent-hover)",
  "var(--color-slate-300)",
];

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatMonth(month: string, year = true) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    ...(year ? { year: "numeric" as const } : {}),
  });
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const value = new Date(year, monthNumber - 1 + delta, 1, 12);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function endOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const value = new Date(year, monthNumber, 0, 12);
  const day = String(value.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function monthsInRange(startDate: string, endDate: string) {
  const months: string[] = [];
  let month = startDate.slice(0, 7);
  const endMonth = endDate.slice(0, 7);
  while (month <= endMonth) {
    months.push(month);
    month = shiftMonth(month, 1);
  }
  return months;
}

function rangeForPreset(
  preset: PeriodPreset,
  today: string,
  customFrom: string,
  customTo: string,
  transactions: ExpenseTransaction[],
) {
  const currentMonth = today.slice(0, 7);
  let startDate = `${currentMonth}-01`;
  let endDate = today;

  if (preset === "3m") startDate = `${shiftMonth(currentMonth, -2)}-01`;
  if (preset === "6m") startDate = `${shiftMonth(currentMonth, -5)}-01`;
  if (preset === "year") startDate = `${today.slice(0, 4)}-01-01`;
  if (preset === "all") {
    const earliest = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((minimum, transaction) => minimum && minimum < transaction.occurredOn ? minimum : transaction.occurredOn, "");
    startDate = earliest || `${currentMonth}-01`;
  }
  if (preset === "custom") {
    const from = customFrom || currentMonth;
    const to = customTo || currentMonth;
    const first = from <= to ? from : to;
    const last = from <= to ? to : from;
    startDate = `${first}-01`;
    endDate = endOfMonth(last);
    if (endDate > today) endDate = today;
  }

  return { startDate, endDate };
}

function collapseBreakdown(rows: BreakdownRow[]) {
  if (rows.length <= 8) return rows;
  const visible = rows.slice(0, 7);
  const other = rows.slice(7).reduce<BreakdownRow>((total, row) => ({
    key: "other",
    label: "Other",
    cents: total.cents + row.cents,
    count: total.count + row.count,
  }), { key: "other", label: "Other", cents: 0, count: 0 });
  return [...visible, other];
}

export function ExpenseInsights({
  transactions,
  settings,
  today,
}: {
  transactions: ExpenseTransaction[];
  settings: ExpenseSettings;
  today: string;
}) {
  const currentMonth = today.slice(0, 7);
  const [period, setPeriod] = useState<PeriodPreset>("year");
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 4)}-01`);
  const [customTo, setCustomTo] = useState(currentMonth);
  const [categoryId, setCategoryId] = useState("");

  const { startDate, endDate } = useMemo(
    () => rangeForPreset(period, today, customFrom, customTo, transactions),
    [period, today, customFrom, customTo, transactions],
  );

  const periodExpenses = useMemo(
    () => transactions.filter((transaction) => transaction.type === "expense"
      && transaction.occurredOn >= startDate
      && transaction.occurredOn <= endDate),
    [transactions, startDate, endDate],
  );

  const filteredExpenses = useMemo(
    () => categoryId
      ? periodExpenses.filter((transaction) => transaction.categoryId === categoryId)
      : periodExpenses,
    [periodExpenses, categoryId],
  );

  const breakdown = useMemo(() => {
    const rows = new Map<string, BreakdownRow>();
    for (const transaction of filteredExpenses) {
      let key = transaction.categoryId;
      let label = getExpenseCategory(transaction.categoryId)?.label ?? transaction.categoryId;
      if (categoryId) {
        const description = transaction.description.trim();
        key = description ? description.toLocaleLowerCase() : "__no-description";
        label = description || "No description";
      }
      const current = rows.get(key) ?? { key, label, cents: 0, count: 0 };
      current.cents += transaction.amountCents;
      current.count += 1;
      rows.set(key, current);
    }
    return [...rows.values()].sort((left, right) => right.cents - left.cents || left.label.localeCompare(right.label));
  }, [filteredExpenses, categoryId]);

  const monthly = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of filteredExpenses) {
      const month = transaction.occurredOn.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0) + transaction.amountCents);
    }
    return monthsInRange(startDate, endDate).map((month) => ({ month, cents: totals.get(month) ?? 0 }));
  }, [filteredExpenses, startDate, endDate]);

  const totalCents = filteredExpenses.reduce((sum, transaction) => sum + transaction.amountCents, 0);
  const monthCount = Math.max(1, monthsInRange(startDate, endDate).length);
  const averageCents = Math.round(totalCents / monthCount);
  const selectedCategory = categoryId ? getExpenseCategory(categoryId) : undefined;

  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Period</span>
            <select className="input mt-1" value={period} onChange={(event) => setPeriod(event.target.value as PeriodPreset)}>
              {periodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
            <select className="input mt-1" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">All categories</option>
              {categoriesForType("expense").map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </label>
        </div>

        {period === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">From</span>
              <input type="month" className="input mt-1" value={customFrom} max={currentMonth} onChange={(event) => setCustomFrom(event.target.value)} />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">To</span>
              <input type="month" className="input mt-1" value={customTo} max={currentMonth} onChange={(event) => setCustomTo(event.target.value)} />
            </label>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Spent" value={formatMoney(totalCents, settings.currency)} />
        <Metric label="Transactions" value={String(filteredExpenses.length)} />
        <Metric label="Avg / month" value={formatMoney(averageCents, settings.currency)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {selectedCategory ? `${selectedCategory.label} details` : "Category mix"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {formatMonth(startDate.slice(0, 7))} → {formatMonth(endDate.slice(0, 7))}
              </p>
            </div>
            {categoryId ? (
              <button type="button" onClick={() => setCategoryId("")} className="min-h-9 rounded-xl px-3 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4">
                All categories
              </button>
            ) : null}
          </div>

          {breakdown.length ? (
            <>
              <DonutChart rows={collapseBreakdown(breakdown)} totalCents={totalCents} currency={settings.currency} />
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
                {breakdown.map((row, index) => {
                  const percent = totalCents > 0 ? row.cents / totalCents * 100 : 0;
                  return (
                    <div key={row.key} className={`flex items-center justify-between gap-4 px-3 py-3 ${index ? "border-t border-slate-100" : ""}`}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.count} {row.count === 1 ? "transaction" : "transactions"} · {percent.toFixed(1)}%</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-900">{formatMoney(row.cents, settings.currency)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No expenses match these filters.
            </div>
          )}
        </section>

        <MonthlyTrend monthly={monthly} currency={settings.currency} categoryLabel={selectedCategory?.label} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
      <p className="mt-2 truncate text-base font-semibold text-slate-950 sm:text-xl">{value}</p>
    </div>
  );
}

function DonutChart({ rows, totalCents, currency }: { rows: BreakdownRow[]; totalCents: number; currency: string }) {
  let cursor = 0;
  const stops = rows.map((row, index) => {
    const start = cursor;
    cursor += totalCents > 0 ? row.cents / totalCents * 100 : 0;
    return `${chartPalette[index % chartPalette.length]} ${start}% ${cursor}%`;
  });
  const background = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="mt-5 grid items-center gap-5 sm:grid-cols-[10rem_1fr]">
      <div className="relative mx-auto h-40 w-40 rounded-full" style={{ background }} role="img" aria-label="Spending breakdown chart">
        <div className="absolute inset-8 flex items-center justify-center rounded-full bg-white text-center shadow-sm">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{formatMoney(totalCents, currency)}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartPalette[index % chartPalette.length] }} />
              <span className="truncate font-semibold text-slate-700">{row.label}</span>
            </div>
            <span className="shrink-0 text-slate-500">{totalCents ? (row.cents / totalCents * 100).toFixed(0) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyTrend({
  monthly,
  currency,
  categoryLabel,
}: {
  monthly: { month: string; cents: number }[];
  currency: string;
  categoryLabel?: string;
}) {
  const visible = monthly.length > 12 ? monthly.slice(-12) : monthly;
  const maximum = Math.max(1, ...visible.map((entry) => entry.cents));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Monthly trend</h3>
          <p className="mt-1 text-xs text-slate-500">{categoryLabel ? `${categoryLabel} spending` : "All expense categories"}</p>
        </div>
        {monthly.length > 12 ? <span className="text-xs text-slate-500">Latest 12 months</span> : null}
      </div>
      <div className="mt-5 space-y-3">
        {visible.map((entry) => (
          <div key={entry.month} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">{formatMonth(entry.month, false)}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-950" style={{ width: `${entry.cents / maximum * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-700">{formatMoney(entry.cents, currency)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
