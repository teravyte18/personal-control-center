export type MarkdownInline =
  | { type: "text"; value: string }
  | { type: "bold"; children: MarkdownInline[] }
  | { type: "italic"; children: MarkdownInline[] }
  | { type: "code"; value: string }
  | { type: "link"; children: MarkdownInline[]; href: string };

export type MarkdownListItem = {
  content: MarkdownInline[];
  checked: boolean | null;
  children: MarkdownList[];
};

export type MarkdownList = {
  type: "list";
  ordered: boolean;
  items: MarkdownListItem[];
};

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: MarkdownInline[] }
  | { type: "paragraph"; content: MarkdownInline[] }
  | { type: "quote"; content: MarkdownInline[] }
  | { type: "code"; value: string; language: string }
  | MarkdownList
  | { type: "table"; headers: MarkdownInline[][]; rows: MarkdownInline[][][] };

const INLINE_PATTERN = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*\n]+)\*)/g;
const TABLE_DIVIDER_CELL = /^:?-{3,}:?$/;
const LIST_LINE_PATTERN = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

export function parseInlineMarkdown(value: string): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  let cursor = 0;
  INLINE_PATTERN.lastIndex = 0;

  for (const match of value.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", value: value.slice(cursor, index) });

    if (match[2] !== undefined) {
      nodes.push({ type: "bold", children: parseInlineMarkdown(match[2]) });
    } else if (match[3] !== undefined) {
      nodes.push({ type: "code", value: match[3] });
    } else if (match[4] !== undefined && match[5] !== undefined) {
      nodes.push({
        type: "link",
        children: parseInlineMarkdown(match[4]),
        href: match[5].trim(),
      });
    } else if (match[6] !== undefined) {
      nodes.push({ type: "italic", children: parseInlineMarkdown(match[6]) });
    }

    cursor = index + match[0].length;
  }

  if (cursor < value.length) nodes.push({ type: "text", value: value.slice(cursor) });
  return nodes;
}

export function safeMarkdownHref(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("#")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? trimmed : "";
  } catch {
    return "";
  }
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_DIVIDER_CELL.test(cell));
}

function matchListLine(line: string) {
  const match = line.match(LIST_LINE_PATTERN);
  if (!match) return null;
  return {
    indent: match[1].length,
    marker: match[2],
    raw: match[3],
  };
}

function parseList(lines: string[], startIndex: number, indent: number): { list: MarkdownList; index: number } | null {
  const first = matchListLine(lines[startIndex] ?? "");
  if (!first || first.indent !== indent) return null;

  const ordered = /^\d+\.$/.test(first.marker);
  const items: MarkdownListItem[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const current = matchListLine(lines[index]);
    if (!current || current.indent !== indent || /^\d+\.$/.test(current.marker) !== ordered) break;

    const checkbox = current.raw.match(/^\[([ xX])\]\s+(.*)$/);
    const item: MarkdownListItem = {
      checked: checkbox ? checkbox[1].toLowerCase() === "x" : null,
      content: parseInlineMarkdown(checkbox ? checkbox[2] : current.raw),
      children: [],
    };
    index += 1;

    while (index < lines.length) {
      const nested = matchListLine(lines[index]);
      if (!nested || nested.indent !== indent + 2) break;
      const child = parseList(lines, index, indent + 2);
      if (!child) break;
      item.children.push(child.list);
      index = child.index;
    }

    items.push(item);
  }

  return { list: { type: "list", ordered, items }, index };
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  if (!line.trim()) return true;
  if (/^```/.test(line) || /^(#{1,3})\s+/.test(line) || /^>\s?/.test(line)) return true;
  const listLine = matchListLine(line);
  if (listLine?.indent === 0) return true;
  return line.includes("|") && isTableDivider(lines[index + 1] ?? "");
}

export function parseNoteMarkdown(value: string): MarkdownBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([^\s`]*)\s*$/);
    if (fence) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", value: code.join("\n"), language: fence[1] ?? "" });
      continue;
    }

    if (line.includes("|") && isTableDivider(lines[index + 1] ?? "")) {
      const headers = splitTableRow(line).map(parseInlineMarkdown);
      const rows: MarkdownInline[][][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        const cells = splitTableRow(lines[index]);
        rows.push(headers.map((_, cellIndex) => parseInlineMarkdown(cells[cellIndex] ?? "")));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: parseInlineMarkdown(heading[2]),
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", content: parseInlineMarkdown(quote.join(" ")) });
      continue;
    }

    const listLine = matchListLine(line);
    if (listLine?.indent === 0) {
      const parsed = parseList(lines, index, 0);
      if (parsed) {
        blocks.push(parsed.list);
        index = parsed.index;
        continue;
      }
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", content: parseInlineMarkdown(paragraph.join("\n")) });
  }

  return blocks;
}
