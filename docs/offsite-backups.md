# Encrypted Cloudflare R2 off-site backups

The production Raspberry Pi keeps validated local PostgreSQL dumps and paired upload archives under `data/backups`. This layer adds an independent, client-side encrypted restic repository in a private Cloudflare R2 bucket.

The off-site snapshot contains:

- the freshly created and validated PostgreSQL dump for that run;
- the raw `data/uploads` tree, including review photos and original Library book covers;
- `compose.yaml`, the production `.env`, restore scripts, and this recovery document when those files exist.

The `.secrets` directory is never selected for backup. Keep a separate offline copy of the restic password, R2 Access Key ID, R2 Secret Access Key, repository URL, token-encryption keys, and other runtime secrets needed to use restored application data. The backup cannot recover credentials required to access or decrypt itself.

## Cloudflare setup

1. Enable R2 for the Cloudflare account.
2. Create one private R2 Standard bucket, for example `personal-control-center-backups`.
3. Create an R2 API token with **Object Read & Write** permission and scope it to that bucket only.
4. Record the Access Key ID, Secret Access Key, account ID, and endpoint shown by Cloudflare.
5. Do not enable public access.
6. Do not add an R2 lifecycle policy that independently deletes restic pack, index, snapshot, or metadata objects. Restic owns repository retention.

Repository URL examples:

```text
s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>/personal-control-center
s3:https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com/<BUCKET_NAME>/personal-control-center
```

The configured region remains `auto`.

## Raspberry Pi secret files

```bash
install -d -m 700 .secrets
printf '%s' '<R2_ACCESS_KEY_ID>' > .secrets/r2-access-key-id
printf '%s' '<R2_SECRET_ACCESS_KEY>' > .secrets/r2-secret-access-key
openssl rand -base64 48 > .secrets/restic-password
chmod 600 .secrets/*
```

Copy these values to an independent password manager or secure location. Losing the restic password makes the encrypted backup unrecoverable.

## Environment configuration

```text
PCC_R2_ENABLED=1
PCC_R2_REPOSITORY=s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>/personal-control-center
PCC_R2_REGION=auto
PCC_R2_ACCESS_KEY_ID_FILE=/run/secrets/r2-access-key-id
PCC_R2_SECRET_ACCESS_KEY_FILE=/run/secrets/r2-secret-access-key
PCC_RESTIC_PASSWORD_FILE=/run/secrets/restic-password
PCC_RESTIC_HOSTNAME=personal-control-center-pi
PCC_R2_MAX_BACKUP_AGE_HOURS=36
```

Keep `.env` private with `chmod 600 .env`. Rebuild the backup image after backup-image or secret-mount changes.

## Initialise and verify

```bash
sh scripts/manage-offsite-backup.sh init
sh scripts/manage-offsite-backup.sh backup-now
sh scripts/manage-offsite-backup.sh status
sh scripts/manage-offsite-backup.sh check
```

Normal backup-service execution creates a fresh local database/upload pair and encrypted snapshot every `PCC_BACKUP_INTERVAL_HOURS` hours; production defaults to 24 hours.

The latest result is stored in `data/backups/offsite-status`. The backup health check becomes unhealthy when the latest attempt failed or the newest success is older than `PCC_R2_MAX_BACKUP_AGE_HOURS`.

## Retention and pruning

Successful snapshots retain 7 daily, 4 weekly, and 6 monthly snapshots for the configured host and `pcc-nightly` tag. Pruning runs at most once per UTC week; manual maintenance remains available:

```bash
sh scripts/manage-offsite-backup.sh prune
```

Do not configure an R2 lifecycle rule to delete restic repository objects.

## Restore preparation

```bash
sh scripts/manage-offsite-backup.sh restore-latest
```

The script restores the latest matching snapshot, validates the PostgreSQL dump, recreates a paired upload archive from the raw deduplicated upload tree, writes a ready recovery pair under `data/offsite-restore/recovery`, and prints the destructive `restore-postgres.sh` command required to apply it.

Preparation is non-destructive. Applying the printed restore requires explicit confirmation.

## Periodic clean-restore rehearsal

The initial isolated restore rehearsal succeeded. Repeat a clean rehearsal after meaningful schema, authentication, upload, Calendar, or backup changes and periodically even when the system appears healthy.

On a temporary clean Linux host or disposable VM:

1. Check out the intended release.
2. Create a production-equivalent `.env`.
3. Restore the independent `.secrets` files and required encryption keys.
4. Build the backup image and run `restore-latest`.
5. Start a clean PostgreSQL/application stack and apply the prepared pair.
6. Verify sign-in, isolation, representative Projects/Tasks/Notes/Reviews, one Review photo, one Library cover, Archive/Accomplishments, and project action timelines.
7. Confirm Calendar credentials decrypt with the recovered token key, or reconnect deliberately.
8. Record the snapshot ID and rehearsal date outside the production host.

Do not rehearse by overwriting the only live Raspberry Pi database.

## R2 usage

`status` reports the raw data represented by the latest snapshot. Cloudflare storage and request consumption remain visible in the R2 dashboard. Investigate unexpected growth before it leaves the intended usage range.
