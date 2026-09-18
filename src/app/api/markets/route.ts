import { normalizeMarketSymbol } from "@/domain/markets";
import {
  addMarketWatchlistSymbol,
  fetchMarketQuote,
  fetchMarketQuotes,
  loadMarketWatchlist,
  MarketDataUnavailableError,
  MarketSymbolNotFoundError,
  MarketWatchlistLimitError,
  removeMarketWatchlistSymbol,
} from "@/server/markets";
import { AuthenticationRequiredError, resolveRequestUser } from "@/server/request-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}

async function readSymbol(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  return normalizeMarketSymbol((body as Record<string, unknown>).symbol);
}

export async function GET(request: Request) {
  try {
    const user = await resolveRequestUser(request);
    const symbols = await loadMarketWatchlist(user.id);
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    const quotes = await fetchMarketQuotes(symbols, force);
    return json({ symbols, quotes, fetchedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    console.error("Could not load Markets watchlist.", error);
    return json({ error: "Markets could not be loaded." }, 503);
  }
}

export async function POST(request: Request) {
  const symbol = await readSymbol(request);
  if (!symbol) return json({ error: "Enter a valid ticker symbol." }, 400);

  try {
    const user = await resolveRequestUser(request);
    const quote = await fetchMarketQuote(symbol, true);
    await addMarketWatchlistSymbol(user.id, quote.symbol);
    return json({ symbol: quote.symbol, quote }, 201);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    if (error instanceof MarketSymbolNotFoundError) return json({ error: error.message }, 404);
    if (error instanceof MarketWatchlistLimitError) return json({ error: error.message }, 409);
    if (error instanceof MarketDataUnavailableError) return json({ error: error.message }, 503);
    console.error("Could not add Markets watchlist symbol.", error);
    return json({ error: "Ticker could not be added." }, 503);
  }
}

export async function DELETE(request: Request) {
  const symbol = await readSymbol(request);
  if (!symbol) return json({ error: "Enter a valid ticker symbol." }, 400);

  try {
    const user = await resolveRequestUser(request);
    await removeMarketWatchlistSymbol(user.id, symbol);
    return json({ removed: symbol });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return json({ error: error.message }, 401);
    console.error("Could not remove Markets watchlist symbol.", error);
    return json({ error: "Ticker could not be removed." }, 503);
  }
}
