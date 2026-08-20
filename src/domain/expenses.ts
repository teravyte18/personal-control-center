export const expenseBucketIds = ["essentials", "fun", "future"] as const;
export type ExpenseBucketId = (typeof expenseBucketIds)[number];

export const expenseTransactionTypes = ["expense", "income"] as const;
export type ExpenseTransactionType = (typeof expenseTransactionTypes)[number];

export type ExpenseCategory = {
  id: string;
  label: string;
  bucket?: ExpenseBucketId;
  type: ExpenseTransactionType;
};

export const expenseCategories: ExpenseCategory[] = [
  { id: "groceries", label: "Groceries", bucket: "essentials", type: "expense" },
  { id: "food", label: "Food", bucket: "essentials", type: "expense" },
  { id: "rent", label: "Rent", bucket: "essentials", type: "expense" },
  { id: "phone", label: "Phone", bucket: "essentials", type: "expense" },
  { id: "healthcare", label: "Healthcare", bucket: "essentials", type: "expense" },
  { id: "personal-care", label: "Personal care", bucket: "essentials", type: "expense" },
  { id: "transport", label: "Transport", bucket: "essentials", type: "expense" },
  { id: "household", label: "Household", bucket: "essentials", type: "expense" },
  { id: "going-out", label: "Going out", bucket: "fun", type: "expense" },
  { id: "clothing", label: "Clothing", bucket: "fun", type: "expense" },
  { id: "games", label: "Games", bucket: "fun", type: "expense" },
  { id: "books", label: "Books", bucket: "fun", type: "expense" },
  { id: "hobbies", label: "Hobbies", bucket: "fun", type: "expense" },
  { id: "subscriptions", label: "Subscriptions", bucket: "fun", type: "expense" },
  { id: "electronics", label: "Electronics", bucket: "fun", type: "expense" },
  { id: "travel", label: "Travel", bucket: "fun", type: "expense" },
  { id: "gifts", label: "Gifts", bucket: "fun", type: "expense" },
  { id: "investments", label: "Investments", bucket: "future", type: "expense" },
  { id: "savings", label: "Savings / funds", bucket: "future", type: "expense" },
  { id: "education", label: "Education", bucket: "future", type: "expense" },
  { id: "self-development", label: "Self-development", bucket: "future", type: "expense" },
  { id: "paycheck", label: "Paycheck", type: "income" },
  { id: "other-income", label: "Other income", type: "income" },
];

export const expenseBucketLabels: Record<ExpenseBucketId, string> = {
  essentials: "Essentials",
  fun: "Fun",
  future: "Future You",
};

export type ExpenseTransaction = {
  id: string;
  type: ExpenseTransactionType;
  amountCents: number;
  categoryId: string;
  description: string;
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseTransactionUpdates = Pick<
  ExpenseTransaction,
  "type" | "amountCents" | "categoryId" | "description" | "occurredOn"
>;

export type ExpenseSettings = {
  currency: "EUR";
  targets: Record<ExpenseBucketId, number>;
};

export type ExpenseReconciliation = {
  reconciledThrough: string;
};

export const defaultExpenseSettings: ExpenseSettings = {
  currency: "EUR",
  targets: {
    essentials: 50,
    fun: 30,
    future: 20,
  },
};

export const emptyExpenseReconciliation: ExpenseReconciliation = {
  reconciledThrough: "",
};

export type ExpenseBucketSummary = {
  bucket: ExpenseBucketId;
  actualCents: number;
  targetCents: number;
  remainingCents: number;
};

export type ExpenseMonthSummary = {
  incomeCents: number;
  spendingCents: number;
  futureCents: number;
  totalOutflowCents: number;
  remainingCents: number;
  buckets: Record<ExpenseBucketId, ExpenseBucketSummary>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validExpenseDate(value: unknown): value is string {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function validDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function getExpenseCategory(categoryId: string) {
  return expenseCategories.find((category) => category.id === categoryId);
}

export function categoriesForType(type: ExpenseTransactionType) {
  return expenseCategories.filter((category) => category.type === type);
}

export function normalizeExpenseTransaction(value: unknown): ExpenseTransaction | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || !expenseTransactionTypes.includes(value.type as ExpenseTransactionType)
    || typeof value.amountCents !== "number"
    || !Number.isSafeInteger(value.amountCents)
    || value.amountCents <= 0
    || typeof value.categoryId !== "string"
    || typeof value.description !== "string"
    || !validExpenseDate(value.occurredOn)
    || !validDateTime(value.createdAt)
    || !validDateTime(value.updatedAt)) return null;

  const type = value.type as ExpenseTransactionType;
  const category = getExpenseCategory(value.categoryId);
  if (!category || category.type !== type) return null;

  return {
    id: value.id,
    type,
    amountCents: value.amountCents,
    categoryId: value.categoryId,
    description: value.description.trim(),
    occurredOn: value.occurredOn,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function normalizeExpenseTransactions(value: unknown): ExpenseTransaction[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const transactions: ExpenseTransaction[] = [];
  for (const candidate of value) {
    const transaction = normalizeExpenseTransaction(candidate);
    if (!transaction || seen.has(transaction.id)) continue;
    seen.add(transaction.id);
    transactions.push(transaction);
  }
  return transactions.sort((left, right) => {
    const byDate = right.occurredOn.localeCompare(left.occurredOn);
    return byDate || right.createdAt.localeCompare(left.createdAt);
  });
}

export function normalizeExpenseTransactionUpdates(value: unknown): ExpenseTransactionUpdates | null {
  if (!isRecord(value)
    || !expenseTransactionTypes.includes(value.type as ExpenseTransactionType)
    || typeof value.amountCents !== "number"
    || !Number.isSafeInteger(value.amountCents)
    || value.amountCents <= 0
    || typeof value.categoryId !== "string"
    || typeof value.description !== "string"
    || !validExpenseDate(value.occurredOn)) return null;

  const type = value.type as ExpenseTransactionType;
  const category = getExpenseCategory(value.categoryId);
  if (!category || category.type !== type) return null;

  return {
    type,
    amountCents: value.amountCents,
    categoryId: value.categoryId,
    description: value.description.trim(),
    occurredOn: value.occurredOn,
  };
}

export function normalizeExpenseSettings(value: unknown): ExpenseSettings {
  if (!isRecord(value) || value.currency !== "EUR" || !isRecord(value.targets)) {
    return { ...defaultExpenseSettings, targets: { ...defaultExpenseSettings.targets } };
  }

  const rawTargets = value.targets;
  const targets = Object.fromEntries(
    expenseBucketIds.map((bucket) => [bucket, rawTargets[bucket]]),
  ) as Record<ExpenseBucketId, unknown>;
  if (expenseBucketIds.some((bucket) => typeof targets[bucket] !== "number"
    || !Number.isFinite(targets[bucket] as number)
    || (targets[bucket] as number) < 0
    || (targets[bucket] as number) > 100)) {
    return { ...defaultExpenseSettings, targets: { ...defaultExpenseSettings.targets } };
  }

  const normalizedTargets = Object.fromEntries(
    expenseBucketIds.map((bucket) => [bucket, Number(targets[bucket])]),
  ) as Record<ExpenseBucketId, number>;
  const total = expenseBucketIds.reduce((sum, bucket) => sum + normalizedTargets[bucket], 0);
  if (Math.abs(total - 100) > 0.001) {
    return { ...defaultExpenseSettings, targets: { ...defaultExpenseSettings.targets } };
  }

  return { currency: "EUR", targets: normalizedTargets };
}

export function normalizeExpenseReconciliation(value: unknown): ExpenseReconciliation {
  if (!isRecord(value)) return { ...emptyExpenseReconciliation };
  return {
    reconciledThrough: value.reconciledThrough === "" || validExpenseDate(value.reconciledThrough)
      ? String(value.reconciledThrough)
      : "",
  };
}

export function parseAmountToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function transactionsForMonth(transactions: ExpenseTransaction[], month: string) {
  return transactions.filter((transaction) => transaction.occurredOn.startsWith(`${month}-`));
}

export function calculateExpenseMonth(
  transactions: ExpenseTransaction[],
  settings: ExpenseSettings,
  month: string,
): ExpenseMonthSummary {
  const monthTransactions = transactionsForMonth(transactions, month);
  const incomeCents = monthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amountCents, 0);

  const actuals: Record<ExpenseBucketId, number> = {
    essentials: 0,
    fun: 0,
    future: 0,
  };

  for (const transaction of monthTransactions) {
    if (transaction.type !== "expense") continue;
    const category = getExpenseCategory(transaction.categoryId);
    if (category?.bucket) actuals[category.bucket] += transaction.amountCents;
  }

  const buckets = Object.fromEntries(expenseBucketIds.map((bucket) => {
    const targetCents = Math.round(incomeCents * settings.targets[bucket] / 100);
    const actualCents = actuals[bucket];
    return [bucket, {
      bucket,
      actualCents,
      targetCents,
      remainingCents: targetCents - actualCents,
    } satisfies ExpenseBucketSummary];
  })) as Record<ExpenseBucketId, ExpenseBucketSummary>;

  const spendingCents = actuals.essentials + actuals.fun;
  const futureCents = actuals.future;
  const totalOutflowCents = spendingCents + futureCents;

  return {
    incomeCents,
    spendingCents,
    futureCents,
    totalOutflowCents,
    remainingCents: incomeCents - totalOutflowCents,
    buckets,
  };
}

function localDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function nextExpenseDate(date: string, now = new Date()) {
  // Once a reconciliation date is in the past, include that boundary date once
  // more on the next check. This prevents transactions made later on the day a
  // check was completed from falling permanently between weekly checks.
  if (date < localDateOnly(now)) return date;

  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
