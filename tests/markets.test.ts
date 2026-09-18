import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMarketSymbol, parseYahooChartQuote } from "../src/domain/markets.ts";

test("market symbols are normalized for common Yahoo formats", () => {
  assert.equal(normalizeMarketSymbol(" aapl "), "AAPL");
  assert.equal(normalizeMarketSymbol("vwce.de"), "VWCE.DE");
  assert.equal(normalizeMarketSymbol("brk-b"), "BRK-B");
  assert.equal(normalizeMarketSymbol("^gspc"), "^GSPC");
  assert.equal(normalizeMarketSymbol("bad symbol"), null);
});

test("Yahoo chart responses produce current price and previous-session movement", () => {
  const quote = parseYahooChartQuote({
    chart: {
      result: [{
        meta: {
          symbol: "AAPL",
          longName: "Apple Inc.",
          currency: "USD",
          regularMarketPrice: 210,
          regularMarketTime: 1_700_000_000,
          priceHint: 2,
          chartPreviousClose: 180,
        },
        indicators: {
          quote: [{
            close: [190, 200, 210],
          }],
        },
      }],
      error: null,
    },
  }, "AAPL");

  assert.ok(quote);
  assert.equal(quote.symbol, "AAPL");
  assert.equal(quote.previousClose, 200);
  assert.equal(quote.price, 210);
  assert.equal(quote.change, 10);
  assert.equal(quote.changePercent, 5);
});

test("Yahoo parser rejects responses without usable price data", () => {
  assert.equal(parseYahooChartQuote({ chart: { result: null, error: { code: "Not Found" } } }, "NOPE"), null);
});
