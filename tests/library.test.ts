import assert from "node:assert/strict";
import test from "node:test";
import {
  bookMatchesShelf,
  createBookDetails,
  dateWithinPeriod,
  getBookScore,
  getBooks,
  isBookItem,
  parseBookDetails,
  reorderUpNext,
  serializeBookDetails,
  sortBooksForShelf,
} from "../src/domain/library.ts";
import type { Item } from "../src/domain/personal-data.ts";

function item(id: string, description: string, overrides: Partial<Item> = {}): Item {
  return {
    id,
    title: `Book ${id}`,
    description,
    actions: [],
    kind: "note",
    status: "active",
    area: "personal",
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

test("serializes and normalizes book details without confusing normal notes", () => {
  const details = {
    ...createBookDetails("Useful reflection"),
    author: "Author",
    readingState: "finished" as const,
    finishDate: "2026-07-30",
    ratings: { enjoyment: 9.5, impact: 11, execution: 0 },
  };
  const description = serializeBookDetails(details);
  const parsed = parseBookDetails(description);
  assert.ok(parsed);
  assert.equal(parsed.author, "Author");
  assert.equal(parsed.ratings.enjoyment, 9.5);
  assert.equal(parsed.ratings.impact, undefined);
  assert.equal(parsed.ratings.execution, 0);
  assert.equal(parseBookDetails("Normal note body"), null);
  assert.equal(isBookItem(item("one", description)), true);
  assert.equal(isBookItem(item("note", "Normal note body")), false);
});

test("migrates legacy five-point ratings to the ten-point scale", () => {
  const legacyDescription = `__pcc_book_v1__\n${JSON.stringify({
    ...createBookDetails(),
    ratings: { enjoyment: 4.5, impact: 2, execution: 0, overallOverride: 5 },
  })}`;
  const migrated = parseBookDetails(legacyDescription);
  assert.ok(migrated);
  assert.deepEqual(migrated.ratings, {
    enjoyment: 9,
    impact: 4,
    execution: 0,
    overallOverride: 10,
  });
  assert.match(serializeBookDetails(migrated), /^__pcc_book_v2__\n/);
});

test("keeps zero ratings distinct from unrated and honors an overall override", () => {
  const details = createBookDetails();
  assert.equal(getBookScore(details), undefined);
  details.ratings.enjoyment = 0;
  details.ratings.impact = 8;
  assert.equal(getBookScore(details), 4);
  details.ratings.overallOverride = 10;
  assert.equal(getBookScore(details), 10);
});

test("keeps wishlist books isolated from normal library shelves", () => {
  const upNext = { ...createBookDetails(), ownership: "owned" as const, priority: "up-next" as const, upNextOrder: 2 };
  const reading = { ...createBookDetails(), readingState: "reading" as const, ownership: "borrowed" as const };
  const finishedWishlist = { ...createBookDetails(), readingState: "finished" as const, ownership: "wishlist" as const };
  const books = getBooks([
    item("up-next", serializeBookDetails(upNext)),
    item("reading", serializeBookDetails(reading)),
    item("finished", serializeBookDetails(finishedWishlist)),
    item("normal-note", "not a book"),
    item("archived", serializeBookDetails(createBookDetails()), { status: "archived" }),
  ]);
  assert.equal(books.length, 3);
  assert.equal(bookMatchesShelf(books[0], "owned"), true);
  assert.equal(bookMatchesShelf(books[0], "owned-unread"), true);
  assert.deepEqual(sortBooksForShelf(books, "reading").map((book) => book.item.id), ["reading"]);
  assert.deepEqual(sortBooksForShelf(books, "wishlist").map((book) => book.item.id), ["finished"]);
  assert.deepEqual(sortBooksForShelf(books, "finished").map((book) => book.item.id), []);
  assert.deepEqual(sortBooksForShelf(books, "all").map((book) => book.item.id), ["reading", "up-next"]);
  assert.deepEqual(sortBooksForShelf(books, "up-next").map((book) => book.item.id), ["up-next"]);
});

test("owned shelf sorts rated books high to low and leaves unrated books in title order", () => {
  const high = { ...createBookDetails(), ownership: "owned" as const, ratings: { overallOverride: 9 } };
  const low = { ...createBookDetails(), ownership: "owned" as const, ratings: { overallOverride: 6.5 } };
  const unrated = { ...createBookDetails(), ownership: "owned" as const };
  const wishlist = { ...createBookDetails(), ownership: "wishlist" as const, ratings: { overallOverride: 10 } };
  const books = getBooks([
    item("z-unrated", serializeBookDetails(unrated), { title: "Zeta" }),
    item("low", serializeBookDetails(low), { title: "Beta" }),
    item("a-unrated", serializeBookDetails(unrated), { title: "Alpha" }),
    item("high", serializeBookDetails(high), { title: "Gamma" }),
    item("wishlist", serializeBookDetails(wishlist), { title: "Wishlist" }),
  ]);

  assert.deepEqual(sortBooksForShelf(books, "owned").map((book) => book.item.id), [
    "high",
    "low",
    "a-unrated",
    "z-unrated",
  ]);
});

test("reorders the up-next queue with persistent numeric positions", () => {
  const books = [1, 2, 3].map((order) => item(String(order), serializeBookDetails({
    ...createBookDetails(),
    priority: "up-next",
    upNextOrder: order,
  })));
  const reordered = reorderUpNext(getBooks(books), "3", -1);
  assert.deepEqual(reordered.map((book) => book.item.id), ["1", "3", "2"]);
  assert.deepEqual(reordered.map((book) => book.details.upNextOrder), [1, 2, 3]);
  assert.deepEqual(reorderUpNext(getBooks(books), "1", -1), []);
});

test("matches optional dates against review periods", () => {
  assert.equal(dateWithinPeriod("2026-07-25", "2026-07-25", "2026-07-31"), true);
  assert.equal(dateWithinPeriod("", "2026-07-25", "2026-07-25"), false);
  assert.equal(dateWithinPeriod("2026-08-01", "2026-07-25", "2026-07-31"), false);
});
