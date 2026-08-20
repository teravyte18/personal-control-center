# Personal Expenses

Personal Expenses is a phone-first manual spending tracker. Its purpose is to make immediate logging easy enough to become the normal habit while keeping a lightweight weekly reconciliation flow as a safety net for missed transactions.

The feature deliberately does not depend on bank APIs, Open Banking, CSV imports, notifications, or AI. Personal Control Center remains the canonical record of categorized transactions.

## V1 workflow

### Immediate capture

The Expenses space keeps Quick Add at the top of the page.

An expense requires only:

- amount;
- category;
- date, defaulting to today.

Description is optional. After a successful entry, amount and description clear while the chosen type, category, and date remain available, which supports both one-off phone capture and several entries from the same day.

Income uses the same form through an Expense / Income toggle. Income is required for percentage targets to produce meaningful monthly target amounts.

### Weekly check

Immediate logging is the primary habit, not a requirement for perfect real-time capture. Weekly check exists to recover from missed transactions without reconstructing the week from memory.

The bank transaction history is the checklist. PCC shows its own entries for the unchecked period, grouped by transaction date. The user compares the two lists, adds missing transactions through Quick Add, corrects or deletes entries when needed, and then marks the period checked.

`reconciledThrough` is persisted in the user snapshot. The next check starts on the following date. Before the first reconciliation, the view defaults to the most recent seven calendar days rather than presenting an unbounded historical period.

Reconciliation is intentionally manual in V1. There is no claim that PCC knows which bank transactions are missing.

## Data model

Expense state lives in the existing authenticated, revisioned personal-data snapshot rather than a separate finance database.

The snapshot adds:

- `expenseTransactions` — user-scoped income and expense entries;
- `expenseSettings` — currency and high-level allocation targets;
- `expenseReconciliation` — the last checked-through date.

A transaction stores:

- stable ID;
- `expense` or `income` type;
- positive integer amount in cents;
- category ID;
- optional description;
- calendar date;
- created and updated timestamps.

Storing integer cents avoids floating-point currency arithmetic. Old snapshots normalize to empty expense history, EUR, 50/30/20 targets, and no reconciliation marker, so no PostgreSQL schema migration is required.

Expense mutations use the same authenticated `/api/personal-data/mutations` boundary and row-locking transaction as the rest of personal state. They are excluded from Google Calendar reconciliation because they have no Calendar projection.

## Categories and allocation buckets

Expense categories are mapped internally to one of three high-level buckets so entry never asks the user to choose both a detailed category and a broad category.

### Essentials

Initial categories include Groceries, Food, Rent, Phone, Healthcare, Personal care, Transport, and Household.

### Fun

Initial categories include Going out, Clothing, Games, Books, Hobbies, Subscriptions, Electronics, Travel, and Gifts.

### Future You

Initial categories include Investments, Savings / funds, Education, and Self-development.

Future You uses the same allocation mathematics as the other buckets but is presented separately from ordinary spending in the monthly headline. Moving money toward savings or investments should not look identical to consuming that money.

Income initially supports Paycheck and Other income.

The category list is intentionally small and stable in V1. Transaction descriptions retain purchase-specific detail without turning every merchant, game, book, or event into a reporting category.

## Monthly view

The default allocation is:

- Essentials — 50%;
- Fun — 30%;
- Future You — 20%.

The three percentages are user-configurable but must total 100%.

For the selected month the page derives:

- total income;
- ordinary spending, defined as Essentials plus Fun;
- Future You allocation;
- total remaining after all three buckets;
- actual, target, and remaining/over amount for every bucket;
- category totals;
- editable transaction history.

Targets are percentages of income recorded for that calendar month. If no income is recorded, target amounts are zero rather than inventing a budget.

## Navigation

Expenses is a normal available working space registered in shared navigation configuration. It appears in All Spaces and the desktop rail and may be chosen as one of the four mobile quick-access destinations. It does not replace Capture or enter the Inbox workflow.

## Offline boundary

Expense entry is online-only in V1. The dedicated service-worker queue remains restricted to Quick Capture; Expenses does not claim offline durability or general snapshot synchronization.

A server-save failure is surfaced in the Expenses UI and the hook refreshes canonical state when possible. Expanding the offline queue to finance entries should only happen after real use demonstrates that temporary connectivity is a meaningful source of missed expenses.

## Current non-goals

V1 does not include:

- Trade Republic or other bank automation;
- Open Banking connections;
- statement or CSV import;
- automated transaction matching or merchant categorization;
- per-category hard budgets;
- recurring-transaction generation;
- debt, account-balance, net-worth, tax, or investment-performance tracking;
- multi-currency conversion;
- dense analytics dashboards or long-term trend charts.

The first acceptance question is behavioral: can immediate capture plus the weekly safety net stay easy enough to keep the data current? Trend views and deeper finance features should follow observed use rather than precede it.

## Regression checks

When Expenses changes, verify:

- old snapshots still normalize safely;
- every transaction remains scoped to the authenticated user through the shared snapshot store;
- amount/date/category validation rejects malformed mutations;
- income categories cannot be used for expenses and vice versa;
- 50/30/20 calculations keep Future You separate from ordinary spending;
- allocation percentages must total 100%;
- add/update/delete and reconciliation mutations survive normalization and export;
- expense-only mutations do not trigger Google Calendar reconciliation;
- Expenses remains pinnable without changing the four default mobile destinations;
- Quick Capture remains the only advertised offline workflow.
