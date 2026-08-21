# Personal Expenses

Personal Expenses is a phone-first manual spending tracker. Its purpose is to make immediate logging easy enough to become the normal habit while keeping a lightweight weekly reconciliation flow as a safety net for missed transactions.

The feature deliberately does not depend on bank APIs, Open Banking, CSV imports, notifications, or AI. Personal Control Center remains the canonical record of categorized transactions.

## Workflow

### Immediate capture

The Expenses space opens on the monthly data rather than an entry form. A compact `+` action expands Quick Add only when a transaction needs to be recorded.

An expense requires only:

- amount;
- category;
- date, defaulting to today.

Description is optional. The form collapses after a successful entry. Income uses the same form through an Expense / Income toggle.

### Weekly check

Immediate logging is the primary habit, not a requirement for perfect real-time capture. Weekly check exists to recover from missed transactions without reconstructing the week from memory.

The bank transaction history is the checklist. PCC shows its own entries for the unchecked period, grouped by transaction date. The user compares the two lists, adds missing transactions through `+`, corrects or deletes entries when needed, and then marks the period checked.

`reconciledThrough` is persisted in the user snapshot. Immediately after a check the period is caught up through that date. On a later day, the next check deliberately includes the previous boundary date once more before moving forward. This one-day overlap prevents a transaction made later on the day of the previous check from falling permanently between reconciliation periods. Before the first reconciliation, the view defaults to the most recent seven calendar days rather than presenting an unbounded historical period.

Reconciliation is intentionally manual. There is no claim that PCC knows which bank transactions are missing.

## Data model

Expense state lives in the existing authenticated, revisioned personal-data snapshot rather than a separate finance database.

The snapshot contains:

- `expenseTransactions` — user-scoped income and expense entries;
- `expenseSettings` — retained currency/settings data for snapshot compatibility;
- `expenseReconciliation` — the last checked-through date.

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

Income initially supports Paycheck and Other income. Income remains useful cash-flow context, but it does not determine the allocation percentages.

## Monthly view

The fixed reference allocation in code is:

- Essentials — 50%;
- Fun — 30%;
- Future You — 20%.

There is no in-app editor for these percentages. If the intended reference changes, it should be changed deliberately in the code rather than becoming another routine setting to manage.

The three bucket percentages are calculated over **total monthly outflows**, not monthly income. Total outflows are Essentials + Fun + Future You, so the three actual shares describe 100% of what left the spending system that month even when income is zero or unusually low.

For the selected month the page derives:

- total income;
- ordinary spending, defined as Essentials plus Fun;
- Future You allocation;
- remaining cash flow after all three buckets;
- each bucket's actual share of monthly outflows versus the fixed 50/30/20 guide;
- category totals;
- editable transaction history.

The bucket cards show the actual percentage directly and the percentage-point difference from the guide. They do not present an income-derived budget or imply that low income makes ordinary spending mathematically over 100%.

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
- multi-currency conversion;
- dense analytics dashboards or long-term trend charts.

The acceptance question remains behavioral: can immediate capture plus the weekly safety net stay easy enough to keep the data current?

## Regression checks

When Expenses changes, verify:

- old snapshots still normalize safely;
- every transaction remains scoped to the authenticated user through the shared snapshot store;
- amount/date/category validation rejects malformed mutations;
- income categories cannot be used for expenses and vice versa;
- Essentials + Fun + Future You actual percentages use total monthly outflows and sum to 100% when outflows exist;
- the fixed reference remains 50/30/20 unless deliberately changed in code;
- a month with no income still produces meaningful allocation shares;
- add/update/delete and reconciliation mutations survive normalization and export;
- later weekly checks overlap the previous boundary date so same-day late transactions are not skipped;
- expense-only mutations do not trigger Google Calendar reconciliation;
- Expenses remains pinnable without changing the four default mobile destinations;
- Quick Capture remains the only advertised offline workflow.
