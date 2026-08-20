# Book Library

**Status: delivered in PR #32, with cover-delivery performance improvements in PR #35.**

The Library is a books-first personal reading space. It is intentionally separate from Tasks, Projects, Notes, Thoughts, and later general-media ideas.

## Product model

Every book has a required title and optional author, edition note, cover, start/finish dates, and one flexible Thoughts and takeaways field.

Three independent classifications generate useful views:

- reading state: Unread, Reading, Finished, Paused, or Abandoned;
- ownership: Unspecified, Owned, Borrowed, or Wishlist;
- priority: None, Up next, Soon, or Later.

Ratings are optional half-step values from 0 to 10 for Enjoyment, Impact, and Execution. The aggregate uses whichever dimensions are filled; an optional overall override preserves the dimensions. Zero remains distinct from Unrated. Legacy 0-to-5 ratings are read at twice their stored value and written to the version 2 Library payload on the book's next save.

Dates are optional historical context. Selecting Finished supplies today only when the finish date is empty, and the value can be changed or cleared.

## Library navigation

The compact interface includes one View selector for All books, Currently reading, Up next, Owned unread, Wishlist, Finished, and Paused/abandoned; visible title/author search; expandable detailed filters with an active count; a current-view heading and result count; a responsive cover grid; and persistent earlier/later controls for Up next ordering.

Changing a book's properties moves it between generated views immediately without duplicating records.

## Persistence

The Library reuses the revisioned user-scoped personal-data snapshot. A versioned Library payload distinguishes a Book from a normal Note, avoiding a database migration while preserving server mutations, browser fallback, import, export, backups, and restore compatibility. Books are excluded from normal Notes and Thoughts views.

## Private covers

Original covers are stored under:

```text
UPLOAD_ROOT/<user-id>/book-covers/<cover-id>
```

Retrieval and deletion require the authenticated owner. JPEG, PNG, WebP, and GIF files up to 10 MB are accepted after signature validation. Original uploads remain unchanged and participate in local upload archives, R2/restic snapshots, and restore.

### Display delivery

The authenticated endpoint rotates according to metadata, fits inside 900 × 1350 without enlargement, encodes WebP at quality 84, and falls back to the original when optimisation fails. It returns private one-day caching, a seven-day stale-while-revalidate window, and ETag support so reopening Library avoids repeatedly transferring the original phone photo.

Display derivatives are generated in memory rather than persisted as a second recovery set.

## Weekly Review and Calendar

A book appears in generated Review context when its optional start or finish date falls inside the reviewed period. Missing dates remain valid. Books do not create Google Calendar entries.

## Regression checklist

1. Create an Owned + Unread + Up next book and confirm it appears in the expected generated views without duplicates.
2. Reorder several Up next books, refresh, and confirm persistence.
3. Search by title/author and exercise detailed filters.
4. Move a book through Reading and Finished, including editable/clearable optional dates.
5. Verify zero versus Unrated ratings, aggregate calculation, and overall override.
6. Save and reopen Thoughts and takeaways.
7. Upload, cache, replace, remove, back up, and restore a cover.
8. Organise an Inbox capture as Book and confirm context becomes initial takeaways.
9. Confirm Books remain absent from Notes and Thoughts.
10. Confirm dated reading activity appears in the correct Review period.
11. Confirm cross-account cover URLs remain inaccessible.

## Current boundaries

The delivered Library does not include ISBN/barcode scanning, third-party metadata lookup, page progress, reading timers, highlights, ebook ingestion, detailed lending, social activity, AI summaries/recommendations, or other media types.

Issue #33 tracks possible photo-assisted title/author prefilling after manual use demonstrates enough recurring friction.
