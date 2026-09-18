export type MarketQuote = {
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  priceHint: number;
  asOf: string | null;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeMarketSymbol(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized.length > 32) return null;
  return /^[A-Z0-9.^=\-]+$/.test(normalized) ? normalized : null;
}

export function parseYahooChartQuote(value: unknown, requestedSymbol: string): MarketQuote | null {
  if (!isRecord(value) || !isRecord(value.chart)) return null;
  const result = Array.isArray(value.chart.result) ? value.chart.result[0] : null;
  if (!isRecord(result) || !isRecord(result.meta)) return null;

  const meta = result.meta;
  const price = finiteNumber(meta.regularMarketPrice);
  if (price === null) return null;

  const quoteBlock = isRecord(result.indicators)
    && Array.isArray(result.indicators.quote)
    && isRecord(result.indicators.quote[0])
    ? result.indicators.quote[0]
    : null;
  const closes = quoteBlock && Array.isArray(quoteBlock.close)
    ? quoteBlock.close.flatMap((candidate) => {
      const numeric = finiteNumber(candidate);
      return numeric === null ? [] : [numeric];
    })
    : [];

  const fallbackPreviousClose = finiteNumber(meta.chartPreviousClose);
  const previousClose = closes.length >= 2
    ? closes[closes.length - 2]
    : fallbackPreviousClose;
  if (previousClose === null || previousClose <= 0) return null;

  const symbol = normalizeMarketSymbol(meta.symbol) ?? requestedSymbol;
  const name = typeof meta.longName === "string" && meta.longName.trim()
    ? meta.longName.trim()
    : typeof meta.shortName === "string" && meta.shortName.trim()
      ? meta.shortName.trim()
      : symbol;
  const currency = typeof meta.currency === "string" && meta.currency.trim()
    ? meta.currency.trim()
    : "";
  const rawPriceHint = finiteNumber(meta.priceHint);
  const priceHint = rawPriceHint === null
    ? 2
    : Math.max(0, Math.min(4, Math.round(rawPriceHint)));
  const marketTime = finiteNumber(meta.regularMarketTime);
  const change = price - previousClose;

  return {
    symbol,
    name,
    currency,
    price,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    priceHint,
    asOf: marketTime === null ? null : new Date(marketTime * 1000).toISOString(),
  };
}
