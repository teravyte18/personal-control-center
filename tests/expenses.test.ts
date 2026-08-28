import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateExpenseMonth,
  calculateFunFund,
  defaultExpenseSettings,
  expenseAllocationTargets,
  funFundStartDate,
  nextExpenseDate,
  normalizeExpenseReconciliation,
  normalizeExpenseSettings,
  normalizeExpenseTransaction,
  normalizeExpenseTransactionUpdates,
  parseAmountToCents,
  type ExpenseTransaction,
} from "../src/domain/expenses.ts";

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

test("transaction updates validate amount, category, and date", () => {
  assert.ok(normalizeExpenseTransactionUpdates({
    type: "expense",
    amountCents: 450,
    categoryId: "going-out",
    description: "Beer",
    occurredOn: "2026-08-19",
  }));
  assert.equal(normalizeExpenseTransactionUpdates({
    type: "income",
    amountCents: 450,
    categoryId: "going-out",
    description: "Wrong type",
    occurredOn: "2026-08-19",
  }), null);
});

test("monthly allocation uses outflows for actual shares and income for absolute targets", () => {
  const transactions = [
    transaction({ id: "income", type: "income", categoryId: "paycheck", amountCents: 20_000 }),
    transaction({ id: "groceries", amountCents: 50_000, categoryId: "groceries" }),
    transaction({ id: "fun", amountCents: 20_000, categoryId: "games" }),
    transaction({ id: "future", amountCents: 40_000, categoryId: "investments" }),
  ];

  const summary = calculateExpenseMonth(transactions, "2026-08");
  assert.equal(summary.incomeCents, 20_000);
  assert.equal(summary.spendingCents, 70_000);
  assert.equal(summary.futureCents, 40_000);
  assert.equal(summary.totalOutflowCents, 110_000);
  assert.equal(summary.remainingCents, -90_000);
  assert.equal(summary.buckets.essentials.targetCents, 10_000);
  assert.equal(summary.buckets.fun.targetCents, 6_000);
  assert.equal(summary.buckets.future.targetCents, 4_000);
  assert.ok(Math.abs(summary.buckets.essentials.actualPercent - 45.4545) < 0.001);
  assert.ok(Math.abs(summary.buckets.fun.actualPercent - 18.1818) < 0.001);
  assert.ok(Math.abs(summary.buckets.future.actualPercent - 36.3636) < 0.001);
});

test("allocation shares remain meaningful with no monthly income while absolute targets are zero", () => {
  const transactions = [
    transaction({ id: "essential", amountCents: 5_000, categoryId: "groceries" }),
    transaction({ id: "fun", amountCents: 3_000, categoryId: "games" }),
    transaction({ id: "future", amountCents: 2_000, categoryId: "investments" }),
  ];

  const summary = calculateExpenseMonth(transactions, "2026-08");
  assert.equal(summary.incomeCents, 0);
  assert.equal(summary.totalOutflowCents, 10_000);
  assert.equal(summary.buckets.essentials.actualPercent, 50);
  assert.equal(summary.buckets.fun.actualPercent, 30);
  assert.equal(summary.buckets.future.actualPercent, 20);
  assert.equal(summary.buckets.essentials.targetCents, 0);
  assert.equal(summary.buckets.fun.targetCents, 0);
  assert.equal(summary.buckets.future.targetCents, 0);
  assert.deepEqual(expenseAllocationTargets, { essentials: 50, fun: 30, future: 20 });
});

test("Fun Fund first month matches that month's Fun target minus all Fun spending", () => {
  const transactions = [
    transaction({
      id: "income",
      type: "income",
      categoryId: "paycheck",
      amountCents: 135_460,
      occurredOn: "2026-08-10",
    }),
    transaction({
      id: "early-fun",
      categoryId: "books",
      amountCents: 3_470,
      occurredOn: "2026-08-15",
    }),
    transaction({
      id: "late-fun",
      categoryId: "going-out",
      amountCents: 4_239,
      occurredOn: "2026-08-25",
    }),
  ];

  const month = calculateExpenseMonth(transactions, "2026-08");
  const fund = calculateFunFund(transactions, "2026-08");
  assert.equal(month.buckets.fun.targetCents, 40_638);
  assert.equal(month.buckets.fun.remainingCents, 32_929);
  assert.equal(fund.balanceCents, month.buckets.fun.remainingCents);
});

test("Fun Fund uses the full starting month, rolls unused allowance forward, and never carries debt", () => {
  const transactions = [
    transaction({
      id: "aug-income",
      type: "income",
      categoryId: "paycheck",
      amountCents: 300_000,
      occurredOn: "2026-08-20",
    }),
    transaction({
      id: "aug-fun",
      categoryId: "games",
      amountCents: 20_000,
      occurredOn: "2026-08-22",
    }),
    transaction({
      id: "sep-income",
      type: "income",
      categoryId: "paycheck",
      amountCents: 200_000,
      occurredOn: "2026-09-01",
    }),
    transaction({
      id: "sep-fun",
      categoryId: "travel",
      amountCents: 10_000,
      occurredOn: "2026-09-12",
    }),
    transaction({
      id: "oct-fun",
      categoryId: "electronics",
      amountCents: 80_000,
      occurredOn: "2026-10-03",
    }),
    transaction({
      id: "nov-income",
      type: "income",
      categoryId: "other-income",
      amountCents: 100_000,
      occurredOn: "2026-11-02",
    }),
  ];

  assert.equal(funFundStartDate, "2026-08-21");
  assert.deepEqual(calculateFunFund(transactions, "2026-07"), {
    active: false,
    balanceCents: 0,
    allowanceCents: 0,
    funSpentCents: 0,
  });
  assert.equal(calculateFunFund(transactions, "2026-08").balanceCents, 70_000);
  assert.equal(calculateFunFund(transactions, "2026-09").balanceCents, 120_000);
  assert.equal(calculateFunFund(transactions, "2026-10").balanceCents, 40_000);
  assert.equal(calculateFunFund(transactions, "2026-11").balanceCents, 70_000);
});

test("legacy stored budget targets still normalize safely", () => {
  assert.deepEqual(
    normalizeExpenseSettings(undefined),
    defaultExpenseSettings,
  );
  assert.deepEqual(
    normalizeExpenseSettings({ currency: "EUR", targets: { essentials: 45, fun: 30, future: 25 } }),
    { currency: "EUR", targets: { essentials: 45, fun: 30, future: 25 } },
  );
  assert.deepEqual(
    normalizeExpenseSettings({ currency: "EUR", targets: { essentials: 50, fun: 40, future: 20 } }),
    defaultExpenseSettings,
  );
});

test("reconciliation accepts an empty or valid date and rejects malformed values", () => {
  assert.deepEqual(normalizeExpenseReconciliation(undefined), { reconciledThrough: "" });
  assert.deepEqual(
    normalizeExpenseReconciliation({ reconciledThrough: "2026-08-20" }),
    { reconciledThrough: "2026-08-20" },
  );
  assert.deepEqual(
    normalizeExpenseReconciliation({ reconciledThrough: "not-a-date" }),
    { reconciledThrough: "" },
  );
});

test("legacy reconciliation boundary logic remains stable for stored snapshots", () => {
  const duringCheck = new Date(2026, 7, 20, 18, 0, 0);
  const nextDay = new Date(2026, 7, 21, 9, 0, 0);

  assert.equal(nextExpenseDate("2026-08-20", duringCheck), "2026-08-21");
  assert.equal(nextExpenseDate("2026-08-20", nextDay), "2026-08-20");
});
