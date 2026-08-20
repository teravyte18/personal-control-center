import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateExpenseMonth,
  defaultExpenseSettings,
  nextExpenseDate,
  normalizeExpenseTransaction,
  parseAmountToCents,
  type ExpenseTransaction,
} from "../src/domain/expenses.ts";
import {
  applyPersonalDataMutation,
  hasPersonalData,
  normalizePersonalDataMutation,
  normalizePersonalDataSnapshot,
} from "../src/domain/personal-data-snapshot.ts";

function transaction(overrides: Partial<ExpenseTransaction> = {}): ExpenseTransaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    type: overrides.type ?? "expense",
    amountCents: overrides.amountCents ?? 1000,
    categoryId: overrides.categoryId ?? "groceries",
    description: overrides.description ?? "",
    occurredOn: overrides.occurredOn ?? "2026-08-20",
    createdAt: overrides.createdAt ?? "2026-08-20T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-20T12:00:00.000Z",
  };
}

test("amount parsing accepts normal decimal input and rejects ambiguous values", () => {
  assert.equal(parseAmountToCents("12.50"), 1250);
  assert.equal(parseAmountToCents("12,5"), 1250);
  assert.equal(parseAmountToCents("0"), null);
  assert.equal(parseAmountToCents("12.345"), null);
  assert.equal(parseAmountToCents("abc"), null);
});

test("transactions require a category matching their type", () => {
  assert.ok(normalizeExpenseTransaction(transaction()));
  assert.equal(normalizeExpenseTransaction(transaction({ type: "income", categoryId: "groceries" })), null);
  assert.ok(normalizeExpenseTransaction(transaction({ type: "income", categoryId: "paycheck" })));
});

test("monthly summary keeps Future You separate from ordinary spending", () => {
  const transactions = [
    transaction({ id: "income", type: "income", categoryId: "paycheck", amountCents: 200_000 }),
    transaction({ id: "groceries", amountCents: 50_000, categoryId: "groceries" }),
    transaction({ id: "fun", amountCents: 20_000, categoryId: "games" }),
    transaction({ id: "future", amountCents: 40_000, categoryId: "investments" }),
  ];

  const summary = calculateExpenseMonth(transactions, defaultExpenseSettings, "2026-08");
  assert.equal(summary.incomeCents, 200_000);
  assert.equal(summary.spendingCents, 70_000);
  assert.equal(summary.futureCents, 40_000);
  assert.equal(summary.totalOutflowCents, 110_000);
  assert.equal(summary.remainingCents, 90_000);
  assert.equal(summary.buckets.essentials.targetCents, 100_000);
  assert.equal(summary.buckets.fun.targetCents, 60_000);
  assert.equal(summary.buckets.future.targetCents, 40_000);
});

test("weekly reconciliation overlaps an older boundary date to avoid same-day blind spots", () => {
  const duringCheck = new Date(2026, 7, 20, 18, 0, 0);
  const nextDay = new Date(2026, 7, 21, 9, 0, 0);

  assert.equal(nextExpenseDate("2026-08-20", duringCheck), "2026-08-21");
  assert.equal(nextExpenseDate("2026-08-20", nextDay), "2026-08-20");
});

test("older snapshots gain empty expense state and default targets", () => {
  const snapshot = normalizePersonalDataSnapshot({ items: [], draft: {}, history: [] });
  assert.deepEqual(snapshot.expenseTransactions, []);
  assert.deepEqual(snapshot.expenseSettings.targets, { essentials: 50, fun: 30, future: 20 });
  assert.equal(snapshot.expenseReconciliation.reconciledThrough, "");
  assert.equal(hasPersonalData(snapshot), false);
});

test("expense history and finance preferences make a snapshot non-empty", () => {
  const withTransaction = normalizePersonalDataSnapshot({
    expenseTransactions: [transaction({ id: "expense-only" })],
  });
  assert.equal(hasPersonalData(withTransaction), true);

  const withTargets = normalizePersonalDataSnapshot({
    expenseSettings: { currency: "EUR", targets: { essentials: 45, fun: 30, future: 25 } },
  });
  assert.equal(hasPersonalData(withTargets), true);

  const withReconciliation = normalizePersonalDataSnapshot({
    expenseReconciliation: { reconciledThrough: "2026-08-20" },
  });
  assert.equal(hasPersonalData(withReconciliation), true);
});

test("expense mutations add, update, reconcile, and delete transactions", () => {
  const original = normalizePersonalDataSnapshot({});
  const added = transaction({ id: "tx-1", amountCents: 450, categoryId: "going-out", description: "Drink" });

  const addMutation = normalizePersonalDataMutation({ type: "add-expense-transaction", transaction: added });
  assert.ok(addMutation);
  const withTransaction = applyPersonalDataMutation(original, addMutation);
  assert.equal(withTransaction.expenseTransactions.length, 1);

  const updateMutation = normalizePersonalDataMutation({
    type: "update-expense-transaction",
    id: "tx-1",
    occurredAt: "2026-08-20T13:00:00.000Z",
    updates: {
      type: "expense",
      amountCents: 500,
      categoryId: "going-out",
      description: "Beer",
      occurredOn: "2026-08-19",
    },
  });
  assert.ok(updateMutation);
  const updated = applyPersonalDataMutation(withTransaction, updateMutation);
  assert.equal(updated.expenseTransactions[0].amountCents, 500);
  assert.equal(updated.expenseTransactions[0].description, "Beer");
  assert.equal(updated.expenseTransactions[0].occurredOn, "2026-08-19");

  const reconcileMutation = normalizePersonalDataMutation({ type: "set-expense-reconciled-through", date: "2026-08-20" });
  assert.ok(reconcileMutation);
  const reconciled = applyPersonalDataMutation(updated, reconcileMutation);
  assert.equal(reconciled.expenseReconciliation.reconciledThrough, "2026-08-20");

  const deleteMutation = normalizePersonalDataMutation({ type: "delete-expense-transaction", id: "tx-1" });
  assert.ok(deleteMutation);
  const deleted = applyPersonalDataMutation(reconciled, deleteMutation);
  assert.equal(deleted.expenseTransactions.length, 0);
});

test("budget target mutations must sum to one hundred percent", () => {
  assert.equal(normalizePersonalDataMutation({
    type: "update-expense-settings",
    settings: { currency: "EUR", targets: { essentials: 50, fun: 40, future: 20 } },
  }), null);

  assert.ok(normalizePersonalDataMutation({
    type: "update-expense-settings",
    settings: { currency: "EUR", targets: { essentials: 45, fun: 30, future: 25 } },
  }));
});
