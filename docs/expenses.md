# Personal Expenses

Personal Expenses is a phone-first manual spending tracker. Its purpose is to make immediate logging easy enough to become the normal habit while still giving useful monthly and longer-term context without turning expense tracking into a reconciliation chore.

The feature deliberately does not depend on bank APIs, Open Banking, CSV imports, notifications, or AI. Personal Control Center remains the canonical record of categorized transactions.

## Workflow

### Immediate capture

The Expenses space opens on the monthly data rather than an entry form. A compact `+` action expands Quick Add only when a transaction needs to be recorded.

An expense requires only:

- amount;
- category;
- date, defaulting to today.

Description is optional. The form collapses after a successful entry. Income uses the same form through an Expense / Income toggle.

There is deliberately no weekly bank-reconciliation workflow in the UI. The intended habit is to record expenses when the bank notification arrives; an occasional missed transaction is acceptable and should not create a second recurring checking task.

## Data model

Expense state lives in the existing authenticated, revisioned personal-data snapshot rather than a separate finance database.

The snapshot contains:

- `expenseTransactions` — user-scoped income and expense entries;
- `expenseSettings` — retained currency/settings data for snapshot compatibility;
- `expenseReconciliation` — legacy reconciliation state retained for snapshot compatibility, but no longer exposed in the Expenses UI.

A transaction stores a stable ID, expense/income type, positive integer amount in cents, category ID, optional description, calendar date, and created/updated timestamps.

Storing integer cents avoids floating-point currency arithmetic. Expense mutations use the same authenticated `/api/personal-data/mutations` boundary and row-locking transaction as the rest of personal state. They are excluded from Google Calendar reconciliation because they have no Calendar projection.

## Categories and allocation buckets

Expense categories map internally to one of three high-level buckets so entry never asks for both a detailed category and a broad category.

### Essentials

Initial categories include Groceries, Food, Rent, Phone, Healthcare, Personal care, Transport, and Household.

### Fun

Initial categories include Going out, Clothing, Games, Books, Hobbies, Subscriptions, Electronics, Travel, and Gifts.

### Future You

Initial categories include Investments, Savings / funds, Education, and Self-development.

Future You is presented separately from ordinary spending in the monthly headline. Moving money toward savings or investments should not look identical to consuming that money.

Income initially supports Paycheck and Other income. Income remains useful cash-flow context and determines the absolute 50/30/20 target amounts, but it does not determine the actual allocation percentages.

## Monthly view

The fixed reference allocation in code is:

- Essentials — 50%;
- Fun — 30%;
- Future You — 20%.

There is no in-app editor for these percentages. If the intended reference changes, it should be changed deliberately in the code rather than becoming another routine setting to manage.

The monthly cards use a hybrid model:

- **actual percentages** are calculated over total monthly outflows, so Essentials + Fun + Future You describe 100% of what actually went out that month;
- **absolute target amounts** remain percentages of recorded monthly income, preserving the familiar 50/30/20 euro reference.

This means low- or zero-income months can still show a meaningful spending mix without pretending that the percentage shares themselves are an income-budget utilization metric. The income-based euro targets may still be exceeded during those months, which is intentional and shown as an absolute over/under amount rather than a percentage above 100%.

For the selected month the page derives:

- total income;
- ordinary spending, defined as Essentials plus Fun;
- Future You allocation;
- net cash flow after all three buckets;
- each bucket's share of total monthly outflows;
- each bucket's fixed 50/30/20 euro target derived from monthly income;
- the rolling Fun Fund balance, shown compactly in the Fun card;
- category totals;
- editable transaction history.

### Fun Fund

The Fun Fund is deliberately separate from the monthly allocation percentages. Its purpose is to let unused discretionary allowance roll forward so a larger later purchase can be made from accumulated room rather than making one month look arbitrarily bad.

The current reset marker is **21 August 2026**, but the first Fund calculation covers the **entire August 2026 calendar month**. That makes the first displayed Fund balance equal the monthly Fun target minus all Fun spending recorded for August. The day-level marker is retained for compatibility, while months before August are ignored.

For each month from the starting month onward:

```text
Fun Fund = max(€0, previous Fun Fund + 30% of recorded income - Fun spending)
```

The floor at zero is important: excess Fun spending never creates debt against future months. If the balance is zero during a low-income period, it simply remains zero. A later source of recorded income starts building the fund again without first repaying past discretionary spending.

## Insights view

The former Weekly check tab is now **Insights**. It is intended to answer questions such as “where is my money going?” without requiring another maintenance habit.

The view supports:

- This month, last 3 months, last 6 months, this year, all time, and custom month ranges;
- all-category or specific-category filtering;
- a category-mix donut chart and totals;
- total spending, transaction count, and average spending per month;
- monthly spending trend for the selected range/filter;
- description-level breakdown after selecting a category, so categories such as Subscriptions can reveal entries such as Netflix, Amazon Prime, and similar descriptions.

Description grouping is intentionally based on the text entered on transactions rather than a second merchant/subcategory data model.

## Navigation

Expenses is a normal available working space registered in shared navigation configuration. It appears in All Spaces and the desktop rail and may be chosen as one of the four mobile quick-access destinations. It does not replace Capture or enter the Inbox workflow.

## Offline boundary

Expense entry is online-only. The dedicated service-worker queue remains restricted to Quick Capture; Expenses does not claim offline durability or general snapshot synchronization.

A server-save failure is surfaced in the Expenses UI and the hook refreshes canonical state when possible. Expanding the offline queue to finance entries should only happen after real use demonstrates that temporary connectivity is a meaningful source of missed expenses.

## Current non-goals

The current version does not include:

- Trade Republic or other bank automation;
- Open Banking connections;
- statement or CSV import;
- automated transaction matching or merchant categorization;
- per-category hard budgets;
- recurring-transaction generation;
- debt, account-balance, net-worth, tax, or investment-performance tracking;
- multi-currency conversion.

The goal remains a lightweight record that is easy to keep reasonably current, with analytics useful enough to learn from the data already captured.

## Regression checks

When Expenses changes, verify:

- old snapshots still normalize safely;
- every transaction remains scoped to the authenticated user through the shared snapshot store;
- amount/date/category validation rejects malformed mutations;
- income categories cannot be used for expenses and vice versa;
- Essentials + Fun + Future You actual percentages use total monthly outflows and sum to 100% when outflows exist;
- absolute bucket targets use the fixed 50/30/20 percentages of monthly income;
- a month with no income still produces meaningful allocation shares while euro targets are zero;
- the first Fun Fund month equals that month's Fun target minus all Fun spending;
- later Fun Fund months roll unused 30% income allowance forward and never carry a negative balance;
- Insights filters respect date ranges and category selection, and selected categories break down by description;
- add/update/delete mutations survive normalization and export;
- legacy reconciliation state continues to normalize safely even though the UI does not expose it;
- expense-only mutations do not trigger Google Calendar reconciliation;
- Expenses remains pinnable without changing the four default mobile destinations;
- Quick Capture remains the only advertised offline workflow.
