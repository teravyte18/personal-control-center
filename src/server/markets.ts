import { normalizeMarketSymbol, parseYahooChartQuote, type MarketQuote } from "@/domain/markets";
import { getDatabase } from "@/server/database";

const CACHE_TTL_MS = 60_000;
const MAX_WATCHLIST_SIZE = 50;

type CacheEntry = {
  expiresAt: number;
  quote: MarketQuote;
};

const globalForMarkets = globalThis as typeof globalThis & {
  pccMarketQuoteCache?: Map<string, CacheEntry>;
};

const quoteCache = globalForMarkets.pccMarketQuoteCache ?? new Map<string, CacheEntry>();
globalForMarkets.pccMarketQuoteCache = quoteCache;

export class MarketSymbolNotFoundError extends Error {
  constructor(symbol: string) {
    super(`No Yahoo Finance quote was found for ${symbol}.`);
    this.name = "MarketSymbolNotFoundError";
  }
}

export class MarketDataUnavailableError extends Error {
  constructor() {
    super("Market data is temporarily unavailable.");
    this.name = "MarketDataUnavailableError";
  }
}

export class MarketWatchlistLimitError extends Error {
  constructor() {
    super(`A watchlist can contain at most ${MAX_WATCHLIST_SIZE} symbols.`);
    this.name = "MarketWatchlistLimitError";
  }
}

export async function loadMarketWatchlist(userId: string) {
  const sql = getDatabase();
  const rows = await sql<{ symbol: string }[]>`
    select symbol
    from market_watchlist
    where user_id = ${userId}
    order by created_at asc, symbol asc
  `;
  return rows.flatMap((row) => {
    const symbol = normalizeMarketSymbol(row.symbol);
    return symbol ? [symbol] : [];
  });
}

export async function addMarketWatchlistSymbol(userId: string, symbol: string) {
  const normalized = normalizeMarketSymbol(symbol);
  if (!normalized) throw new TypeError("Market symbol is invalid.");

  const sql = getDatabase();
  await sql.begin(async (transaction) => {
    const [{ count }] = await transaction<{ count: number | string }[]>`
      select count(*)::int as count
      from market_watchlist
      where user_id = ${userId}
    `;
    if (Number(count) >= MAX_WATCHLIST_SIZE) {
      const [existing] = await transaction<{ symbol: string }[]>`
        select symbol
        from market_watchlist
        where user_id = ${userId} and symbol = ${normalized}
      `;
      if (!existing) throw new MarketWatchlistLimitError();
    }

    await transaction`
      insert into market_watchlist (user_id, symbol)
      values (${userId}, ${normalized})
      on conflict (user_id, symbol) do nothing
    `;
  });

  return normalized;
}

export async function removeMarketWatchlistSymbol(userId: string, symbol: string) {
  const normalized = normalizeMarketSymbol(symbol);
  if (!normalized) throw new TypeError("Market symbol is invalid.");

  const sql = getDatabase();
  await sql`
    delete from market_watchlist
    where user_id = ${userId}
      and symbol = ${normalized}
  `;
}

export async function fetchMarketQuote(symbol: string, force = false): Promise<MarketQuote> {
  const normalized = normalizeMarketSymbol(symbol);
  if (!normalized) throw new MarketSymbolNotFoundError(String(symbol));

  const cached = quoteCache.get(normalized);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.quote;

  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalized)}`);
  endpoint.searchParams.set("interval", "1d");
  endpoint.searchParams.set("range", "5d");

  let response: Response;
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "PersonalControlCenter/1.0",
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new MarketDataUnavailableError();
  }

  if (response.status === 404) throw new MarketSymbolNotFoundError(normalized);
  if (!response.ok) throw new MarketDataUnavailableError();

  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    throw new MarketDataUnavailableError();
  }

  const quote = parseYahooChartQuote(body, normalized);
  if (!quote) {
    const error = body && typeof body === "object" && "chart" in body
      ? (body as { chart?: { error?: unknown } }).chart?.error
      : null;
    if (error) throw new MarketSymbolNotFoundError(normalized);
    throw new MarketDataUnavailableError();
  }

  quoteCache.set(normalized, {
    quote,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return quote;
}

export async function fetchMarketQuotes(symbols: readonly string[], force = false) {
  return Promise.all(symbols.map(async (symbol) => {
    try {
      return { symbol, quote: await fetchMarketQuote(symbol, force), error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Market data is unavailable.";
      return { symbol, quote: null, error: message };
    }
  }));
}
