# Focus + Atlas personal trial

Status: implemented and deployed for personal trial on `agent/focus-atlas-trial`, based on main `271ce08`. Draft PR: [#102](https://github.com/teravyte18/personal-control-center/pull/102). **Do not merge before owner trial and explicit approval.**

## Direction

Figma file `rtPqrxzyCazl5XIIaorQ7Y`, start board `60:996`, revised Focus page `40:997` and Atlas page `40:998`. Library anchors: `45:1349` and `45:1818`. Archived alternatives and the graph Home are excluded.

Focus: one phone working surface, persistent PCC/Account header, four existing configurable pins surrounding Capture, explicit All Spaces. Projects focus on a selected project's independent actions. Atlas: bounded rail, ownership beside actions, collections alongside contextual detail. Laptop: compact labelled rail; hide secondary detail when space is insufficient.

Use DM Sans, existing theme palettes, 28/34 phone headings, 24/30 desktop headings, 18/24 section headings, 16/24 body, 14/20 labels, 12/18 secondary text; 12px controls, 16px surfaces, 6px artwork corners. Artwork remains user data.

## Feature-preservation checklist

Checked means the implementation retains the capability and its existing domain/API boundary. It does not claim every external integration or destructive action was exercised. Browser coverage and limitations follow this list.

- [x] Capture, Inbox organisation, pending/error state and capture-only offline boundary.
- [x] Projects: direct creation, areas/status views, independent actions, dates/details, reschedule/completion notes, history, explicit project completion, archive/restore.
- [x] Tasks: direct creation, edit, optional dates, weekly selection, completion/history.
- [x] Week: recurring intentions, event counts, undo, over-target, pause/edit/delete, history, weekly focus/carry-forward, dated work and Calendar commitments.
- [x] Agenda: existing Calendar sources, event creation/editing, time/date handling.
- [x] Review: current draft/autosave, Saturday–Friday context, photos, submit/history/reminders.
- [x] Thoughts and Notes: distinct models, direct creation, Markdown, ordering/autosave.
- [x] Books/comics: all shelves, search/filters, queue order, all creation fields, 0–10 dimension ratings/override, optional dates, comic format/progress, takeaways.
- [x] Artwork: private upload/display, replacement/removal, recognition prefill/manual fallback.
- [x] Movies/Series: separate views, state/rating, watched/start/finish dates, season/episode, posters.
- [x] Food: recipe editing/photo/rating/make-again and ingredient copy.
- [x] Expenses: entry, editing/history, allocations/Fun Fund and Insights.
- [x] Music: archive/insights/random/import/integration states.
- [x] Markets: watchlist/search/current data/TradingView.
- [x] Keychain: existing encryption, unlock/recovery/records/tools remain isolated; browser unlock has the baseline limitation below.
- [x] Spaces, device-local pins, all ten themes, Account/invitations/integrations/data controls.
- [x] Context Inspector: current context, retrieval and resolved context retained.
- [x] Loading/empty/error/validation, focus/keyboard, narrow/phone/laptop/desktop layouts.
- [x] Auth/session/per-user isolation, persistence formats and main deployment preserved.

## Validation and preview

### Automated and deployment checks

- ESLint with zero warnings; TypeScript; production Next build; 188 domain/security tests pass. Local Node 24 needed the equivalent `node --experimental-strip-types --test tests/*.test.ts`; CI uses the repository's supported Node 22 and original `npm test`.
- GitHub CI run [732](https://github.com/teravyte18/personal-control-center/actions/runs/39758554688) passes for application commit `43ae934`, including Quality and Production stack (persistence, authentication, private artwork, Keychain server boundaries, PWA and backup checks).
- Production ARM64 image built on the existing Pi. Base, Funnel and trial Compose configuration and trial shell syntax validated. Both main and trial report healthy; unauthenticated trial page returns 307 to login and personal-data API returns 401.
- Main remains on `271ce085195c826e147cd5d7285ec6bc9d910bc8`; its container was not replaced. Trial uses a second application process. No domain, provider, API, database, crypto or authentication implementation changed.

### Browser checks

Actual application inspected before changes. All 22 authenticated spaces captured at 390×844, 971×871 and 1440×1024, compared with the revised Figma frames. Six key spaces also checked at 320px. Long unbroken Thought text exposed a laptop overflow, now fixed. All 66 final primary viewport checks have no horizontal overflow. Private screenshots remain outside Git.

Fictional browser-only records exercised two independent project actions, completion notes/history without implicit project completion; weekly target 3, two logs and Undo to 1/3, Manage/history; full comic fields and ratings including zero, unrated, 8.5 and override 7.5; Movie watched date; Series S2 E4/start date; Notes Markdown/autosave/reload; modal forward/backward Tab trapping and inert background.

A separate authenticated QA Compose project with its own PostgreSQL volume and uploads exercised expense validation/save/edit/reload/Insights; cover upload/display/replacement/removal/reload; uncertain recognition/manual fallback; Capture → Inbox → Task, weekly selection and completion/history; Review draft autosave/reload/submission/history; recipe rating and ingredient clipboard copy. No test records were added to personal trial data. All ten themes were selected through Account and rendered without horizontal overflow.

A fresh Impeccable reviewer inspected all 66 primary captures and the selected Figma references: typography, materials, Focus topology, Atlas ownership/actions, compact laptop rail and collection/detail layout matched the selected direction. Its sole material fix removed decorative emoji from empty media shelves. A subsequent verdict scored that fix resolved across six fictional empty Movie/Series captures and returned `ship` at that fix's scope; this is not a certification of every external workflow.

### Meaningful deviations and limitations

- Extra existing fields, independent actions, integration controls, history and recovery flows remain accessible even where Figma omits them. Native form controls retain keyboard, date and touch behaviour. Library Open/Edit use the same complete editor; no separate read-only book route was invented.
- Existing device-local navigation pins and all theme palettes/artwork remain authoritative. Figma sample records and covers are not installed as personal data. Home keeps existing capture semantics and greeting; the graph remains deferred. Signed-out screens omit authenticated navigation.
- Physical phone keyboard/safe-area/installed-PWA behaviour still needs the owner's real-device trial; viewport emulation cannot certify it. External Calendar/Spotify writes, push subscription, account revocation and destructive deletion were not exercised against live personal data.
- A fixture cover was not confidently identified; recognition preserved manual fields and recovered cleanly. A successful OCR match is not certified.
- **Keychain browser limitation:** the baseline `next.config.ts` CSP permits `script-src 'self' 'unsafe-inline'` but blocks WebAssembly compilation in the in-app browser. Console errors were observed. Keychain source, crypto dependencies, CSP and permissions are unchanged from main; successful browser unlock/recovery is not certified. Server isolation/security tests passing does not resolve this browser limitation.

### Preview and rollback

The owner receives the authenticated HTTPS trial URL directly, outside the repository. Port 8443 serves the trial; existing port 443 serves main. **The trial shares the real account database and private uploads:** ordinary edits made during the trial are real and also appear in main. A pre-deployment backup runs through the existing validated backup process. No schema migration or data-copy/import occurs.

Deploy from the separate clean branch checkout with `PCC_TRIAL_PUBLIC_URL=https://<existing-tailnet-host>:8443 sh scripts/deploy-trial.sh`. The script rejects main, the live checkout, and changes to persistence/authentication boundaries. It starts only `app-trial` and leaves workers/main intact.

To withdraw the UI trial, run the existing live Compose command's `exec -T tailscale tailscale funnel --https=8443 off`, then the trial Compose command's `stop app-trial`. Do not stop main, disable port 443, run `down`, remove volumes or restore backups for an ordinary UI rollback. UI rollback does not undo ordinary personal data edits. A future recreation of main's application network namespace may require recreating `app-trial` too.

## Trial notes

For each friction report record: space, device/width, theme, action attempted, expected result, actual result, and whether it blocks work. Try capture, two independent project actions, weekly log/undo, note autosave, a comic with ratings, Series progress, expense entry and Review before approving merge.

| Trial | Record friction around |
| --- | --- |
| Phone + laptop + desktop | Navigation, search, switching spaces, text wrapping and returning from an editor |
| Projects + Week | Two independent actions; complete one; weekly log/undo and retained history |
| Library | Comic creation, zero vs unrated ratings, cover changes, Movie dates and Series resume position |
| Daily use | Capture organisation, Note autosave, expense entry/edit and Review draft/history |
| Your usual theme + installed app | Contrast, keyboard reach, bottom safe area, reload/persistence and any Keychain issue |

Approval remains a later owner decision. Keep this PR draft until trial feedback has been incorporated and the owner explicitly approves merging.
