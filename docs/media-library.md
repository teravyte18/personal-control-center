# Library — Books, Movies, and Series

## Status

**Media v1 is implemented in PR #64 as an extension of the existing Library space.**

There is no separate top-level Media destination. Library is the umbrella for three first-level shelves:

- **Books**;
- **Movies**;
- **Series**.

The underlying Book and Media records remain separate domain models. The unification is a navigation and browsing decision, not an attempt to force books, films, and series into one generic schema.

## Product role

Library is the place for personal media history, saved-for-later items, ratings, progress, and reflections. Each shelf keeps the concepts that are useful for that medium while sharing one top-level destination so All Spaces and mobile quick access do not become crowded.

The three shelves intentionally have independent browsing state. A Book Wishlist is not mixed with a Movie Wishlist or Series Wishlist.

## Books

The existing Books shelf keeps its current model and views, including:

- My library / Owned;
- Currently reading;
- Up next;
- Owned unread;
- Wishlist;
- Finished;
- Paused / abandoned;
- ownership, priority, ratings, dates, notes, and private covers.

See [`book-library.md`](book-library.md) for the detailed Books model.

## Movies

Movie records support:

- Wishlist, Watching, Completed, or Dropped status;
- optional 0–10 half-step rating;
- optional personal thoughts;
- optional single **Watched on** date;
- optional private poster.

A movie deliberately does not track separate start and finish dates. Most films are watched in one sitting, and preserving a single approximate viewing date is enough for personal history even when a film is finished a few days after it was started.

Movie browsing includes My movies, Watching, Completed, Wishlist, and Dropped. Search is title-based.

## Series

Series records support:

- Wishlist, Watching, Completed, or Dropped status;
- optional 0–10 half-step rating;
- optional personal thoughts;
- optional start and finish dates;
- optional private poster;
- optional current season;
- optional current episode.

The Series shelf opens on **Watching** by default because resume position is one of its highest-value day-to-day uses. Watching cards surface the saved position as `Resume: Sx · Ex`, and the editor provides an explicit **Where are you?** section for season and episode. This is intended to preserve progress across long breaks or services that do not reliably remember it.

Series browsing includes Watching, My series, Completed, Wishlist, and Dropped. Search is title-based.

## Persistence

Movie and Series metadata is serialized into active `note` items using the dedicated `__pcc_media_v1__` description prefix. Normal Notes explicitly exclude these records.

Reusing the authenticated personal-data snapshot means Movie and Series records inherit the existing:

- per-user isolation;
- multi-device persistence;
- export/import behaviour;
- PostgreSQL backup and restore behaviour.

No additional database table is required for Media v1.

The Movie model also accepts the earlier PR's temporary start/finish-date representation when parsing and converts the available value into `watchedDate`, so the v1 schema remains tolerant while the feature is being finalized.

## Private posters

Optional Movie and Series posters are stored under each user's private upload root:

```text
UPLOAD_ROOT/<user-id>/media-posters/<poster-id>
```

Uploads accept JPEG, PNG, WebP, or GIF images up to 10 MB. Display responses are authenticated, resized to a bounded poster-oriented display size, converted to WebP when possible, and privately cached with ETag revalidation.

Replacing or deleting a poster removes the superseded upload. If a new poster upload succeeds but saving the record fails, the unused upload is cleaned up.

## Navigation boundary

Only **Library** appears in All Spaces, desktop navigation, and mobile quick-access configuration. The Books, Movies, and Series selectors live inside Library.

The former `/media` route redirects to the Movies shelf for compatibility; it is not a separate product space.

## Recommendation and integration value

For a future Personal Advisor, the useful Movie/Series signals are:

1. whether something was wishlisted, started, completed, or dropped;
2. 0–10 rating;
3. personal thoughts;
4. recency and current Watching state;
5. Series resume position where relevant.

A personal explanation of why something worked or did not work is more valuable than collecting exhaustive public catalogue metadata. Historical completeness is not required: the Advisor should remain useful when the user records only current and future viewing rather than backfilling everything previously watched.

Media data may become an Advisor context domain only when explicitly enabled. Keychain remains structurally excluded from AI context.

## Current integration boundaries

Media v1:

- participates in normal export, backup, and restore;
- does not project to Google Calendar;
- does not add general offline editing;
- does not yet contribute viewing activity to Weekly Review;
- does not perform recommendations inside Library itself.

Those integrations should be added only when they support a concrete cross-space workflow.

## Explicit exclusions

Media v1 excludes:

- external entertainment catalogues as a runtime dependency;
- automatic metadata or poster matching;
- streaming-service tracking or availability;
- watch-history import;
- episode-by-episode history;
- social profiles, public reviews, or sharing;
- exhaustive cast/crew/genre metadata;
- Calendar projection;
- autonomous AI changes to Library records.

## Future enhancements

Only after real use demonstrates value, consider:

- optional external metadata lookup;
- automatic poster matching;
- genre/creator metadata for richer Advisor analysis;
- streaming availability;
- watch-history import from supported services;
- richer Series progress if season/episode is insufficient;
- Weekly Review viewing activity;
- recommendation shortcuts powered by the Personal Advisor.
