# Google Calendar integration

Google Calendar now serves two related purposes in Personal Control Center:

1. dated Personal Control Center work is projected into a separate Google calendar;
2. the **Agenda** space reads upcoming events from the user's visible Google calendars and can create standalone events.

The integration deliberately keeps ownership simple. Tasks and Project Actions remain canonical in Personal Control Center. Ordinary Google events remain canonical in Google Calendar. Standalone events created from Agenda are stored in the app-created **Personal Control Center** Google calendar.

## Current scope

### Personal Control Center → Google

The projection includes:

- open Tasks with a check-in date;
- every dated open action belonging to an active project.

Each projected record becomes an all-day event. Undated, completed, Waiting-only, archived, or completed-project records do not appear. Editing a projected Task or Project Action in Google does not update the application; a later Personal Control Center change may overwrite or recreate that projection.

### Google → Agenda

Agenda reads upcoming events from visible calendars available to the connected Google account, including events received through invitations. The list supports:

- timed and all-day events;
- Google Meet links when supplied by the event;
- links back to Google Calendar;
- calendar/source labels;
- the existing Task and Project Action projections.

Agenda currently loads from today through the next 90 days.

### Agenda-created events

A standalone event created in Agenda is written directly to the separate **Personal Control Center** Google calendar. These events can be edited or deleted from Agenda. They are marked separately from Task and Project Action projections so those projections cannot accidentally be changed through Agenda.

The app does not write to the user's primary calendar or to other calendars.

## OAuth permissions

The integration requests:

- `https://www.googleapis.com/auth/calendar.app.created` — create and manage calendars created by Personal Control Center;
- `https://www.googleapis.com/auth/calendar.readonly` — read the user's visible Google calendars for Agenda.

Installations connected before Agenda was introduced only granted the first scope. Those users must reconnect once after deployment so Google can grant read access. Agenda detects the old permission set and shows a reconnect action.

## Security and ownership

- Every application account authorises its own Google account.
- Connections and projected-event mappings are scoped by authenticated application user ID.
- Refresh tokens are encrypted with AES-256-GCM before PostgreSQL storage.
- The encryption key, OAuth client secret, and refresh tokens must never be committed or logged.
- Calendar failure never rolls back a successfully saved Personal Control Center change.
- Personal Control Center only writes into the calendar it created itself.
- Agenda only allows edits/deletes for standalone events carrying the Agenda ownership marker.

## Google Cloud setup

1. Create or select a Google Cloud project and enable the Google Calendar API.
2. Configure the OAuth consent screen / Google Auth Platform for the intended private accounts.
3. Make sure the Calendar read-only scope is allowed for the OAuth application.
4. Create an OAuth client with application type **Web application**.
5. Add the exact authorised redirect URI:

   ```text
   https://your-current-pcc-host.ts.net/api/integrations/google-calendar/callback
   ```

6. Copy the client ID and secret into the production environment.

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

## Connect or upgrade an account

1. Sign in.
2. Open **All Spaces → Account & access** or open **Agenda**.
3. Choose **Connect Google Calendar** / **Reconnect Google Calendar**.
4. Select the intended Google account and approve access.
5. Confirm the Personal Control Center secondary calendar still exists and Agenda can load events from the user's other calendars.

Each Personal Control Center user repeats this independently.

## Projection reconciliation behaviour

- Newly dated Tasks and open project actions create events.
- Title, notes, project title, or date changes update the mapped event.
- Removing a date, completing, archiving, deleting, moving a project to Waiting, or completing the project removes the event.
- Adding or reopening dated project actions creates their projections independently.
- Several dated open actions from one project may exist simultaneously.
- Unchanged entries are skipped through a content hash.
- Stable source IDs and stored event IDs prevent duplicates across retries.
- Relevant personal-data mutations and imports trigger reconciliation.
- **Sync now** retries the Personal Control Center projection. It does not import edits made directly to projected Task or Project Action events.

## Agenda behaviour

- Agenda reads live from Google Calendar rather than duplicating external events into PostgreSQL.
- Recurring Google events are expanded into individual upcoming occurrences by the Calendar API.
- Events from inaccessible/deleted secondary calendars are skipped rather than blocking the whole Agenda.
- Standalone Agenda events use the Personal Control Center calendar as their canonical store.
- Disconnect deletes the app-created secondary calendar and removes projection mappings. External Google calendars and their events are untouched.

## Acceptance tests

1. Reconnect an existing Calendar integration and confirm Google requests the additional read-only permission.
2. Accept an invitation on the connected Google account and confirm the event appears in Agenda with its time and Meet link when present.
3. Confirm existing dated Tasks and Project Actions appear in Agenda as all-day Personal Control Center entries.
4. Create a timed standalone event in Agenda and confirm it appears both in Agenda and in the Personal Control Center Google calendar.
5. Edit the standalone event in Agenda and confirm the Google event changes without duplication.
6. Delete the standalone event in Agenda and confirm it disappears from Google.
7. Confirm projected Tasks and Project Actions do not show Agenda edit/delete controls.
8. Confirm external Google events do not show Agenda edit/delete controls.
9. Create an all-day Agenda event and confirm the date is correct in both places.
10. Confirm unrelated manual events and invitations remain untouched.
11. Press **Sync now** repeatedly and confirm Personal Control Center projections remain idempotent.
12. With a second application account, confirm complete connection and event isolation.
13. Disconnect and confirm external Google events remain untouched while the Personal Control Center calendar is removed.

## Troubleshooting

### Agenda says a reconnect is needed

The stored token was created before the read-only Calendar scope was introduced. Reconnect once and approve the additional permission.

### `redirect_uri_mismatch`

The registered URI must exactly match `<PCC_PUBLIC_URL>/api/integrations/google-calendar/callback`, including HTTPS and path.

### No refresh token or token expires after seven days

Remove the prior Google grant and reconnect. For production, do not leave the OAuth app in a state that imposes Testing-token expiry.

### Stored credentials are invalid

Confirm the same stable 32-byte base64 encryption key is still configured. If it was lost, remove the stale connection and authorise again.

### Personal data saves but Calendar does not update

This is intentional failure isolation. Inspect Account & access, correct the configuration or connectivity problem, and use **Sync now**.

## Boundary

This is not full two-way synchronisation of Personal Control Center records. Direct Google-side edits to projected Tasks or Project Actions still do not flow back into the app. That broader conflict-resolution problem remains separate from Agenda's read-only view of ordinary Google events.
