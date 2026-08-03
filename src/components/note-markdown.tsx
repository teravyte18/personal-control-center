import type { ReactNode } from "react";
import {
  parseNoteMarkdown,
  safeMarkdownHref,
  type MarkdownInline,
} from "@/domain/note-markdown";

export function NoteMarkdown({ value }: { value: string }) {
  const blocks = parseNoteMarkdown(value);
  if (blocks.length === 0) {
    return <p className="text-sm text-slate-400">Nothing written below the title yet.</p>;
  }

  return (
    <div className="space-y-4 text-base leading-7 text-slate-800">
      {blocks.map((block, blockIndex) => {
        const key = `${block.type}-${blockIndex}`;
        if (block.type === "heading") {
          const content = renderInline(block.content, key);
          if (block.level === 1) return <h2 key={key} className="pt-2 text-2xl font-semibold tracking-tight text-slate-950">{content}</h2>;
          if (block.level === 2) return <h3 key={key} className="pt-2 text-xl font-semibold text-slate-950">{content}</h3>;
          return <h4 key={key} className="pt-1 text-lg font-semibold text-slate-900">{content}</h4>;
        }
        if (block.type === "paragraph") {
          return <p key={key} className="whitespace-pre-wrap">{renderInline(block.content, key)}</p>;
        }
        if (block.type === "quote") {
          return <blockquote key={key} className="border-l-4 border-slate-300 pl-4 italic text-slate-600">{renderInline(block.content, key)}</blockquote>;
        }
        if (block.type === "code") {
          return (
            <pre key={key} className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-white">
              <code>{block.value}</code>
            </pre>
          );
        }
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={key} className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-2 pl-6`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`} className={item.checked === null ? "pl-1" : "list-none -ml-5 flex gap-2"}>
                  {item.checked === null ? null : (
                    <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-400 text-xs font-bold">
                      {item.checked ? "✓" : ""}
                    </span>
                  )}
                  <span>{renderInline(item.content, `${key}-${itemIndex}`)}</span>
                </li>
              ))}
            </Tag>
          );
        }

        return (
          <div key={key} className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  {block.headers.map((header, cellIndex) => (
                    <th key={`${key}-header-${cellIndex}`} className="border-b border-r border-slate-200 px-3 py-2.5 font-semibold last:border-r-0">
                      {renderInline(header, `${key}-header-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${key}-row-${rowIndex}`} className="border-b border-slate-200 last:border-b-0">
                    {row.map((cell, cellIndex) => (
                      <td key={`${key}-${rowIndex}-${cellIndex}`} className="border-r border-slate-200 px-3 py-2.5 align-top last:border-r-0">
                        {renderInline(cell, `${key}-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function renderInline(nodes: MarkdownInline[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-inline-${index}`;
    if (node.type === "text") return node.value;
    if (node.type === "bold") return <strong key={key} className="font-semibold text-slate-950">{renderInline(node.children, key)}</strong>;
    if (node.type === "italic") return <em key={key}>{renderInline(node.children, key)}</em>;
    if (node.type === "code") return <code key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-900">{node.value}</code>;

    const href = safeMarkdownHref(node.href);
    if (!href) return <span key={key}>{renderInline(node.children, key)}</span>;
    return (
      <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="font-medium underline decoration-slate-400 underline-offset-4">
        {renderInline(node.children, key)}
      </a>
    );
  });
}
