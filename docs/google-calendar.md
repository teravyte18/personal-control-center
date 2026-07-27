# Google Calendar integration

Slice 5 projects dated Personal Control Center records into a separate Google calendar. The application remains the source of truth.

## Initial scope

The first version synchronises:

- open Tasks with a check-in date;
- the current open action of each active project when it has a target date.

Each record becomes an all-day event. Undated, completed, or archived records do not appear. The integration is one-way: editing an event in Google Calendar does not update the application and a later application synchronisation may overwrite that edit.

The app creates a secondary calendar named **Personal Control Center**. It does not write into the user's primary calendar.

## Security and ownership

- Every application account authorises its own Google account.
- Connections and event mappings are scoped by the authenticated application user ID.
- Google refresh tokens are encrypted with AES-256-GCM before PostgreSQL storage.
- The encryption key, OAuth client secret, and refresh tokens must never be committed.
- Calendar failure never rolls back a successfully saved Task or project change. The Account page records the last Calendar error and provides **Sync now** for recovery.
- The app requests only `https://www.googleapis.com/auth/calendar.app.created`, which is limited to calendars created by the application and their events.

## Google Cloud setup

1. Create or select a Google Cloud project.
2. Enable the **Google Calendar API**.
3. Configure the Google OAuth consent screen / Google Auth Platform:
   - choose an external audience for a normal personal Google account;
   - keep the app in Testing while developing;
   - add the Google account that will connect as a test user;
   - add the Calendar scope `https://www.googleapis.com/auth/calendar.app.created` if the console requests explicit scope configuration.
4. Create an OAuth client with application type **Web application**.
5. Add the exact authorised redirect URI:

   ```text
   https://your-current-pcc-host.ts.net/api/integrations/google-calendar/callback
   ```

   It must match `PCC_PUBLIC_URL` and the deployed route exactly, including HTTPS and path. Do not add a trailing slash.
6. Copy the client ID and client secret into the deployment environment.

A private testing deployment does not need to be published for arbitrary users. Keep the intended Google accounts in the OAuth test-user list.

## Deployment configuration

Generate one stable token-encryption key on the Raspberry Pi:

```bash
openssl rand -base64 32
```

Add these values to `.env`:

```dotenv
PCC_GOOGLE_CLIENT_ID=your-web-client-id
PCC_GOOGLE_CLIENT_SECRET=your-web-client-secret
PCC_GOOGLE_TOKEN_ENCRYPTION_KEY=the-generated-base64-key
```

Normally leave `PCC_GOOGLE_REDIRECT_URI` empty so it is derived as:

```text
<PCC_PUBLIC_URL>/api/integrations/google-calendar/callback
```

Set it explicitly only when the registered redirect URI intentionally differs:

```dotenv
PCC_GOOGLE_REDIRECT_URI=https://your-current-pcc-host.ts.net/api/integrations/google-calendar/callback
```

Keep `PCC_GOOGLE_TOKEN_ENCRYPTION_KEY` stable. Changing or losing it makes existing stored Google refresh tokens unreadable; the user would need to disconnect/reconnect or the connection rows would need to be removed manually.

After updating `.env`, deploy normally so migration `004_google_calendar.sql` runs and the app container receives the new variables.

## Connect an account

1. Sign in to Personal Control Center.
2. Open **All Spaces → Account & access**.
3. Under **Google Calendar**, choose **Connect Google Calendar**.
4. Select the intended Google account and approve the requested access.
5. The app creates the separate calendar and performs an initial reconciliation.
6. Return to Account & access and confirm the status is **Connected**, with matching projected and synced entry counts.

Each Personal Control Center user repeats this process independently.

## Synchronisation behaviour

A reconciliation compares canonical application data with the stored Google event mappings:

- a newly dated Task or current project action creates one event;
- changing its title, notes, project title, or date updates that event;
- completing, archiving, deleting, or removing the date deletes the event;
- completing a project action and choosing a next action removes the old event and creates the next one;
- unchanged entries are skipped using a content hash;
- if a mapped Google event was manually deleted, the next sync recreates it;
- retries use stored source IDs and event IDs to avoid duplicate events.

Reconciliation runs after relevant server-side personal-data mutations and imports. **Sync now** performs a complete manual reconciliation.

## Manual acceptance tests

Use neutral temporary records and delete them after testing.

### A. Connection and initial sync

1. Before connecting, create:
   - one dated Task;
   - one undated Task;
   - one active project with a dated current action.
2. Connect Google Calendar.
3. Confirm a secondary calendar named **Personal Control Center** exists.
4. Confirm exactly two all-day events appear: the dated Task and current project action.
5. Confirm the undated Task does not appear.
6. Confirm the Account page reports `2 / 2 synced` and no error.

### B. Task lifecycle

1. Create a new dated Task and confirm one event appears.
2. Change its title and confirm the existing event title changes rather than creating a duplicate.
3. Change its date and confirm the same event moves to the new all-day date.
4. Add or change notes and confirm the event description updates.
5. Remove the Task date and confirm its event disappears.
6. Add the date again and confirm one event is recreated.
7. Complete the Task and confirm the event disappears.
8. Reopen the Task and confirm the event returns.
9. Archive it and confirm the event disappears.
10. Restore it and confirm the event returns when its date remains present.
11. Delete it and confirm the event disappears permanently.

### C. Project-action lifecycle

1. Create an active project with one dated current action and confirm one event appears with the action title.
2. Change the action title and target date; confirm the existing event updates.
3. Change the project title and confirm the event description shows the new project title.
4. Complete the action with **Next action** and a date:
   - the old action event should disappear;
   - one event for the new action should appear.
5. Complete the current action with **Waiting** and confirm no action event remains.
6. Return the project to an active state and add a new dated action; confirm its event appears.
7. Complete the project and confirm the event disappears.
8. Reopen or restore the project with an open dated action and confirm the event returns.
9. Archive and restore the project, checking removal and recreation.
10. Delete the project and confirm its event disappears.

### D. Idempotency and recovery

1. Press **Sync now** several times; confirm no duplicates appear.
2. Manually delete one projected event in Google Calendar.
3. Press **Sync now**; confirm the missing event is recreated exactly once.
4. Temporarily set an invalid Google client secret or block outbound access, then change a dated Task:
   - confirm the Task change still saves in Personal Control Center;
   - confirm Account & access shows a Calendar sync error.
5. Restore the correct configuration and press **Sync now**:
   - confirm the error clears;
   - confirm projected and synced counts match;
   - confirm the pending Calendar change is applied once.

### E. One-way boundary

1. Edit a projected event title or date directly in Google Calendar.
2. Confirm Personal Control Center does not change.
3. Press **Sync now** and confirm the event is restored to the application title and date.
4. Create an unrelated event manually inside the Personal Control Center calendar and press **Sync now**. Confirm the app leaves the unrelated event untouched.

### F. Account isolation

When a second application account is available:

1. Connect it to a different Google account.
2. Confirm each account receives its own separate Personal Control Center calendar.
3. Confirm Tasks and project actions from one application account never appear in the other account's calendar.
4. Disconnect one account and confirm the other connection and calendar remain unchanged.

### G. Disconnect and reconnect

1. Choose **Disconnect** and confirm the app reports Disconnected.
2. Confirm the app-created secondary calendar is deleted from Google Calendar.
3. Confirm Tasks and Projects remain unchanged in the application.
4. Change dated records while disconnected and confirm normal persistence continues.
5. Reconnect and confirm a new secondary calendar is created with the current projection exactly once.

## Troubleshooting

### `redirect_uri_mismatch`

The URI registered in the Google OAuth client does not exactly match the URI sent by the app. Compare it with `PCC_PUBLIC_URL` and `PCC_GOOGLE_REDIRECT_URI`.

### Access blocked or test user rejected

Keep the OAuth app in Testing and add the connecting Google account as a test user. Confirm the Calendar API is enabled in the same Google Cloud project as the OAuth client.

### No refresh token returned

Google may not issue a new refresh token after a prior grant. Remove the app's access from the Google Account permissions page, then connect again. The app deliberately requests consent and offline access on connection.

### Stored credentials are invalid

Confirm `PCC_GOOGLE_TOKEN_ENCRYPTION_KEY` is the same 32-byte base64 value used when the account connected. If it was lost, remove the stale connection and authorise again.

### Personal data saves but Calendar does not update

This is intentional failure isolation. Open Account & access, inspect the recorded Calendar error, correct the configuration or connectivity problem, and use **Sync now**.
