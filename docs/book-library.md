# Book Library

The Library is a books-first personal reading space. It is intentionally separate from Tasks, Projects, Notes, and later general-media ideas.

## Product model

Every book has a required title and optional author, subtitle or edition note, cover, start and finish dates, and one flexible Thoughts and takeaways field.

Three independent classifications generate the Library shelves:

- reading state: Unread, Reading, Finished, Paused, or Abandoned;
- ownership: Unspecified, Owned, Borrowed, or Wishlist;
- priority: None, Up next, Soon, or Later.

This permits combinations such as Owned + Unread + Up next or Wishlist + Unread + Later without duplicating records.

Ratings are optional half-step values from 0 to 5 for Enjoyment, Impact, and Execution. The displayed aggregate uses whichever dimensions are filled. An optional overall override can replace the displayed result while preserving the dimensions. Zero is a real rating and remains distinct from Unrated.

Start and finish dates are optional historical context. Selecting Finished supplies today as a convenient finish date only when the field is empty; the value can immediately be changed or cleared.

## Persistence

The first Library implementation reuses the existing revisioned user-scoped personal-data snapshot. A book is distinguished from a normal Note by a versioned Library payload in its description field. This avoids a database migration while preserving normal server mutations, browser fallback, import, export, R2 snapshots, and restore compatibility.

Private cover files are stored under:

```text
UPLOAD_ROOT/<user-id>/book-covers/<cover-id>
```

Retrieval and deletion require the authenticated owner. JPEG, PNG, WebP, and GIF files up to 10 MB are accepted. The existing raw upload-tree backup and restore path includes the `book-covers` directory alongside review photos.

## Manual acceptance

Deploy the draft branch to the Raspberry Pi before merging and test from the installed phone PWA.

1. Open Library from All Spaces and optionally pin it to mobile quick access.
2. Create an Owned + Unread + Up next book with title and author.
3. Confirm it appears in All books, Up next, and Owned unread without duplicate records.
4. Add two more Up next books, move them earlier and later, refresh, and confirm the ordering persists.
5. Search by title and author; exercise reading-state, ownership, priority, and minimum-score filters.
6. Mark a book Reading and verify the Reading shelf. Add or clear its optional start date.
7. Mark a book Finished. Confirm today is suggested, then edit or clear the finish date.
8. Enter zero for one rating, leave another Unrated, fill another dimension, and verify the aggregate. Add and remove an overall override.
9. Add Thoughts and takeaways, save, reopen, and confirm the text persists.
10. Upload a supported cover, refresh, replace it, remove it, and confirm the book remains usable without a cover.
11. Capture a title in Inbox, organise it as Book, and confirm Extra context becomes its initial Thoughts and takeaways.
12. Confirm books do not appear in Notes or Thoughts.
13. Give a book a start or finish date inside the current review period and confirm it appears in the matching Weekly Review panel.
14. With a second account when convenient, confirm a copied cover URL cannot retrieve the other account's file.
15. Run the normal local and off-site backup status checks after adding a cover; cover restore can be included in the next representative restore rehearsal.

## Initial boundaries

The first slice does not add ISBN scanning, third-party metadata lookup, page progress, quotes and highlights, lending workflows, social activity, AI summaries, recommendations, or other media types.
