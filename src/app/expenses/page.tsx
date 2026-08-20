"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  calculateExpenseMonth,
  categoriesForType,
  expenseBucketIds,
  expenseBucketLabels,
  getExpenseCategory,
  nextExpenseDate,
  parseAmountToCents,
  transactionsForMonth,
  type ExpenseBucketId,
  type ExpenseSettings,
  type ExpenseTransaction,
  type ExpenseTransactionType,
  type ExpenseTransactionUpdates,
} from "@/domain/expenses";
import { useExpenses } from "@/hooks/use-expenses";

function localDateOnly(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(date: string, delta: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + delta);
  return localDateOnly(value);
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const value = new Date(year, monthNumber - 1 + delta, 1, 12);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function daysBetweenInclusive(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00.000Z`).getTime();
  const endDate = new Date(`${end}T00:00:00.000Z`).getTime();
  if (endDate < startDate) return 0;
  return Math.floor((endDate - startDate) / 86_400_000) + 1;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export default function ExpensesPage() {
  const {
    transactions,
    settings,
    reconciliation,
    loaded,
    saving,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateSettings,
    setReconciledThrough,
  } = useExpenses();
  const today = localDateOnly();
  const [view, setView] = useState<"month" | "check">("month");
  const [month, setMonth] = useState(today.slice(0, 7));

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {saving ? "Saving…" : reconciliation.reconciledThrough
              ? `Checked through ${formatDate(reconciliation.reconciledThrough)}`
              : "No weekly check yet"}
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Expenses</h2>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <QuickEntry onAdd={addTransaction} disabled={!loaded} today={today} />

      <div className="mt-5 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView("month")}
          className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${view === "month" ? "bg-slate-950 text-white" : "text-slate-500"}`}
        >
          Month
        </button>
        <button
          type="button"
          onClick={() => setView("check")}
          className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${view === "check" ? "bg-slate-950 text-white" : "text-slate-500"}`}
        >
          Weekly check
        </button>
      </div>

      {!loaded ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading expenses…</div>
      ) : view === "month" ? (
        <MonthView
          month={month}
          onMonthChange={setMonth}
          transactions={transactions}
          settings={settings}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
          onUpdateSettings={updateSettings}
        />
      ) : (
        <WeeklyCheck
          transactions={transactions}
          settings={settings}
          reconciledThrough={reconciliation.reconciledThrough}
          today={today}
          onUpdateTransaction={updateTransaction}
          onDeleteTransaction={deleteTransaction}
          onSetReconciledThrough={setReconciledThrough}
        />
      )}
    </section>
  );
}

function QuickEntry({
  onAdd,
  disabled,
  today,
}: {
  onAdd: (input: {
    type: ExpenseTransactionType;
    amountCents: number;
    categoryId: string;
    description: string;
    occurredOn: string;
  }) => ExpenseTransaction | null;
  disabled: boolean;
  today: string;
}) {
  const [type, setType] = useState<ExpenseTransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(categoriesForType("expense")[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [formError, setFormError] = useState("");

  function changeType(nextType: ExpenseTransactionType) {
    setType(nextType);
    setCategoryId(categoriesForType(nextType)[0]?.id ?? "");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const amountCents = parseAmountToCents(amount);
    if (!amountCents) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (!categoryId) {
      setFormError("Choose a category.");
      return;
    }
    if (!occurredOn) {
      setFormError("Choose a transaction date.");
      return;
    }
    const transaction = onAdd({ type, amountCents, categoryId, description, occurredOn });
    if (!transaction) {
      setFormError("This transaction could not be added.");
      return;
    }
    setAmount("");
    setDescription("");
    setFormError("");
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(["expense", "income"] as const).map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => changeType(candidate)}
            className={`min-h-10 rounded-lg text-sm font-semibold capitalize ${type === candidate ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
          >
            {candidate}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
          <div className="mt-1 flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-slate-950">
            <span className="mr-2 text-slate-400">€</span>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xl font-semibold outline-none"
              aria-label="Amount"
            />
          </div>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
          <select className="input mt-1" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {type === "expense" ? expenseBucketIds.map((bucket) => (
              <optgroup key={bucket} label={expenseBucketLabels[bucket]}>
                {categoriesForType("expense").filter((category) => category.bucket === bucket).map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </optgroup>
            )) : categoriesForType("income").map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description <span className="font-normal normal-case">optional</span></span>
          <input
            className="input mt-1"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={type === "expense" ? "What was it?" : "Income note"}
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
          <div className="mt-1 flex min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2">
            <input
              type="date"
              value={occurredOn}
              max={today}
              onChange={(event) => setOccurredOn(event.target.value)}
              className="block w-full min-w-0 border-0 bg-transparent p-0 text-base outline-none"
            />
          </div>
        </label>
      </div>

      {formError ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
      ) : null}
      <button
        type="submit"
        disabled={disabled}
        className="mt-4 min-h-12 w-full rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add {type}
      </button>
    </form>
  );
}

function MonthView({
  month,
  onMonthChange,
  transactions,
  settings,
  onUpdateTransaction,
  onDeleteTransaction,
  onUpdateSettings,
}: {
  month: string;
  onMonthChange: (month: string) => void;
  transactions: ExpenseTransaction[];
  settings: ExpenseSettings;
  onUpdateTransaction: (id: string, updates: ExpenseTransactionUpdates) => boolean;
  onDeleteTransaction: (id: string) => void;
  onUpdateSettings: (settings: ExpenseSettings) => boolean;
}) {
  const monthTransactions = useMemo(() => transactionsForMonth(transactions, month), [transactions, month]);
  const summary = useMemo(() => calculateExpenseMonth(transactions, settings, month), [transactions, settings, month]);
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const transaction of monthTransactions) {
      if (transaction.type !== "expense") continue;
      totals.set(transaction.categoryId, (totals.get(transaction.categoryId) ?? 0) + transaction.amountCents);
    }
    return [...totals.entries()].sort((left, right) => right[1] - left[1]);
  }, [monthTransactions]);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-lg" aria-label="Previous month">‹</button>
        <h3 className="text-lg font-semibold">{formatMonth(month)}</h3>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} className="min-h-11 min-w-11 rounded-xl border border-slate-200 bg-white text-lg" aria-label="Next month">›</button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Income" value={formatMoney(summary.incomeCents, settings.currency)} />
        <Metric label="Spent" value={formatMoney(summary.spendingCents, settings.currency)} />
        <Metric label="Future You" value={formatMoney(summary.futureCents, settings.currency)} />
        <Metric label="Remaining" value={formatMoney(summary.remainingCents, settings.currency)} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {expenseBucketIds.map((bucket) => (
          <BucketProgress
            key={bucket}
            bucket={bucket}
            actualCents={summary.buckets[bucket].actualCents}
            targetCents={summary.buckets[bucket].targetCents}
            remainingCents={summary.buckets[bucket].remainingCents}
            targetPercent={settings.targets[bucket]}
            currency={settings.currency}
          />
        ))}
      </div>

      <BudgetTargets settings={settings} onSave={onUpdateSettings} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Categories</h3>
            <span className="text-xs text-slate-500">{categoryTotals.length} used</span>
          </div>
          {categoryTotals.length ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {categoryTotals.map(([categoryId, cents], index) => {
                const category = getExpenseCategory(categoryId);
                return (
                  <div key={categoryId} className={`flex items-center justify-between gap-4 px-4 py-3 ${index ? "border-t border-slate-100" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{category?.label ?? categoryId}</p>
                      {category?.bucket ? <p className="text-xs text-slate-500">{expenseBucketLabels[category.bucket]}</p> : null}
                    </div>
                    <span className="text-sm font-semibold">{formatMoney(cents, settings.currency)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No expenses in this month.</div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Transactions</h3>
            <span className="text-xs text-slate-500">{monthTransactions.length}</span>
          </div>
          <TransactionList
            transactions={monthTransactions}
            settings={settings}
            onUpdate={onUpdateTransaction}
            onDelete={onDeleteTransaction}
          />
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function BucketProgress({
  bucket,
  actualCents,
  targetCents,
  remainingCents,
  targetPercent,
  currency,
}: {
  bucket: ExpenseBucketId;
  actualCents: number;
  targetCents: number;
  remainingCents: number;
  targetPercent: number;
  currency: string;
}) {
  const progress = targetCents > 0
    ? Math.min(100, Math.round(actualCents / targetCents * 100))
    : actualCents > 0 ? 100 : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{expenseBucketLabels[bucket]}</p>
          <p className="mt-1 text-xs text-slate-500">{targetPercent}% target</p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {remainingCents >= 0 ? `${formatMoney(remainingCents, currency)} left` : `${formatMoney(Math.abs(remainingCents), currency)} over`}
        </span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${remainingCents < 0 ? "bg-red-600" : "bg-slate-950"}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{formatMoney(actualCents, currency)}</span>
        <span>{formatMoney(targetCents, currency)}</span>
      </div>
    </div>
  );
}

function BudgetTargets({ settings, onSave }: { settings: ExpenseSettings; onSave: (settings: ExpenseSettings) => boolean }) {
  const [targets, setTargets] = useState(settings.targets);
  const [open, setOpen] = useState(false);

  useEffect(() => setTargets(settings.targets), [settings]);
  const total = expenseBucketIds.reduce((sum, bucket) => sum + targets[bucket], 0);
  const targetsValid = Math.abs(total - 100) < 0.001;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-h-12 w-full items-center justify-between gap-4 px-4 text-left text-sm font-semibold" aria-expanded={open}>
        <span>Budget targets · {settings.targets.essentials}/{settings.targets.fun}/{settings.targets.future}</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="border-t border-slate-100 p-4">
          <div className="grid grid-cols-3 gap-3">
            {expenseBucketIds.map((bucket) => (
              <label key={bucket}>
                <span className="text-xs font-semibold text-slate-500">{expenseBucketLabels[bucket]}</span>
                <div className="mt-1 flex min-h-11 items-center rounded-xl border border-slate-300 px-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={targets[bucket]}
                    onChange={(event) => setTargets((current) => ({ ...current, [bucket]: Number(event.target.value) }))}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none"
                  />
                  <span className="text-sm text-slate-400">%</span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={targetsValid ? "text-xs text-slate-500" : "rounded-lg bg-red-50 px-2 py-1 text-xs text-red-800"}>Total: {total}%</span>
            <button
              type="button"
              disabled={!targetsValid}
              onClick={() => onSave({ ...settings, targets })}
              className="min-h-10 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white disabled:opacity-30"
            >
              Save targets
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WeeklyCheck({
  transactions,
  settings,
  reconciledThrough,
  today,
  onUpdateTransaction,
  onDeleteTransaction,
  onSetReconciledThrough,
}: {
  transactions: ExpenseTransaction[];
  settings: ExpenseSettings;
  reconciledThrough: string;
  today: string;
  onUpdateTransaction: (id: string, updates: ExpenseTransactionUpdates) => boolean;
  onDeleteTransaction: (id: string) => void;
  onSetReconciledThrough: (date: string) => boolean;
}) {
  const initialStart = shiftLocalDate(today, -6);
  const start = reconciledThrough ? nextExpenseDate(reconciledThrough) : initialStart;
  const uncheckedDays = daysBetweenInclusive(start, today);
  const uncheckedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.occurredOn >= start && transaction.occurredOn <= today),
    [transactions, start, today],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, ExpenseTransaction[]>();
    for (const transaction of uncheckedTransactions) {
      const list = grouped.get(transaction.occurredOn) ?? [];
      list.push(transaction);
      grouped.set(transaction.occurredOn, list);
    }
    return [...grouped.entries()].sort((left, right) => right[0].localeCompare(left[0]));
  }, [uncheckedTransactions]);

  if (!uncheckedDays) {
    return (
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold">Expenses are checked through today.</p>
        <p className="mt-2 text-sm text-slate-500">The next check starts with tomorrow’s transactions.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{uncheckedDays} {uncheckedDays === 1 ? "day" : "days"} unchecked</p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(start)} → {formatDate(today)}</p>
          </div>
          <button
            type="button"
            onClick={() => onSetReconciledThrough(today)}
            className="min-h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white"
          >
            Checked through today
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Compare this period against your bank activity. Add anything missing above, then mark the period checked.
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-700">PCC entries in this period</h3>
        <span className="text-xs text-slate-500">{uncheckedTransactions.length}</span>
      </div>

      {groups.length ? (
        <div className="mt-3 space-y-4">
          {groups.map(([date, dateTransactions]) => (
            <section key={date}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{formatDate(date)}</p>
              <TransactionList
                transactions={dateTransactions}
                settings={settings}
                showDate={false}
                onUpdate={onUpdateTransaction}
                onDelete={onDeleteTransaction}
              />
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No PCC entries in this unchecked period yet.
        </div>
      )}
    </div>
  );
}

function TransactionList({
  transactions,
  settings,
  showDate = true,
  onUpdate,
  onDelete,
}: {
  transactions: ExpenseTransaction[];
  settings: ExpenseSettings;
  showDate?: boolean;
  onUpdate: (id: string, updates: ExpenseTransactionUpdates) => boolean;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!transactions.length) {
    return <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">No transactions here.</div>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {transactions.map((transaction, index) => editingId === transaction.id ? (
        <TransactionEditor
          key={transaction.id}
          transaction={transaction}
          onCancel={() => setEditingId(null)}
          onSave={(updates) => {
            const saved = onUpdate(transaction.id, updates);
            if (saved) setEditingId(null);
            return saved;
          }}
          onDelete={() => {
            if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
            onDelete(transaction.id);
            setEditingId(null);
          }}
          className={index ? "border-t border-slate-100" : ""}
        />
      ) : (
        <button
          key={transaction.id}
          type="button"
          onClick={() => setEditingId(transaction.id)}
          className={`flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left active:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{transaction.description || getExpenseCategory(transaction.categoryId)?.label || "Transaction"}</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {getExpenseCategory(transaction.categoryId)?.label}
              {showDate ? ` · ${formatDate(transaction.occurredOn)}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-950">
            {transaction.type === "income" ? "+" : "−"}{formatMoney(transaction.amountCents, settings.currency)}
          </span>
        </button>
      ))}
    </div>
  );
}

function TransactionEditor({
  transaction,
  onCancel,
  onSave,
  onDelete,
  className = "",
}: {
  transaction: ExpenseTransaction;
  onCancel: () => void;
  onSave: (updates: ExpenseTransactionUpdates) => boolean;
  onDelete: () => void;
  className?: string;
}) {
  const [type, setType] = useState(transaction.type);
  const [amount, setAmount] = useState((transaction.amountCents / 100).toFixed(2));
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [description, setDescription] = useState(transaction.description);
  const [occurredOn, setOccurredOn] = useState(transaction.occurredOn);
  const [formError, setFormError] = useState("");
  const today = localDateOnly();

  function changeType(nextType: ExpenseTransactionType) {
    setType(nextType);
    setCategoryId(categoriesForType(nextType)[0]?.id ?? "");
  }

  function save() {
    const amountCents = parseAmountToCents(amount);
    if (!amountCents || !categoryId || !occurredOn) {
      setFormError("Enter a valid amount, category, and date.");
      return;
    }
    const saved = onSave({ type, amountCents, categoryId, description, occurredOn });
    if (!saved) {
      setFormError("This transaction could not be saved.");
      return;
    }
    setFormError("");
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(["expense", "income"] as const).map((candidate) => (
          <button key={candidate} type="button" onClick={() => changeType(candidate)} className={`min-h-9 rounded-lg text-xs font-semibold capitalize ${type === candidate ? "bg-white shadow-sm" : "text-slate-500"}`}>{candidate}</button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input className="input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Transaction amount" />
        <select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-label="Transaction category">
          {categoriesForType(type).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
        <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" aria-label="Transaction description" />
        <div className="flex min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2">
          <input type="date" value={occurredOn} max={today} onChange={(event) => setOccurredOn(event.target.value)} className="block w-full min-w-0 border-0 bg-transparent p-0 text-base outline-none" aria-label="Transaction date" />
        </div>
      </div>
      {formError ? (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{formError}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} className="min-h-10 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white">Save</button>
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-slate-300 px-4 text-xs font-semibold text-slate-600">Cancel</button>
        <button type="button" onClick={onDelete} className="ml-auto min-h-10 rounded-xl bg-red-50 px-3 text-xs font-semibold text-red-800">Delete</button>
      </div>
    </div>
  );
}
