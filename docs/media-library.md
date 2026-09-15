# Media Library — Films and Series

## Status

**Media v1 is implemented in PR #64.**

The Media space is intentionally small, phone-first, and focused on personal viewing state rather than reproducing IMDb, Letterboxd, or a streaming tracker.

## Product role

A single **Media** space contains both films and series. It records the personal signals that are useful on their own and later for the Personal Advisor:

- whether something was saved, started, completed, or dropped;
- an optional 0–10 half-step rating;
- optional personal thoughts;
- optional start and finish dates;
- lightweight current season/episode position for series.

Personal state matters more than exhaustive catalogue metadata. The app remains fully usable without an external entertainment service.

## Data model

Common fields:

- type: `Film` or `Series`;
- title;
- status: Wishlist, Watching, Completed, or Dropped;
- optional 0–10 rating using the same half-step convention as Books;
- optional personal thoughts;
- optional private poster;
- optional start date;
- optional finish date.

Series-only fields:

- optional current season;
- optional current episode.

The first version deliberately does not store actors, directors, studios, genres, runtime, release dates, streaming-provider availability, or an episode catalogue.

## Views and interaction

The default **My media** view excludes Wishlist entries so saved-for-later titles do not dominate the normal library.

Available generated views are:

- Watching;
- Completed;
- Wishlist;
- Dropped;
- Films;
- Series.

Search covers title. Cards show poster/title plus useful compact state such as type, status, rating, and series position. Add/edit uses a full-screen phone-first editor.

## Persistence and private posters

Media metadata is serialized into active `note` items using the dedicated `__pcc_media_v1__` description prefix. Normal Notes explicitly exclude those records. Reusing the authenticated personal-data snapshot means Media participates in the existing account-isolation, persistence, export/import, database backup, and restore behaviour without adding another database table.

Poster uploads are optional and stored under each user's private upload root:

```text
UPLOAD_ROOT/<user-id>/media-posters/<poster-id>
```

Uploads accept JPEG, PNG, WebP, or GIF images up to 10 MB. Display responses are authenticated, bounded to a poster-oriented display size, converted to WebP when possible, and privately cached with ETag revalidation. Replacing or deleting a poster removes the superseded upload; a newly uploaded poster is also cleaned up if saving the Media record fails.

## Recommendation value

For the future Personal Advisor, the highest-value Media signals are:

1. whether the user chose to start something;
2. whether they completed or dropped it;
3. their 0–10 rating;
4. what they wrote about it;
5. recency and current Watching state.

A personal note explaining *why* something worked or did not work is intentionally treated as more valuable than collecting a large public metadata catalogue.

Media may become an Advisor context domain only when the user explicitly enables it. Keychain remains structurally excluded from all AI context.

## Integration boundaries

Media v1:

- participates in normal export, backup, and restore;
- does not project to Google Calendar;
- does not add general offline editing;
- does not yet contribute start/finish activity to Weekly Review;
- does not perform recommendations inside the Media space itself.

Those integrations should be added only when they serve a concrete cross-space workflow.

## Explicit exclusions

Media v1 excludes:

- automatic streaming-service tracking;
- watch-history import;
- social profiles, followers, public reviews, or sharing;
- episode-by-episode history;
- automatic recommendations inside Media;
- comprehensive entertainment metadata;
- automatic poster/catalogue matching;
- Calendar projection;
- autonomous AI changes to Media records.

## Future enhancements

Only after real use demonstrates value, consider:

- external metadata lookup;
- automatic poster matching;
- genre/creator metadata for richer Advisor analysis;
- streaming availability;
- watch-history import from supported services;
- richer series progress;
- Weekly Review start/finish activity;
- recommendation shortcuts powered by the Personal Advisor.
