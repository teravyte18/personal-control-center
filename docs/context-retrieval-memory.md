# Context Retrieval and Long-Term Memory

## Status

**Phases 1–3 are implemented in stacked PRs (pending review and merge).** Phase 1 projects retained canonical history; Phase 2 performs authenticated deterministic search; Phase 3 resolves and inspects a bounded context. None requires a model, embeddings, index or new database tables.

The existing Personal Context Layer is a useful privacy and representation boundary, but it is not intended to be the final retrieval system for a Personal Advisor.

The Context Inspector can currently build a broad bounded representation from selected domains. A large all-domain result is useful for inspection, but a future Advisor should not send that entire representation on every request.

The target pipeline is:

```text
user question
    ↓
context planner
    ↓
retrieval request
    ↓
search eligible PCC history + current state
    ↓
rank / deduplicate / apply token budget
    ↓
resolved context bundle
    ↓
final model call
```

The central rule is:

> **Record limits constrain the final context bundle, not the history PCC is allowed to search.**

A Library item, Weekly Review, Thought, or other eligible record does not become undiscoverable merely because it is old or outside the default twelve-record context window.

## Three separate concepts

### 1. Canonical archive

Normal PCC domains remain the source of truth.

Examples:

- every Weekly Review remains in Review history;
- every Library record remains in Library;
- old Project history remains Project history;
- Notes remain Notes;
- future Advisor conversations remain their own conversation records.

Canonical records are not deleted or summarised away merely because they no longer fit in an active model request.

### 2. Retrieval corpus

Eligible canonical records can be converted into **retrieval documents** that are searchable across the complete retained history.

A retrieval document is a derived search representation, not a new source of truth.

Conceptually:

```ts
type RetrievalDocument = {
  id: string;
  userId: string;
  domain: PersonalContextDomain | "conversation" | "memory";
  sourceId: string;
  sourceSubId?: string;
  title?: string;
  text: string;
  occurredAt?: string;
  updatedAt?: string;
  metadata: Record<string, string | number | boolean | null>;
};
```

Examples:

- one Weekly Review may become one document containing its reflection fields;
- one Library record may become one document containing title, author, state, rating, thoughts, and progress;
- a Project may produce a project-level document plus selected action/history documents;
- a long conversation may later produce episode/summary documents.

The retrieval corpus may contain far more records than can ever fit in one model request.

### 3. Active context bundle

The resolved context bundle is the small set of current state + historical records actually sent to the model for one request.

A typical bundle should be assembled from:

- **always/currently relevant state** selected deterministically;
- **retrieved historical state** selected because it matches the current question;
- later, relevant stable memories and episodic summaries;
- recent conversation turns.

This bundle has explicit record and token/character budgets.

## Context planning

Domain selection can be partly deterministic, but free-form questions eventually require a model to understand what information may be useful.

A **Context Planner** should be a small structured model step. It receives:

- the user's current question;
- the available domain catalogue and short domain descriptions;
- privacy/permission constraints;
- optionally the recent conversation state.

It should **not** receive the full PCC archive.

It returns a validated structured retrieval plan such as:

```json
{
  "domains": ["projects", "tasks", "reviews", "rhythm"],
  "includeCurrent": ["projects", "tasks", "rhythm"],
  "searches": [
    {
      "domain": "reviews",
      "query": "thesis postponement motivation difficulty progress",
      "timeRange": "all",
      "topK": 6
    }
  ]
}
```

PCC validates the plan against declared domains and permissions before executing it.

The planner chooses **what to look for**. It never receives generic SQL/database access.

## Retrieval

Retrieval should be hybrid rather than relying on one ranking method.

### Exact and lexical search

Use normal text/entity matching for information where exact words matter:

- project names;
- book/comic titles;
- people;
- `CUDA`;
- recipe names;
- recurring terminology.

PostgreSQL full-text search or another deterministic local index is sufficient for the first implementation.

### Semantic search

Semantic retrieval is useful when the wording of the question differs from the wording of an old record.

Example:

> “When have I struggled to get started on important work?”

may need to retrieve an old Review that says:

> “I kept postponing the thesis because there was no immediate pressure.”

Those strings share little exact vocabulary but are semantically related.

Embeddings/vector search are therefore a likely later part of the retrieval layer, but they should be introduced as a retrieval capability rather than making vector search the source of truth.

If persisted vectors are used, PostgreSQL + pgvector is a natural option for the existing stack. The embedding model/provider should remain replaceable.

### Metadata and deterministic boosts

Ranking may also use domain-specific signals such as:

- active/current state;
- exact title/name match;
- same project/entity;
- date range requested by the planner;
- recency;
- explicit ratings/state;
- current/up-next Library status;
- current Rhythm focus.

These boosts should be inspectable.

## Current state plus retrieved history

Pure similarity search is not enough.

Some data should be included because it is **currently important**, even if it is not the best text match.

For example, a weekly-planning request may always include:

- active Weekly Rhythm;
- current Weekly Focus;
- due/overdue Tasks;
- active Project actions.

Historical retrieval then adds older Reviews or records relevant to the particular question.

The final bundle is the union of current-state providers and historical search results, followed by deduplication and budgeting.

## Library example

The existing bounded Library context should not define the future search universe.

If Library contains hundreds of records and the user asks:

> “What should I read that feels similar to Avengers: Twilight?”

PCC should be able to search **all eligible Library records**, not only the latest or highest-ranked twelve.

A resolved bundle may contain:

- the exact Avengers: Twilight record and its rating/thoughts;
- semantically or lexically related finished records;
- relevant Wishlist/Up-next candidates;
- a small amount of current reading state.

The record cap applies **after retrieval**.

## Weekly Review example

Recent Reviews are useful default context, but older Reviews can remain relevant years later.

For a question such as:

> “Have I had this motivation problem before?”

the retrieval layer may search all retained Review history and return a small set from widely separated dates.

The full old Review remains the source. It does not have to become a permanent memory merely to remain retrievable.

## Token budgeting and ranking

Resolved context should have an explicit request budget.

A simple first policy could reserve separate budgets for:

- current state;
- historical retrieval;
- stable memory;
- conversation;
- final system/task instructions.

The resolver should:

1. merge current and retrieved candidates;
2. deduplicate by stable source identity;
3. rank candidates;
4. retain source/provenance IDs;
5. trim lower-ranked content or fields;
6. stop at the configured token/character budget.

A large Context Inspector result such as 50k characters is acceptable as a diagnostic representation. It should not imply that every final model request receives 50k characters.

## Long-term memory model

Long-term memory should not mean “keep more raw context in every prompt.”

PCC should distinguish four layers.

### Canonical personal history

All retained normal PCC records remain searchable. This alone solves many “buried old fact” problems.

### Episodic summaries

Dense sources such as old conversations or groups of Reviews may later receive compact episode summaries.

Example:

```text
February 2027:
- thesis work was repeatedly postponed;
- changing work location appeared to help;
- several fake Friday deadlines were removed;
- running became more consistent.
```

The raw source records remain available.

Retrieval may first find a summary and then expand to the underlying source if more detail is needed.

### Stable personal memory

A separate PCC-owned memory store may contain durable conclusions/preferences worth carrying between conversations.

Conceptually:

```ts
type StableMemory = {
  id: string;
  claim: string;
  createdAt: string;
  lastSupportedAt?: string;
  sourceRefs: Array<{ domain: string; sourceId: string }>;
  origin: "explicit-user" | "deterministic" | "model-inference";
  confidence?: number;
  state: "active" | "superseded" | "retired";
};
```

Examples include durable workflow preferences or explicit instructions.

A memory is not canonical truth merely because a model proposed it.

### Recent conversation

Normal recent turns remain verbatim for immediate continuity.

The target request becomes:

```text
recent conversation
+ current canonical state
+ relevant retrieved old records
+ relevant episodic summaries
+ relevant stable memories
```

not an ever-growing raw transcript.

## Memory provenance and correction

Any durable memory system must make it possible to answer:

- where did this claim come from?
- was it explicitly stated or inferred?
- which records support it?
- when was it last supported?
- has it been corrected or superseded?
- can it be edited, retired, exported, or deleted?

Repeated Review themes may justify proposing a memory, but the system should not silently convert a probabilistic pattern into permanent truth.

## Resolved Context Inspector

The existing Inspector should eventually gain a second mode.

### Raw domain context

Current behavior:

- choose domains;
- inspect the bounded deterministic representation;
- inspect size/token estimate.

### Resolved context for a question

**Implemented (Phase 3).** Context Inspector at `/spaces/context` now has two modes:
the original **Raw domain context** and **Resolved question**.

In Resolved question mode:

1. Enter a test question and manually choose the six historical search domains (Phase 2 uses lexical ranking, **not semantic similarity**).
2. Optionally choose current Projects, Tasks and Rhythm, included because they are current, even if they do not match the question. Default is **none** to avoid irrelevant records being silently included.
3. Optionally supply an inclusive creation/event date range, plus max context characters (1,000–20,000; default 8,000) and records (1–20; default 12).
4. Inspect the explicit **manual/deterministic plan**, Phase 2 ranked matches and their relevance reasons, current-state candidates, the canonical source IDs for included records, and exclusions for hitting budget or record limits.
5. Inspect the **exact final context text**, truncation counts and approximate token count (characters / 4). These are estimates, not model-tokenizer counts.

The new authenticated `GET /api/personal-context/resolve` endpoint accepts Phase 2's
`q, domains, from, to, limit` plus `current, maxChars, maxRecords`. It derives
account identity from the PCC session, reads the canonical snapshot, builds the
entire eligible retrieval corpus on demand, and returns `private, no-store`
data. It rejects caller-supplied user IDs, Keychain and any unknown parameters;
there is no database mutation, index, or model API request.

**Resolver semantics:** Exact source IDs connect results to canonical records.
A record appearing both as current state and in search results is deduplicated,
and its current-state and search-ranking reasons are combined. Current state is
collected from active Projects/open actions, open Tasks, and the existing bounded
Weekly Rhythm provider when requested. Rhythm's generated weekly snapshot
explicitly identifies the template/focus IDs it was derived from. Retrieved
records stay eligible regardless of age and are scored *before* record/character
caps. Some slots are reserved for requested current state without crowding all
historical matches out; each included item is capped at 1,800 characters, and
the entire final text remains at or below the chosen max character count.

The inspector exposes which selected candidates were excluded, but it does not
display **every** document in the corpus. Phase 2's `limit` determines how many
ranked matches are available to the resolver. This is an evaluation aid, **not**
an Advisor that answers the question; different wording can still miss relevant
records. There is no automatic Context Planner or AI-assisted domain selection.

Example:

```text
Question
"What should I prioritise this week?"

Planner
Projects ✓
Tasks ✓
Rhythm ✓
Reviews ✓
Library ✗
Food ✗
Expenses ✗

Current state
2 projects
4 tasks
1 rhythm snapshot

Historical retrieval
3 reviews

Final context
~2,300 tokens
```

This is more useful for debugging Advisor quality than immediately building a polished chat UI.

## Optional model retrieval tool

After the initial resolved context is built, a final conversational model may still discover that it needs another historical fact.

A later read-only tool can allow a bounded second retrieval:

```text
search_personal_context(
  query,
  domains,
  date_range,
  limit
)
```

The tool searches the same retrieval layer and returns bounded structured results.

It must not expose unrestricted SQL or Keychain.

## Build sequence

### Phase 1 — retrieval-document foundation

**Implemented as a pure projection**, `buildRetrievalDocuments(snapshot, userId)`.
It returns `RetrievalDocument[]` without touching network, database or LLM services.

- Explicitly allowlisted domains: Reviews, Library (Books/Comics/Movies/Series), Projects, Tasks, Thoughts, and Notes.
- The document carries `id`, `userId`, `domain`, `sourceId`, optional `sourceSubId` for a project action, `sourceKind`, `title`, `text`, `occurredAt`, `updatedAt`, and allowlisted metadata.
- Published Review entries, including old entries, are projected. An unsubmitted Review draft remains *current state*, not historical retrieval content.
- Each Project has a parent document and one document per action, including completed actions, details, completion notes and rescheduling history.
- Retained archived/completed Tasks, Projects, Notes and Thoughts remain eligible; canonical deletion removes them on the next projection. No 90-day window, 12-record cap or `maxTextChars` truncation is applied.
- Library payloads are decoded with the canonical Book/Media parsers. Raw structured Note JSON, cover/poster identifiers, Note ordering metadata and unknown/invalid PCC structured payloads are excluded.
- Keychain never enters the domain allowlist or projection. Expenses, Food, Rhythm, Music and Calendar are intentionally outside this initial historical corpus.
- The returned array is deterministically ordered; user-scoped derived IDs incorporate the authenticated user ID supplied by the eventual Phase 2 caller. The builder itself **does not authenticate** any caller.
- Unit tests cover old and archived records, multiple actions, exact source provenance, structured-record isolation, deterministic projection and disappearing/deleted sources.

**Phase 1 has no API/UI of its own:** Phase 2 loads the authenticated user's canonical snapshot and searches the projected documents on demand. Indexing/persistence/embeddings remain optional performance improvements after correctness is tested.

### Phase 2 — deterministic search API

**Implemented:** `GET /api/personal-context/search`. The endpoint requires a PCC session, resolves the user identity server-side, loads only that user's canonical `PersonalDataSnapshot`, projects the Phase 1 retrieval documents, then performs pure deterministic search. It cannot query a different account or Keychain. Responses are `private, no-store`; the API does not change any data.

Parameters:

- `q` (required, 1–240 characters, 1–16 meaningful terms after basic English/Portuguese stopwords);
- `domains` (optional comma-separated subset of `reviews,library,projects,tasks,thoughts,notes`; defaults to all);
- `from` and `to` (optional **inclusive** `YYYY-MM-DD` range on the record's **event/creation date**, not its last edit date);
- `limit` (optional, 1–25, default 10).

Invalid/duplicated/unknown parameters return HTTP 400, unauthenticated requests return 401, and unexpected infrastructure failures return a generic 503. The endpoint **does not accept `userId`**, raw SQL, arbitrary domain names or model-supplied permissions.

Result shape: `{ query, totalMatches, results }`. Each result contains its stable document ID, source domain and canonical `sourceId` (and optional `sourceSubId` for project actions), source kind, title, dates, metadata, a **bounded snippet**, numeric relevance score and an ordered list of human-readable ranking reasons. Entire source text and arbitrary raw serialized Notes are not returned by the search API. `totalMatches` counts matches before the `limit` is applied.

Ranking is intentionally simple and inspectable: Unicode-normalized exact title / title terms / phrase and body term matches are primary; active status and updated-within-90-days are small tie-breaker boosts. Stopwords are removed only from the *query*, never from the canonical text. No vector search or claim of semantic understanding yet. Ties are ordered by stable document ID. Tests exercise complete old histories, provenance, multi-account isolation, archived records, date and domain filters, malformed input, rank order and bounded output.

Phase 3 can call the same pure search helper and then resolve selected canonical document IDs into a **separately bounded** final context bundle, combining current-state providers with historical matches. It must not treat search snippets as complete source text.

### Phase 3 — Resolved Context Inspector

**Implemented.** The existing Inspector provides a question-driven mode that
combines Phase 2 search matches with explicit current-state providers,
deduplicates by source identity, applies record/character caps *after*
retrieval, and exposes reasons, sources, dropped records, and the exact resulting
context. Unit tests cover old history, arbitrary current-state inclusion,
deduplication, budget enforcement, Rhythm provenance and Keychain exclusion;
production integration tests check cross-account isolation and input validation.

### Phase 4 — Context Planner

Add the first provider-neutral structured LLM call.

The planner receives only the user question/domain catalogue/recent conversation and returns validated retrieval instructions.

It does not answer the user and does not access canonical storage directly.

Compare a local model and one hosted model on planner accuracy, latency, and token cost.

### Phase 5 — hybrid semantic retrieval

Add embeddings/vector search when lexical retrieval demonstrates misses that semantic search should solve.

Combine:

- lexical/exact score;
- semantic similarity;
- metadata/current-state boosts;
- optional simple reranking.

Keep every result grounded to canonical source IDs.

### Phase 6 — final LLM sandbox

Only after resolved-context quality is inspectable, add a small multi-turn final-answer sandbox.

Expose:

- planner output;
- retrieved sources;
- context budget;
- final prompt/context;
- model/provider;
- latency/tokens/cost.

### Phase 7 — episodic memory

Add stored/retrievable summaries for older conversations or dense historical periods only if raw retrieval becomes noisy or expensive.

### Phase 8 — stable memory

Add provenance-aware durable memory only after there is evidence that persistent learned conclusions materially improve conversations.

Start with explicit or user-confirmed memory rather than fully automatic promotion.

## What should be built next

Phases **1–3** now have implementations in stacked PRs. After merging and
deploying those PRs, manually test retrieval questions against old Reviews,
Library entries and Project actions. Identify misses caused by lexical wording
versus missing canonical source records and assess the size of the final bundle.

**Next candidate:** Phase 4, a provider-neutral structured Context Planner,
only after retrieval quality is inspectable on real data. Keep semantic/vector
retrieval, final LLM chat, episodic summaries and stable memories later and
evidence-driven.
