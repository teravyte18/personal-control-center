# Encrypted Cloudflare R2 off-site backups

The production Raspberry Pi keeps validated local PostgreSQL dumps and paired upload archives under `data/backups`. This layer adds an independent, client-side encrypted restic repository in a private Cloudflare R2 bucket.

The off-site snapshot contains:

- the freshly created and validated PostgreSQL dump for that run;
- the raw `data/uploads` tree, allowing restic to deduplicate unchanged photos;
- `compose.yaml`, the production `.env`, restore scripts, and this recovery document when those files exist.

The `.secrets` directory is never selected for backup. Keep a separate offline copy of the restic password, R2 Access Key ID, R2 Secret Access Key, repository URL, and the repository itself. The backup cannot recover the credentials required to access itself.

## Cloudflare setup

1. Enable R2 for the Cloudflare account.
2. Create one private R2 Standard bucket, for example `personal-control-center-backups`.
3. Create an R2 API token with **Object Read & Write** permission and scope it to that bucket only.
4. Record the Access Key ID, Secret Access Key, account ID, and endpoint shown by Cloudflare. The secret is displayed only once.
5. Do not enable public access.
6. Do not add an R2 lifecycle policy that independently deletes restic pack, index, snapshot, or metadata objects. Restic owns repository retention.

For a normal bucket, the repository URL has this form:

```text
s3:https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>/personal-control-center
```

For an EU-jurisdiction bucket, use the jurisdiction-specific endpoint:

```text
s3:https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com/<BUCKET_NAME>/personal-control-center
```

The configured region remains `auto`.

## Raspberry Pi secret files

Create the ignored secret directory from the repository root:

```bash
install -d -m 700 .secrets
printf '%s' '<R2_ACCESS_KEY_ID>' > .secrets/r2-access-key-id
printf '%s' '<R2_SECRET_ACCESS_KEY>' > .secrets/r2-secret-access-key
openssl rand -base64 48 > .secrets/restic-password
chmod 600 .secrets/*
```

Copy the three values to a password manager or another independent secure location. Losing the restic password makes the encrypted backup unrecoverable.

## Environment configuration

Add or update these values in the production `.env`:

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

Keep `.env` private:

```bash
chmod 600 .env
```

Rebuild the backup image after deploying this change:

```bash
docker compose build backup
```

## Initialise and verify

Initialise the encrypted repository once:

```bash
sh scripts/manage-offsite-backup.sh init
```

Create a fresh validated local backup and upload the first snapshot:

```bash
sh scripts/manage-offsite-backup.sh backup-now
```

Inspect the latest local status, matching snapshot, and repository data size:

```bash
sh scripts/manage-offsite-backup.sh status
```

Run a repository integrity check:

```bash
sh scripts/manage-offsite-backup.sh check
```

After the first successful run, normal backup service execution creates one fresh local database dump and one encrypted off-site snapshot every `PCC_BACKUP_INTERVAL_HOURS` hours. Production currently defaults to 24 hours.

The latest result is stored locally in `data/backups/offsite-status`. The backup container health check becomes unhealthy when the latest attempt failed or the newest success is older than `PCC_R2_MAX_BACKUP_AGE_HOURS`.

## Retention and pruning

Every successful snapshot applies this retention policy to snapshots with the configured host and `pcc-nightly` tag:

- 7 daily snapshots;
- 4 weekly snapshots;
- 6 monthly snapshots.

Expired snapshot references are forgotten after each successful backup. Repository pruning runs at most once per UTC calendar week. Manual maintenance remains available:

```bash
sh scripts/manage-offsite-backup.sh prune
```

Do not configure an R2 lifecycle rule to delete restic repository objects.

## Restore preparation

Restore the latest snapshot into the ignored `data/offsite-restore` staging directory:

```bash
sh scripts/manage-offsite-backup.sh restore-latest
```

The script:

1. restores the latest matching restic snapshot;
2. locates and validates the PostgreSQL dump;
3. recreates a paired upload archive from the deduplicated raw upload tree;
4. writes a ready-to-use recovery pair under `data/offsite-restore/recovery`;
5. prints the existing `restore-postgres.sh` command required to apply it.

## Required clean-restore rehearsal

Before closing issue #12, use a temporary clean Linux host or disposable VM:

1. Check out the repository at the intended release.
2. Create a production-equivalent `.env`.
3. Restore the three `.secrets` files from the independent password-manager copy.
4. Build the backup image.
5. Run `sh scripts/manage-offsite-backup.sh restore-latest`.
6. Start a clean PostgreSQL/application stack and apply the prepared dump.
7. Verify sign-in, review history, representative review photos, archived projects, accomplishments, and project action timelines.
8. Record the snapshot ID and rehearsal date in issue #12.

Do not perform the first rehearsal by overwriting the only live Raspberry Pi database.

## R2 usage

`sh scripts/manage-offsite-backup.sh status` reports the raw data size represented by the latest snapshot. Cloudflare account storage and request consumption remain visible in the R2 dashboard. Unexpected growth should be investigated before it leaves the included monthly usage.
