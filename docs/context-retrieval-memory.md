# Context Retrieval and Long-Term Memory

## Status

**Design direction selected; not implemented yet.**

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

Future behavior:

1. enter a test question;
2. inspect the planner output;
3. inspect all retrieval candidates and scores;
4. inspect current-state records added automatically;
5. inspect the final budgeted context bundle;
6. inspect why each record was included;
7. inspect final size/token estimate.

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

Build deterministic retrieval documents from the existing canonical snapshot.

Initial goals:

- cover Reviews, Library, Projects, Tasks, Thoughts, and Notes;
- preserve source IDs, dates, domain, and useful metadata;
- search the **whole eligible archive**, independent of Personal Context's 90-day/12-record defaults;
- do not create an LLM dependency yet.

The first implementation can generate documents from the snapshot on demand and use local lexical scoring. Persistence/vector indexing can follow after the document model proves useful.

### Phase 2 — deterministic search API

Add an authenticated internal retrieval endpoint/service with:

- query;
- domains;
- optional date range;
- top-K;
- exact/lexical scoring;
- deterministic current-state boosts;
- returned score/reason/provenance.

Keychain remains absent by construction.

### Phase 3 — Resolved Context Inspector

Add a question-driven Inspector mode that initially uses explicit domain selection plus deterministic retrieval.

This provides a visible evaluation surface for questions such as:

- did the relevant old Review appear?
- did the right Library record appear?
- why was a result ranked?
- how large is the final bundle?

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

The next context/Advisor engineering slice should be **Phases 1–3**:

1. retrieval-document projection over the full eligible PCC archive;
2. deterministic lexical/exact search with provenance;
3. a question-driven Resolved Context Inspector.

This slice is valuable without any LLM provider, gives a testable answer to the “buried Review / old Library item” problem, and creates the substrate required by both a future local model and a hosted model.

The Context Planner should be the first LLM-specific step after that substrate works.
