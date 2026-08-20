"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  categoriesForType,
  validExpenseDate,
  type ExpenseSettings,
  type ExpenseTransaction,
  type ExpenseTransactionType,
  type ExpenseTransactionUpdates,
} from "@/domain/expenses";
import {
  applyPersonalDataMutation,
  emptyPersonalDataSnapshot,
  normalizePersonalDataSnapshot,
  type PersonalDataMutation,
  type PersonalDataSnapshot,
} from "@/domain/personal-data-snapshot";

type ServerStatePayload = {
  revision: number;
  snapshot: PersonalDataSnapshot;
};

type NewExpenseTransaction = {
  type: ExpenseTransactionType;
  amountCents: number;
  categoryId: string;
  description: string;
  occurredOn: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseServerState(value: unknown): ServerStatePayload | null {
  if (!isRecord(value) || typeof value.revision !== "number") return null;
  return {
    revision: value.revision,
    snapshot: normalizePersonalDataSnapshot(value.snapshot),
  };
}

function createTransaction(input: NewExpenseTransaction): ExpenseTransaction {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    type: input.type,
    amountCents: input.amountCents,
    categoryId: input.categoryId,
    description: input.description.trim(),
    occurredOn: input.occurredOn,
    createdAt: now,
    updatedAt: now,
  };
}

function validTransactionInput(input: NewExpenseTransaction | ExpenseTransactionUpdates) {
  const category = categoriesForType(input.type).find((candidate) => candidate.id === input.categoryId);
  return Boolean(category)
    && Number.isSafeInteger(input.amountCents)
    && input.amountCents > 0
    && validExpenseDate(input.occurredOn);
}

export function useExpenses() {
  const [snapshot, setSnapshot] = useState<PersonalDataSnapshot>(emptyPersonalDataSnapshot);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/personal-data", { cache: "no-store" });
    if (!response.ok) throw new Error("Expenses could not be loaded.");
    const server = parseServerState(await response.json());
    if (!server) throw new Error("Expenses returned an invalid response.");
    setSnapshot(server.snapshot);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/personal-data", { cache: "no-store" });
        if (!response.ok) throw new Error("Expenses could not be loaded.");
        const server = parseServerState(await response.json());
        if (!server) throw new Error("Expenses returned an invalid response.");
        if (!cancelled) {
          setSnapshot(server.snapshot);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Expenses could not be loaded.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const commitMutation = useCallback((mutation: PersonalDataMutation) => {
    setSnapshot((current) => applyPersonalDataMutation(current, mutation));
    pendingRef.current += 1;
    setSaving(true);

    queueRef.current = queueRef.current
      .then(async () => {
        const response = await fetch("/api/personal-data/mutations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation),
        });
        const body = await response.json() as unknown;
        if (!response.ok) {
          const message = isRecord(body) && typeof body.error === "string"
            ? body.error
            : "Expense changes could not be saved.";
          throw new Error(message);
        }
        const server = parseServerState(body);
        if (!server) throw new Error("Expenses returned an invalid response.");
        setSnapshot(server.snapshot);
        setError("");
      })
      .catch(async (saveError) => {
        setError(saveError instanceof Error ? saveError.message : "Expense changes could not be saved.");
        try {
          await refresh();
        } catch {
          // Keep the optimistic copy visible until the next successful refresh.
        }
      })
      .finally(() => {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        setSaving(pendingRef.current > 0);
      });
  }, [refresh]);

  const addTransaction = useCallback((input: NewExpenseTransaction) => {
    if (!validTransactionInput(input)) return null;
    const transaction = createTransaction(input);
    commitMutation({ type: "add-expense-transaction", transaction });
    return transaction;
  }, [commitMutation]);

  const updateTransaction = useCallback((id: string, updates: ExpenseTransactionUpdates) => {
    if (!validTransactionInput(updates)) return false;
    commitMutation({
      type: "update-expense-transaction",
      id,
      updates,
      occurredAt: new Date().toISOString(),
    });
    return true;
  }, [commitMutation]);

  const deleteTransaction = useCallback((id: string) => {
    commitMutation({ type: "delete-expense-transaction", id });
  }, [commitMutation]);

  const updateSettings = useCallback((settings: ExpenseSettings) => {
    commitMutation({ type: "update-expense-settings", settings });
  }, [commitMutation]);

  const setReconciledThrough = useCallback((date: string) => {
    commitMutation({ type: "set-expense-reconciled-through", date });
  }, [commitMutation]);

  return {
    transactions: snapshot.expenseTransactions,
    settings: snapshot.expenseSettings,
    reconciliation: snapshot.expenseReconciliation,
    loaded,
    saving,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateSettings,
    setReconciledThrough,
    refresh,
  };
}
