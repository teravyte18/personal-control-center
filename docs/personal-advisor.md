# Personal Advisor

## Decision

Add a future **Personal Advisor** after the Encrypted Password Keychain and Media Library slices.

The first version is an opt-in, suggestion-only LLM interface over selected Personal Control Center data. It should make the existing spaces more valuable together without making AI a dependency for capture, planning, review, media tracking, or any other normal workflow.

The initial implementation should stay deliberately simple: build a compact, structured context from canonical application data and send only the relevant enabled domains to a hosted LLM. Do not begin with embeddings, a vector database, autonomous agents, or broad database access.

## User problem

Personal Control Center stores useful information across Projects, Tasks, Thoughts, Notes, Weekly Reviews, Books, Media, and Expenses. Today those domains are useful individually, but the system does not reason across them.

A Personal Advisor can answer questions that benefit from the combined context, for example:

- What should I focus on this weekend?
- Which open project appears to be neglected?
- Recommend a book based on what I have actually enjoyed and written about.
- Recommend something to watch without suggesting items already in my Media library.
- What themes have repeatedly appeared in my recent thoughts and reviews?
- Which tasks or projects have I repeatedly postponed?
- Summarise what seems most important before I start my Weekly Review.

The value comes from grounding suggestions in the user's own stored history rather than from providing a generic chatbot inside the application.

## Product principles

- Personal Control Center remains useful when AI is disabled or unavailable.
- AI is advisory, never canonical.
- The user decides which data domains may be sent to an external model.
- The smallest useful context should be sent for each request.
- Model output must not silently create, edit, complete, delete, reschedule, classify, or otherwise mutate records.
- Existing deterministic application rules continue to decide statuses, dates, Calendar projection, backups, and other core behaviour.
- A good v1 should prefer understandable structured context over premature retrieval infrastructure.

## Initial experience

The first UI can be a single **Advisor** or **Ask PCC** space with a chat-like question/answer flow and a few optional shortcut prompts.

Possible shortcuts:

- Recommend a book;
- Recommend something to watch;
- What should I focus on?;
- Review my active projects;
- Help me prepare for Weekly Review.

Shortcuts are convenience only. Free-form questions remain the main interaction.

The interface should make it clear when an answer used Personal Control Center data and should provide enough grounding that recommendations can explain which stored preferences or records influenced them.

## Data-domain permissions

AI access is configured per user and per domain. A reasonable initial settings model is:

- Books — available, opt-in;
- Media — available, opt-in;
- Projects — available, opt-in;
- Tasks — available, opt-in;
- Thoughts — available, opt-in;
- Weekly Reviews — available, opt-in;
- Notes — available, opt-in, with a stronger privacy warning because Notes may contain broad reference material;
- Expenses — available later or opt-in with a stronger privacy warning; it should not be included merely because it exists;
- Keychain — **never available to AI**.

The exact default checkbox state can be selected during implementation, but no domain should be transmitted without a clear user-facing setting or request path that enables it.

### Permanent Keychain exclusion

The Personal Advisor context builder must have no dependency on Keychain tables, Keychain API responses, decrypted Keychain state, or Keychain client modules.

This is a technical boundary, not a prompt instruction. The LLM should be unable to receive Keychain ciphertext, metadata, decrypted values, labels, URLs, or secrets even if the user asks the Advisor to inspect them.

## Context construction — v1

The first version should use normal application queries and compact structured summaries.

A request may assemble only the relevant enabled data, for example:

```text
BOOKS
- completed books with ratings and short reflections
- current reading and wishlist when relevant

MEDIA
- completed/dropped items with ratings and reflections
- current watching and wishlist when relevant

PROJECTS
- active/waiting projects
- open actions, dates, and recent status/history where relevant

TASKS
- open tasks and recently completed tasks where relevant

THOUGHTS
- a bounded set of recent thoughts

WEEKLY REVIEWS
- a bounded set of recent completed reviews
```

The context builder should prefer:

- explicit user ratings and reflections;
- current/open state;
- relevant dates and recency;
- bounded recent history;
- enough identifiers to avoid recommending or discussing a record as if it were external when it already exists in PCC.

It should avoid dumping complete database snapshots into every request.

## Recommendation behaviour

Recommendations should use personal evidence rather than merely generic similarity.

For books and media, useful signals include:

- completed versus dropped state;
- rating;
- written thoughts/takeaways;
- recency;
- current and wishlist state;
- repeated preference patterns across several items.

The model should avoid recommending an item already present in the relevant PCC library unless the user explicitly asks about it.

When practical, recommendation answers should explain the personal signals behind each suggestion rather than presenting unexplained ranked results.

## Provider and request boundary

A hosted LLM provider may be used for the first version.

- Provider credentials stay server-side in deployment secrets/environment configuration.
- Browser clients never receive the provider API key.
- The server builds and validates the permitted context before making the external request.
- Requests should include only the domains needed for the current question and enabled by the user.
- The UI should disclose that enabled personal data is sent to the configured external AI provider for the request.
- Provider failures must leave the rest of Personal Control Center unaffected.
- Rate limits, request-size limits, timeouts, and cost controls are required before production use.

The implementation should avoid storing raw prompts, model responses, or generated context in application logs. Persistent Advisor conversation history is not required for v1 and should not be introduced accidentally through logging or analytics.

## No autonomous writes in v1

Advisor v1 is read-only with respect to canonical PCC data.

It may suggest actions such as:

- reschedule a task;
- add a project action;
- add a book to a wishlist;
- create a note;
- mark something as neglected.

But those remain suggestions. If later UI offers an explicit “apply” action, the proposed mutation must be shown to the user and confirmed through the normal deterministic application pathway. The model must never receive a generic database-write tool.

## Retrieval and embeddings — later, only when needed

Do not make embeddings or semantic retrieval a prerequisite for v1.

For the expected initial data volume, direct structured queries plus bounded recent context are simpler, easier to audit, and likely sufficient.

Revisit retrieval when real usage shows that useful context can no longer fit comfortably or relevant Notes/Thoughts are being missed. A likely future architecture is:

1. create embeddings for selected AI-enabled textual records;
2. store vectors in PostgreSQL with `pgvector` or an equivalently simple local extension;
3. retrieve a small set of semantically relevant records for the current question;
4. combine those records with deterministic structured state such as active projects and ratings;
5. send only the resulting context to the model.

Embedding generation itself is subject to the same per-domain privacy permissions as generation requests. Keychain remains excluded permanently.

## Privacy and security implications

- AI-domain settings are user-scoped and must not leak between accounts.
- The context builder queries only the authenticated user's records.
- Generated context must not be written to logs, crash reports, analytics, URLs, notifications, or Calendar events.
- Normal export and backup behaviour should contain AI settings if they are part of user preferences, but does not need to contain third-party prompts/responses unless explicit conversation persistence is later designed.
- If conversation history is added later, its persistence, deletion, export, backup, and privacy behaviour must be specified separately.
- External provider data-retention and training controls should be reviewed when choosing the provider/configuration.
- The Advisor route should not weaken the Keychain security boundary or cause third-party scripts to run inside the unlocked Keychain route.

## Offline and Calendar boundaries

- Advisor is online-only in v1.
- Offline Quick Capture remains unchanged.
- Advisor answers do not project to Google Calendar.
- Suggestions about dates or scheduling do not change Calendar-projected records until the user explicitly applies a normal PCC mutation.

## Acceptance criteria for Advisor v1

- A user can ask a free-form question and receive an answer grounded in enabled PCC data.
- At least Books, Media, Projects, Tasks, Thoughts, and Weekly Reviews can be represented as independently permissioned domains.
- The server sends only authenticated, enabled, request-relevant context to the configured model.
- Keychain data is structurally inaccessible to the Advisor context builder.
- Recommendations avoid already-known library items unless explicitly requested.
- Responses can explain which personal signals influenced a recommendation or suggestion.
- No model response silently mutates canonical PCC records.
- Provider failures, disabled AI, or exhausted limits do not break normal PCC workflows.
- Raw generated context and secrets do not appear in application logs.
- Request size, timeout, rate-limit, and cost controls exist.

## Explicit exclusions from v1

- autonomous agents;
- generic database read/write tools;
- Keychain access of any kind;
- mandatory embeddings/vector search;
- long-term conversation memory;
- proactive background AI monitoring;
- autonomous task/project changes;
- autonomous purchases, bookings, messages, or Calendar changes;
- replacing deterministic Weekly Review, Tasks, Projects, or recommendation-library state with model-generated truth.

## Later possibilities

After the read-only Advisor proves useful, evaluate individually:

- semantic retrieval over large Notes/Thoughts collections;
- richer preference profiles derived from rated Books and Media;
- explicit apply/confirm actions for safe structured suggestions;
- weekly-review preparation summaries;
- stale-project or repeated-postponement detection;
- duplicate/related-note suggestions;
- optional provider choice or local models if hardware, quality, and privacy trade-offs justify them.

Each extension should preserve the core rule: AI helps interpret the Personal Control Center; it does not become the source of truth for it.
