"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { MarketQuote } from "@/domain/markets";

type QuoteResult = {
  symbol: string;
  quote: MarketQuote | null;
  error: string | null;
};

type MarketsResponse = {
  quotes?: QuoteResult[];
  fetchedAt?: string;
  error?: string;
};

async function requestMarkets(force = false): Promise<MarketsResponse> {
  const response = await fetch(`/api/markets${force ? "?refresh=1" : ""}`, { cache: "no-store" });
  const body = await response.json() as MarketsResponse;
  if (!response.ok) throw new Error(body.error || "Markets could not be loaded.");
  return body;
}

function formatNumber(value: number, digits: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPrice(value: number, currency: string, digits: number) {
  if (currency === "GBp") return `${formatNumber(value, digits)}p`;
  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value);
    } catch {
      // Fall back to an explicit provider currency suffix.
    }
  }
  return `${formatNumber(value, digits)}${currency ? ` ${currency}` : ""}`;
}

function formatChange(quote: MarketQuote) {
  const sign = quote.change > 0 ? "+" : quote.change < 0 ? "−" : "";
  const absolute = formatPrice(Math.abs(quote.change), quote.currency, quote.priceHint);
  const percent = Math.abs(quote.changePercent).toFixed(2);
  return `${sign}${absolute} (${sign}${percent}%)`;
}

function movementClass(change: number) {
  if (change > 0) return "text-emerald-700";
  if (change < 0) return "text-red-700";
  return "text-slate-500";
}

function tradingViewSearch(symbol: string) {
  return `https://www.tradingview.com/search/?query=${encodeURIComponent(symbol)}`;
}

export default function MarketsPage() {
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [symbol, setSymbol] = useState("");
  const [fetchedAt, setFetchedAt] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const body = await requestMarkets();
        if (!cancelled) {
          setQuotes(Array.isArray(body.quotes) ? body.quotes : []);
          setFetchedAt(typeof body.fetchedAt === "string" ? body.fetchedAt : "");
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Markets could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshQuotes() {
    setRefreshing(true);
    setError("");
    try {
      const body = await requestMarkets(true);
      setQuotes(Array.isArray(body.quotes) ? body.quotes : []);
      setFetchedAt(typeof body.fetchedAt === "string" ? body.fetchedAt : "");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Markets could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  const lastUpdated = useMemo(() => {
    if (!fetchedAt) return "";
    return new Date(fetchedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }, [fetchedAt]);

  async function addTicker(event: FormEvent) {
    event.preventDefault();
    const candidate = symbol.trim().toUpperCase();
    if (!candidate || adding) return;

    setAdding(true);
    setError("");
    try {
      const response = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: candidate }),
      });
      const body = await response.json() as { quote?: MarketQuote; error?: string };
      if (!response.ok || !body.quote) throw new Error(body.error || "Ticker could not be added.");
      const quote = body.quote;
      setQuotes((current) => current.some((item) => item.symbol === quote.symbol)
        ? current.map((item) => item.symbol === quote.symbol
          ? { symbol: quote.symbol, quote, error: null }
          : item)
        : [...current, { symbol: quote.symbol, quote, error: null }]);
      setSymbol("");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Ticker could not be added.");
    } finally {
      setAdding(false);
    }
  }

  async function removeTicker(target: string) {
    if (removing) return;
    const previous = quotes;
    setRemoving(target);
    setQuotes((current) => current.filter((item) => item.symbol !== target));
    setError("");

    try {
      const response = await fetch("/api/markets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: target }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Ticker could not be removed.");
    } catch (removeError) {
      setQuotes(previous);
      setError(removeError instanceof Error ? removeError.message : "Ticker could not be removed.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {loaded ? `${quotes.length} ${quotes.length === 1 ? "ticker" : "tickers"}${lastUpdated ? ` · ${lastUpdated}` : ""}` : "Loading…"}
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Markets</h2>
        </div>
        <button
          type="button"
          onClick={() => void refreshQuotes()}
          disabled={!loaded || refreshing}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <form onSubmit={addTicker} className="mt-5 flex gap-2">
        <input
          value={symbol}
          onChange={(event) => setSymbol(event.target.value)}
          className="input min-w-0 flex-1 uppercase"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="AAPL or VWCE.DE"
          aria-label="Ticker symbol"
        />
        <button
          type="submit"
          disabled={!symbol.trim() || adding}
          className="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {!loaded ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading watchlist…</div>
      ) : quotes.length ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {quotes.map((item, index) => (
            <div
              key={item.symbol}
              className={`flex min-h-20 items-center gap-3 px-4 py-3 ${index ? "border-t border-slate-100" : ""}`}
            >
              <a
                href={tradingViewSearch(item.symbol)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1"
                aria-label={`Open ${item.symbol} in TradingView search`}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-950">{item.symbol}</p>
                  <span className="text-xs text-slate-400" aria-hidden="true">↗</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {item.quote?.name || item.error || "Quote unavailable"}
                </p>
              </a>

              <div className="shrink-0 text-right">
                {item.quote ? (
                  <>
                    <p className="font-semibold text-slate-950">
                      {formatPrice(item.quote.price, item.quote.currency, item.quote.priceHint)}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${movementClass(item.quote.change)}`}>
                      {formatChange(item.quote)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-medium text-slate-400">Unavailable</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void removeTicker(item.symbol)}
                disabled={removing === item.symbol}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl text-slate-400 active:bg-slate-100 disabled:opacity-40"
                aria-label={`Remove ${item.symbol} from watchlist`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Your watchlist is empty. Add a Yahoo Finance ticker above.
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-400">
        Prices come from Yahoo Finance and may be delayed depending on the exchange. Symbols are cached briefly to keep the personal server lightweight.
      </p>
    </section>
  );
}
