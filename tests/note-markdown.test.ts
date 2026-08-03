import assert from "node:assert/strict";
import test from "node:test";
import {
  parseInlineMarkdown,
  parseNoteMarkdown,
  safeMarkdownHref,
} from "../src/domain/note-markdown.ts";

test("parses bold, italic, code, and safe links without accepting script URLs", () => {
  const nodes = parseInlineMarkdown("Use **bold**, *italics*, `code`, and [docs](https://example.com).");
  assert.deepEqual(nodes.map((node) => node.type), [
    "text",
    "bold",
    "text",
    "italic",
    "text",
    "code",
    "text",
    "link",
    "text",
  ]);
  assert.equal(safeMarkdownHref("https://example.com"), "https://example.com");
  assert.equal(safeMarkdownHref("mailto:test@example.com"), "mailto:test@example.com");
  assert.equal(safeMarkdownHref("javascript:alert(1)"), "");
});

test("parses headings, checklists, ordered lists, quotes, and code blocks", () => {
  const blocks = parseNoteMarkdown([
    "## Plan",
    "",
    "- [x] First step",
    "- [ ] Second step",
    "",
    "1. One",
    "2. Two",
    "",
    "> Keep this in mind",
    "",
    "```ts",
    "const ready = true;",
    "```",
  ].join("\n"));

  assert.deepEqual(blocks.map((block) => block.type), ["heading", "list", "list", "quote", "code"]);
  const checklist = blocks[1];
  assert.equal(checklist.type, "list");
  if (checklist.type === "list") assert.deepEqual(checklist.items.map((item) => item.checked), [true, false]);
});

test("parses GitHub-style tables and fills missing cells safely", () => {
  const blocks = parseNoteMarkdown([
    "| Item | Status |",
    "| --- | --- |",
    "| Materials | Pending |",
    "| Booking |",
  ].join("\n"));

  assert.equal(blocks.length, 1);
  const table = blocks[0];
  assert.equal(table.type, "table");
  if (table.type !== "table") return;
  assert.equal(table.headers.length, 2);
  assert.equal(table.rows.length, 2);
  assert.deepEqual(table.rows[1][1], []);
});
