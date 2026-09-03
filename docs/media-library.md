# Media Library — Films and Series

## Decision

Add a dedicated **Media** space for films and series before introducing the Personal Advisor. The purpose is not to reproduce IMDb, Letterboxd, or a streaming tracker; it is to capture enough personal viewing history and reflection that the system can understand preferences alongside the existing Book Library.

The first version should stay intentionally small, phone-first, and aligned with the Book Library patterns that have already proven useful.

## User problem

Films and series currently live outside Personal Control Center, so the system cannot answer basic questions such as what has already been watched, what is on the watchlist, what was liked or disliked, or what kind of recommendation fits prior taste.

This also leaves an important gap for a future Personal Advisor: recommendations are much better when they can use explicit personal ratings, completion state, and comments rather than generic genre metadata alone.

## Product role

Media is a separate domain from Books but follows the same philosophy:

- personal state matters more than exhaustive catalogue metadata;
- finishing, abandoning, rating, and reflecting are useful signals;
- the app remains fully usable without external metadata services;
- recommendations should later be grounded in the user's own stored history rather than only public popularity data.

A single **Media** space contains both films and series instead of creating separate top-level destinations.

## Proposed first-version model

Common fields:

- type: `Film` or `Series`;
- title;
- status: Wishlist, Watching, Completed, or Dropped;
- optional 0–10 rating using the same half-step convention as Books;
- optional personal thoughts/takeaways;
- optional poster image;
- optional start date;
- optional finish date.

Series-only fields:

- optional current season;
- optional current episode.

The first version does not need actors, directors, studios, genres, runtime, release dates, streaming-provider availability, episode catalogues, or other large external metadata sets. Those may be added later only when a concrete workflow needs them.

## Views and interaction

The default view should emphasize media the user is actually engaging with rather than the Wishlist.

Likely generated views:

- Watching;
- Completed;
- Wishlist;
- Dropped;
- Films;
- Series.

Search should cover title. Filters should remain compact and expandable on phone, consistent with the Book Library.

Creating and editing a record should remain possible without any third-party service. Poster upload is optional and must use the existing private user-scoped upload boundary if implemented through the same storage pipeline as book covers.

## Recommendation value

For a future Personal Advisor, the highest-value signals are:

1. whether the user chose to start something;
2. whether they completed or dropped it;
3. their 0–10 rating;
4. what they wrote about it;
5. recency and current watching state.

This is deliberately more important than collecting exhaustive public metadata. For example, a personal note explaining *why* a series was enjoyable is a stronger recommendation signal than a long list of cast members.

## Persistence and integration boundaries

- Media records are normal authenticated user-scoped application data.
- They should participate in normal export, backup, and restore flows.
- They do not need Google Calendar projection in the first version.
- They do not need offline editing beyond whatever generic application support exists at implementation time.
- They may later contribute dated start/finish activity to Weekly Review, but that is not required to ship the first useful slice.
- Media data may be made available to the Personal Advisor only when the user enables that data domain for AI use.

## Acceptance criteria for the first slice

- Films and series can coexist in one Media space without duplicate top-level navigation.
- A user can add, edit, rate, complete, drop, and wishlist media without external services.
- Series can retain lightweight current season/episode progress.
- The default view does not become dominated by Wishlist entries.
- Ratings and personal comments remain easy to inspect and edit.
- Records remain isolated per authenticated user and survive export/backup/restore.
- The implementation does not require a public catalogue or recommendation API.

## Explicit exclusions

The first version excludes:

- automatic streaming-service tracking;
- watch-history import;
- social profiles, followers, public reviews, or sharing;
- episode-by-episode history;
- automatic recommendations inside the Media slice itself;
- comprehensive entertainment metadata;
- automatic poster/catalogue matching;
- Calendar projection;
- autonomous AI changes to Media records.

## Future enhancements

Only after real use demonstrates value, consider:

- external metadata lookup;
- automatic poster matching;
- genre/creator metadata for richer analysis;
- streaming availability;
- watch-history import from supported services;
- richer series progress;
- recommendation shortcuts powered by the Personal Advisor.
