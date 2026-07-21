# Review photo storage

Weekly-review photos are stored as private files outside the application container and are never exposed as static public assets.

## Storage model

- The application accepts JPEG, PNG, WebP, and GIF files up to 15 MB.
- The server validates the file signature instead of trusting the browser-provided MIME type.
- Each upload receives an opaque UUID.
- Files are stored under `UPLOAD_ROOT/<user-id>/review-photos/<photo-id>`.
- The review snapshot stores the UUID in the existing `photoName` field. UUID-shaped values are durable photo references; older filename-only values remain readable as legacy metadata but do not point to a stored file.
- Photo reads and deletes require an authenticated session and are resolved only inside the current user's directory. Knowing another user's photo UUID is not sufficient to access it.
- Responses use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.

The production Compose stack maps `./data/uploads` to `/data/uploads`, so files survive application image replacement and container recreation.

## Review workflow

Selecting a photo uploads it immediately. The draft is updated with the returned UUID only after the upload succeeds.

Replacing an unfinished review photo stores the new file first and then removes the previous draft file. Completing a review moves the reference into history while leaving the file in place. A completed review photo is displayed through the authenticated photo endpoint.

## Backup sets

Every automatic or pre-deployment backup now contains a matching pair:

```text
personal-control-center-YYYYMMDDTHHMMSSZ.dump
personal-control-center-YYYYMMDDTHHMMSSZ.uploads.tar.gz
```

The `.dump` file contains PostgreSQL state. The `.uploads.tar.gz` file contains the user-scoped upload tree. Both files are validated before being promoted from temporary paths.

Create an additional pair with:

```bash
docker compose run --rm backup --once
```

Keep both files together when copying backups off the Raspberry Pi.

## Restore

Pass the database dump to the normal restore script:

```bash
sh scripts/restore-postgres.sh data/backups/personal-control-center-YYYYMMDDTHHMMSSZ.dump
```

When the matching `.uploads.tar.gz` file exists beside the dump, the script validates its paths and restores the upload tree as part of the same operation. Legacy database-only dumps remain supported, but cannot restore missing photo files.

After restoration, verify a representative review photo in addition to the health endpoint and sign-in flow.
