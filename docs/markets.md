# Markets watchlist

Markets is a deliberately small, personal watchlist rather than a TradingView replacement or portfolio tracker.

## Current scope

The implemented view supports:

- adding a Yahoo Finance ticker such as `AAPL`, `BRK-B`, or `VWCE.DE`;
- removing a ticker directly from the watchlist;
- current/last market price;
- absolute and percentage movement from the previous trading session;
- a manual refresh;
- opening a TradingView search for a watched symbol.

There are intentionally no embedded charts, fundamentals, screeners, trade execution, holdings, profit/loss accounting, alerts, or broker connections.

## Data source

The server queries Yahoo Finance's chart endpoint directly. This keeps the same no-API-key advantage that motivated using `yfinance`, while avoiding a Python runtime and Python package dependency inside the existing Node/Next.js container.

Quotes are cached in memory for 60 seconds. Manual refresh bypasses that cache. Exchange-specific delays still depend on Yahoo's upstream data.

## Persistence and isolation

Only ticker symbols are persisted. They live in the `market_watchlist` PostgreSQL table and are scoped by authenticated `user_id`.

Quote data is fetched when Markets is opened or refreshed and is not written to PostgreSQL.

The table is included automatically in the normal PostgreSQL backup flow. Removing a user cascades their watchlist entries.

## Navigation

Markets is an available working space in All Spaces, the desktop rail, and mobile quick-access configuration. It does not enter Inbox, Tasks, Projects, Calendar projection, or offline Capture flows.

## Operational boundary

Markets remains online-only. If Yahoo is temporarily unavailable, persisted symbols remain intact and the UI reports quote availability per ticker.
