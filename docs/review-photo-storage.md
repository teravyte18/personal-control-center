# Private upload storage

This file keeps its original name for stable links, but it now documents both Weekly Review photos and Library book covers.

Private uploads live outside the application container and are never exposed as unauthenticated static assets.

## Shared storage boundary

The production Compose stack maps:

```text
./data/uploads -> /data/uploads
```

The application receives `/data/uploads` as `UPLOAD_ROOT`, so files survive image replacement and container recreation.

Every file operation requires an authenticated session, resolves only inside the current user's directory, uses a server-generated opaque UUID, validates size and file signature, returns `X-Content-Type-Options: nosniff`, and stores only the opaque reference in the personal-data snapshot. Knowing another user's UUID is insufficient to retrieve or delete their file.

## Review photos

- Accepted formats: JPEG, PNG, WebP, and GIF.
- Maximum size: 15 MB.
- Storage path:

  ```text
  UPLOAD_ROOT/<user-id>/review-photos/<photo-id>
  ```

- The review snapshot stores the UUID in the existing `photoName` field.
- Older filename-only values remain readable as legacy metadata but do not point to a stored file.

Selecting a photo uploads it immediately. The draft receives the UUID only after success. Replacing an unfinished photo stores the new file first and then removes the previous draft file. Completing a review moves the reference into history while leaving the file in place.

The original upload remains unchanged for backup and restore. Authenticated history delivery rotates according to metadata, fits inside 1280 × 1280 without enlargement, encodes WebP at quality 84, falls back to the original when optimisation fails, and uses private one-day caching, a seven-day stale-while-revalidate window, and ETag revalidation.

Display variants are generated in memory rather than stored as a second persistent file set. A matching ETag is handled before image conversion, so normal revalidation does not repeat the optimisation work.

## Library book covers

- Accepted formats: JPEG, PNG, WebP, and GIF.
- Maximum size: 10 MB.
- Storage path:

  ```text
  UPLOAD_ROOT/<user-id>/book-covers/<cover-id>
  ```

The original upload remains unchanged for backup and restore.

Authenticated display delivery rotates according to metadata, fits inside 900 × 1350 without enlargement, encodes WebP at quality 84, falls back to the original when optimisation fails, and uses private one-day caching, a seven-day stale-while-revalidate window, and ETag revalidation.

Display variants are not stored as a second persistent file set. The original upload tree remains the recovery source.

## Backup sets

Every automatic or pre-deployment local backup contains a matching pair:

```text
personal-control-center-YYYYMMDDTHHMMSSZ.dump
personal-control-center-YYYYMMDDTHHMMSSZ.uploads.tar.gz
```

The dump contains PostgreSQL state. The upload archive contains the complete user-scoped upload tree, including review photos and original book covers. Both files are validated before promotion from temporary paths.

Create another pair with:

```bash
docker compose exec -T backup /bin/sh /usr/local/bin/pcc-backup --once
```

Keep both files together. Off-site restic snapshots include the raw upload tree directly so unchanged files deduplicate across runs.

## Restore

```bash
sh scripts/restore-postgres.sh data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

When the matching upload archive exists beside the dump, the script validates its paths and restores the upload tree as part of the same operation. Legacy database-only dumps remain supported but cannot restore missing files.

After restoration, verify health/sign-in, one Review photo, one Library cover, cross-user file isolation, and replacement/removal of a temporary upload.
