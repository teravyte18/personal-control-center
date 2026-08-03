# Notes

Notes are mutable reference documents kept separate from read-only-by-default Thoughts. They can be created directly in Notes or by organising an Inbox item as a Note.

## Storage model

Notes continue to use the existing user-scoped personal-data snapshot. No database migration or separate document store is required.

- The first non-empty line is the plain note title used by cards and navigation.
- Everything below the title remains ordinary UTF-8 text in the note description.
- Markdown is interpreted only when Preview is selected; the stored value stays readable and exportable as plain text.
- Existing notes remain valid without conversion.
- Raw HTML is not rendered. Links are limited to HTTP, HTTPS, mailto, and same-note anchors.

## Supported formatting

The editor toolbar inserts a deliberately small Markdown subset:

- bold and italic text;
- headings;
- bullet and numbered lists;
- checklists;
- links;
- block quotes;
- inline and fenced code;
- GitHub-style tables.

Tables use horizontal scrolling on narrow phones rather than shrinking cells until their contents are unreadable. This is not a full Word- or Notion-style rich-text document model.

## Autosave behaviour

There is no destructive Cancel action.

- Valid note content saves after an 800 ms pause.
- Leaving the textarea, pressing Done, pressing Escape, hiding the page, or closing the page flushes pending valid edits.
- The editor keeps its own current text while server mutations are queued, so an older response cannot move the cursor or restore stale content.
- A new note is created only after it has a valid title. An untouched empty new-note screen may close without creating a record.
- Non-empty content without a valid first-line title stays visible and the editor refuses to close until the title is corrected.
- When server persistence is unavailable, the existing personal-data fallback keeps the current snapshot on that device and the editor says so.
- Permanent deletion remains a separate confirmed action.

## Regression checks

Before merging changes to Notes, verify on a phone:

1. Create a note, type continuously, hold Backspace, and confirm there is no per-character lag.
2. Leave through Done and reopen the note immediately; the latest text should be present.
3. Background and foreground the PWA while text is pending; the latest valid note should remain.
4. Format bold text, a checklist, a link, and a table, then switch between Edit and Preview.
5. Confirm a wide table scrolls horizontally without widening the full page.
6. Confirm existing plain-text notes preview normally.
7. Disconnect the server, edit a note, and confirm the visible text is not cleared and the device-save state is shown.
8. Confirm direct Notes and Inbox-created Notes behave identically.
9. Delete a temporary note and confirm deletion still requires explicit confirmation.
