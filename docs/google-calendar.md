# Google Calendar integration

The application projects dated Personal Control Center records into a separate Google calendar. Personal Control Center remains the source of truth.

## Current scope

The one-way projection includes:

- open Tasks with a check-in date;
- every dated open action belonging to an active project.

Each record becomes an all-day event. Undated, completed, Waiting-only, archived, or completed-project records do not appear. Editing an event in Google Calendar does not update the application; the next relevant application change may overwrite or recreate the projected event.

The app creates a secondary calendar named **Personal Control Center** and never writes into the user's primary calendar.

## Security and ownership

- Every application account authorises its own Google account.
- Connections and event mappings are scoped by authenticated application user ID.
- Refresh tokens are encrypted with AES-256-GCM before PostgreSQL storage.
- The encryption key, OAuth client secret, and refresh tokens must never be committed or logged.
- Calendar failure never rolls back a successfully saved Personal Control Center change.
- The app requests only `https://www.googleapis.com/auth/calendar.app.created`, limited to calendars created by the application and their events.

## Google Cloud setup

1. Create or select a Google Cloud project and enable the Google Calendar API.
2. Configure the OAuth consent screen / Google Auth Platform for the intended private accounts.
3. Create an OAuth client with application type **Web application**.
4. Add the exact authorised redirect URI:

   ```text
   https://your-current-pcc-host.ts.net/api/integrations/google-calendar/callback
   ```

5. Copy the client ID and secret into the production environment.

The production connection should use an OAuth publication state that does not impose Google's seven-day Testing refresh-token expiry. Restrict actual use through Personal Control Center's invite-only authentication rather than relying on temporary OAuth Testing tokens.

## Deployment configuration

Generate one stable encryption key:

```bash
openssl rand -base64 32
```

Add:

```dotenv
PCC_GOOGLE_CLIENT_ID=your-web-client-id
PCC_GOOGLE_CLIENT_SECRET=your-web-client-secret
PCC_GOOGLE_TOKEN_ENCRYPTION_KEY=the-generated-base64-key
```

Normally leave `PCC_GOOGLE_REDIRECT_URI` empty so it derives from `PCC_PUBLIC_URL`. Set it only when the registered redirect intentionally differs.

Keep the token-encryption key stable. Losing or changing it makes existing stored refresh tokens unreadable and requires reconnection.

## Connect an account

1. Sign in.
2. Open **All Spaces → Account & access**.
3. Choose **Connect Google Calendar**.
4. Select the intended Google account and approve access.
5. Confirm the app creates the secondary calendar and reports Connected with matching projected/synchronised counts.

Each Personal Control Center user repeats this independently.

## Reconciliation behaviour

- Newly dated Tasks and open project actions create events.
- Title, notes, project title, or date changes update the mapped event.
- Removing a date, completing, archiving, deleting, moving a project to Waiting, or completing the project removes the event.
- Adding or reopening dated project actions creates their projections independently.
- Several dated open actions from one project may exist simultaneously.
- Unchanged entries are skipped through a content hash.
- Stable source IDs and stored event IDs prevent duplicates across retries.
- Relevant personal-data mutations and imports trigger reconciliation.
- **Sync now** retries the canonical projection; it does not import direct Google-side edits.
- Disconnect deletes the app-created secondary calendar and mappings but leaves Personal Control Center records unchanged.

## Acceptance tests

Use neutral temporary records.

1. Connect with one dated Task, one undated Task, and a project containing two dated open actions. Confirm exactly three events.
2. Change titles, notes, project title, and dates and confirm existing events update rather than duplicate.
3. Add and remove dates and confirm events appear/disappear.
4. Complete a Task and individual project actions and confirm only their mappings disappear.
5. Add another parallel dated action and confirm it receives its own event.
6. Move a project to Waiting, complete it, archive it, reopen/restore it, and verify projection follows active dated actions.
7. Press **Sync now** repeatedly and confirm idempotency.
8. Simulate a Calendar failure and confirm canonical Personal Control Center changes still save and the error becomes visible.
9. Restore connectivity/configuration, run **Sync now**, and confirm recovery without duplicates.
10. Edit or delete a projected event in Google, then change the source record and confirm Personal Control Center remains canonical.
11. Confirm unrelated manual events remain untouched.
12. With a second application account, confirm complete connection and event isolation.
13. Disconnect and reconnect, confirming a clean newly created secondary calendar with the current projection.

## Troubleshooting

### `redirect_uri_mismatch`

The registered URI must exactly match `<PCC_PUBLIC_URL>/api/integrations/google-calendar/callback`, including HTTPS and path.

### No refresh token or token expires after seven days

Remove the prior Google grant and reconnect. For production, do not leave the OAuth app in a state that imposes Testing-token expiry.

### Stored credentials are invalid

Confirm the same stable 32-byte base64 encryption key is still configured. If it was lost, remove the stale connection and authorise again.

### Personal data saves but Calendar does not update

This is intentional failure isolation. Inspect Account & access, correct the configuration or connectivity problem, and use **Sync now**.

## Boundary

Two-way Calendar synchronisation remains optional future evaluation in issue #26. Until conflict and inbound-authority rules exist, all source edits belong in Personal Control Center.
