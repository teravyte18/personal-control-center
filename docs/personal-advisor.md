# Personal Context and LLM Experiments

## Status and decision

A standalone **Personal Advisor** is no longer a committed next product feature.

The useful conclusion from the original Advisor design is broader: Personal Control Center now has a reusable **Personal Context Layer** that represents selected information across its existing domains without giving integrations blanket database access.

That infrastructure is now used by Weekly Rhythm and Weekly Review. The combined slice should be tested before deciding how much of the weekly horizon belongs on Home or replaces Agenda. The real-use audit also confirms that Weekly Review is a particularly valuable longitudinal source because it captures interpretation and lessons rather than only raw activity. PCC may later host a small **LLM sandbox** to learn how provider APIs, model choice, reasoning effort, context construction, memory, tool use, privacy, and cost behave with real personal data. The sandbox is an experiment, not a promise that PCC needs a permanent AI chat surface.

A future Advisor, contextual AI features, or an external ChatGPT/MCP-style connection may be promoted only if actual use demonstrates value beyond what the deterministic application or an ordinary ChatGPT conversation already provides.

## Why this changed

The earlier plan assumed that a read-only Advisor would naturally become the first major integration feature after Media. That risks building AI because the technology is available rather than because a recurring workflow requires it.

Several proposed examples are weak product justifications by themselves:

- asking AI what is due today when Home can show that deterministically;
- adding recommendation buttons that may be used only occasionally;
- placing an “Advisor” button inside Weekly Review without proving that it improves reflection;
- summarising information that is already two taps away;
- calling an LLM in the background merely to make the application feel intelligent.

The stronger goals are:

1. make the existing PCC spaces capable of contributing to one coherent personal context;
2. use PCC as a practical environment for learning how a genuinely personalised LLM system is designed;
3. discover useful AI workflows through real use instead of selecting them in advance.

## Product goal: coherent personal context

PCC already stores different parts of a person's life in useful but mostly independent domains: Projects, Tasks, Weekly Reviews, Thoughts, Notes, Library, Food, Expenses, Calendar-linked dates, and other future data.

The implemented context foundation makes selected domains able to answer questions such as:

- what is currently being worked toward?
- what is due, overdue, waiting, or repeatedly postponed?
- what has recently changed?
- what books, films, series, or recipes were enjoyed, dropped, or reflected on?
- what themes have appeared across recent Reviews or Thoughts?
- what information is relevant to the current question without exposing the whole database?

This context is useful infrastructure even if no LLM feature survives. It may later support Weekly Rhythm, Home summaries, search, exports, external integrations, a ChatGPT connector, or other cross-space workflows.

## Personal Context Layer

The context layer is implemented in `src/domain/personal-context.ts`.

It currently supports nine explicit domains:

- Projects;
- Tasks;
- Weekly Reviews;
- Weekly Rhythm;
- Thoughts;
- Notes;
- Library;
- Food;
- Expenses.

`buildPersonalContext({ domains, purpose, limits })` composes those domains from the normal canonical Personal Data snapshot. The result is deterministic, read-only, and versioned.

The implementation:

- exposes the current Weekly Review draft plus bounded recent completed reviews, including reflective fields such as what happened, what went well, what was difficult, what was learned, and what should change next;
- exposes current Weekly Rhythm intentions, target/progress, and resolved Weekly Focus;
- keeps open/current work prominent while retaining bounded recent completions;
- preserves stable record IDs for grounding;
- applies per-domain record caps, recency windows, text truncation, and project-action caps;
- exposes derived Library/Food/Expense representations rather than raw special-note metadata;
- tolerates sparse domains and empty history;
- does not require or call any model provider;
- does not expose Calendar or Markets yet because no selected consumer needs them;
- cannot request Keychain because Keychain is absent from the domain type/parser/builder.

The authenticated endpoint is `GET /api/personal-context?domains=...&purpose=...`. It only accepts declared domains and loads state after normal session authentication.

A generic `query_database` tool for an LLM remains explicitly outside the architecture.

## Context Inspector

The internal **Context Inspector** is implemented at `/spaces/context` and is reachable through the System group in All Spaces.

It lets the user select context domains and a purpose, then shows:

- the exact generated JSON representation;
- the active record/recency/text/action limits;
- character count;
- an approximate token count.

This is primarily a development and privacy-audit tool rather than an everyday workflow. It makes it possible to inspect exactly what a future integration may receive before any provider API key or model request exists.

The current Inspector shows **raw bounded domain context**, not the final retrieval behavior a future Advisor should use. Its record/recency limits are output bounds, not a statement that older records become unsearchable. A future question-driven **Resolved Context** mode should show planner output, retrieval candidates, ranking reasons, current-state additions, and the final budgeted bundle.

See [`context-retrieval-memory.md`](context-retrieval-memory.md).

## LLM sandbox

After the context foundation has been exercised by deterministic integrations and real usage, PCC may add a deliberately experimental LLM surface.

The sandbox should exist to answer engineering questions, not to justify an “AI” label. A first version may expose:

- free-form prompt and multi-turn conversation;
- selected PCC context domains;
- model identifier;
- reasoning/effort setting where supported;
- input and output token usage;
- estimated/request cost;
- latency;
- expandable view of context sent to the provider;
- provider errors and limits without affecting normal PCC workflows.

Calls should occur only through explicit user interaction. No periodic background LLM polling is needed for the experiment.

The sandbox does not initially need to appear as a normal All Spaces destination. A developer/experimental settings surface is sufficient.

## What conversations are interesting

The experiment is not limited to recommendations.

A more meaningful long-term possibility is a conversational counterpart that can combine broader model knowledge with relevant personal context.

Examples include:

- discussing a book after finishing it rather than merely storing a rating;
- returning months later to compare a new book with an older reading experience and previous reflection;
- asking for another perspective on a conclusion reached in a Weekly Review;
- discussing a work, study, or life decision while the model can see the current relevant Projects and recent reflections;
- exploring an idea without forcing the conversation to create a Task, Thought, or Note.

These examples are deliberately conversational. PCC should not pretend that adding a model beside a workflow automatically turns it into a therapist, coach, project manager, or expert advisor.

## Retrieval and memory

Long-lived personalisation should not be implemented by continually resending an unbounded transcript, and the current twelve-record/90-day context bounds should not make older personal history undiscoverable.

The architecture now separates:

### Canonical PCC archive

Projects, Tasks, Library entries, Reviews, Thoughts, Notes, Food, Expenses, and other normal application records remain canonical in their domains.

All retained eligible history can later participate in retrieval, even when it is too old or too numerous to appear in the default Personal Context bundle.

### Retrieval corpus

Eligible canonical records can be projected into derived retrieval documents with stable source IDs, searchable text, dates, domain, and metadata.

The retrieval corpus may be much larger than an active model prompt.

A future request should search that corpus first, then apply record/token limits **after ranking**.

### Short-term conversation state

Recent conversation turns can be sent verbatim for normal follow-ups.

### Episodic memory

Older conversations or dense historical periods may later receive compact summaries that remain linked to their source records.

Retrieval can find a summary first and expand to original material when needed.

### Stable personal memory

A much smaller PCC-owned store may eventually hold durable conclusions/preferences worth carrying between conversations.

Stable memories should retain provenance and distinguish explicit user statements, deterministic facts, and model inference. They must be editable, supersedable/retirable, exportable, and deletable.

The desired request shape is therefore:

```text
recent conversation
+ current canonical state
+ relevant retrieved old records
+ relevant episodic summaries
+ relevant stable memories
```

rather than months of raw transcript or a permanently growing context dump.

See [`context-retrieval-memory.md`](context-retrieval-memory.md) for the detailed retrieval, ranking, token-budget, and memory design.

## Learning from experience

“Learning from experience” should not initially mean fine-tuning a model on private PCC history or allowing a model to silently rewrite its own behaviour.

A safer first interpretation is **archive + retrieval + memory + feedback**:

1. fresh canonical PCC state describes what is true now;
2. the complete retained eligible archive remains searchable even when records fall outside default context bounds;
3. retrieval selects only old records relevant to the current question;
4. older conversations or dense periods may produce bounded episodic summaries;
5. stable memories store only durable conclusions/preferences worth carrying forward;
6. user corrections or explicit feedback can revise or retire stored memories.

This keeps learning inspectable and model-independent. A provider can improve or be replaced without losing PCC-owned experience.

If automatic memory proposals are explored, each stored memory should eventually have enough provenance to answer questions such as:

- where did this conclusion come from?
- when was it last supported or corrected?
- is it an explicit user statement, a deterministic fact, or a model inference?
- can it be edited, forgotten, or marked stale?

Weekly Review is especially valuable here because it already contains deliberate reflection. Repeated themes across reviews may later justify a **candidate observation**, but the model should not silently promote an inferred pattern into durable truth.

Fine-tuning, self-modifying prompts, or autonomous “personality learning” are not needed for the first useful Advisor experiment.

## Model independence

PCC-owned context and memory should not depend on one model generation.

If the model changes later, the new model should be able to consume the same canonical PCC data, context providers, and stored memory. Model upgrades may change interpretation or quality, but should not erase the personal history merely because a provider releases a new model.

This is another reason to keep durable personal memory in PCC rather than treating provider-side response storage as the long-term memory architecture.

## Local inference option

The model adapter should not assume that inference must come from a hosted API.

A local model served from the PCC deployment host or another trusted machine may be useful for privacy, experimentation, and avoiding per-request API cost. It should still sit behind the same provider boundary as a hosted model:

- PCC builds the same bounded Personal Context;
- the adapter sends a normal request to the configured inference endpoint;
- conversation/memory remains PCC-owned;
- provider-specific response formats are normalised before the rest of the application sees them;
- switching between local and hosted models should not require changing canonical context or memory storage.

Local inference should be benchmarked on the actual deployment hardware before product decisions are made. Model size, latency, context length, and answer quality may make a local model appropriate for some tasks but not others.

The important architectural decision is provider independence, not choosing a specific local model now.

## Provider, model, and cost learning goals

The sandbox is also an intentional engineering-learning project.

Questions worth testing with the same representative prompts include:

- which model quality is actually necessary?
- when does higher reasoning effort improve the result?
- how much context is useful before it becomes noise?
- what is the token/cost impact of different domain limits?
- should some tasks use a cheaper model than long-form discussion?
- how should failures, timeouts, rate limits, and provider changes be handled?
- how should provider-side response storage differ from PCC-owned memory?

Provider credentials must remain server-side. Browser clients must never receive API keys.

Before production use, the integration should have explicit request-size, timeout, rate-limit, and spending controls. Raw generated context, prompts, responses, and secrets should not leak into ordinary application logs.

The experiment should expose enough usage data that cost is understandable rather than surprising.

## Data permissions

External-model access remains user-scoped and domain-scoped.

Reasonable eligible domains include:

- Projects;
- Tasks;
- Weekly Reviews;
- Library;
- Food;
- Thoughts;
- Notes, only with stronger privacy treatment;
- Expenses, only when deliberately enabled and preferably through bounded/derived context where possible.

Sparse data is valid. A missing Movie history, for example, means the system has little evidence; it must not infer that unseen films were disliked or unwatched.

### Permanent Keychain exclusion

Keychain is **never** an AI/context domain.

The Personal Context Layer and any LLM adapter must have no dependency on Keychain tables, Keychain API responses, ciphertext, metadata, labels, URLs, decrypted values, or unlocked client state.

This is a structural security boundary, not a system-prompt instruction.

## Read/write boundary

Initial LLM experiments remain read-only with respect to canonical PCC data.

This does not mean all future useful AI must remain read-only. A later tool-oriented system could make actions such as:

- reschedule a Task or project action;
- create a generated shopping-list Note;
- add a proposed item to a wishlist;
- create a new normal action from a conversation.

However, a model should propose a **specific structured mutation**, PCC should display it, and the user should explicitly confirm it through the normal deterministic mutation pathway.

Do not give a model unrestricted database-write access, and do not silently create Thoughts, Notes, Tasks, or other records merely because a conversation occurred.

## Proactivity

A future Jarvis-like experience may include proactive observations, but background LLM calls are not a starting requirement.

Where possible, deterministic PCC logic should detect facts for free, such as:

- an overdue action;
- a repeatedly rescheduled item;
- an unfinished Weekly Review;
- a project with no open action.

An LLM should only be invoked when interpretation adds material value. Deterministic software should detect facts; AI may later interpret them.

Proactivity must also prove that it is helpful rather than noisy before becoming a recurring behaviour.

## External conversational interfaces

PCC does not necessarily need to own the best conversational UI.

A later alternative is to expose carefully scoped read tools/context providers to an external assistant such as ChatGPT through an appropriate connector/tool protocol. In that architecture:

- PCC remains the canonical personal data source;
- the external assistant remains the conversation environment;
- the same Personal Context Layer can serve both PCC's own experiments and the external connection;
- write tools, if ever exposed, require their own stronger authorization and confirmation design.

Provider/product availability may change, so this is an architectural option rather than a dependency.

## Promotion gate: when does this become an Advisor?

Do not promote the sandbox into a polished Personal Advisor merely because the API works.

Promotion should require evidence that the experience does something meaningfully better than:

- deterministic PCC views;
- a normal ChatGPT conversation with manually supplied context;
- occasional standalone recommendation requests.

Signals that may justify promotion include:

- the user repeatedly returns to conversations because historical PCC context materially improves them;
- persistent memory improves continuity across unrelated sessions;
- cross-domain reasoning reveals useful relationships that are inconvenient to assemble manually;
- contextual or confirmed-action workflows save real navigation/maintenance effort;
- the user would notice and miss the capability if it disappeared.

If those signals do not appear, the experiment may remain a developer tool, be removed, or evolve into an external PCC-to-assistant connector instead of a permanent PCC space.

## Explicit exclusions for the initial experiment

- a committed standalone Advisor space;
- autonomous agents;
- unrestricted database reads or writes;
- Keychain access of any kind;
- automatic creation of personal records from ordinary conversation;
- treating embeddings/vector search as mandatory before deterministic retrieval has been tested;
- unbounded transcript replay as memory;
- proactive periodic LLM polling;
- autonomous purchases, bookings, messages, or Calendar changes;
- replacing deterministic Tasks, Projects, Review, Library, or other application state with model-generated truth.

## Likely sequence

1. Personal Context Layer and Context Inspector — **implemented**;
2. Weekly Rhythm and Review integration — **implemented in PR #79; under real-use testing**;
3. **Context Retrieval Foundation** — project eligible canonical history into retrieval documents, add deterministic full-history search, and add a question-driven Resolved Context Inspector;
4. add a provider-neutral structured **Context Planner** that converts a user question into validated domain/search instructions;
5. add hybrid semantic retrieval only where lexical/exact retrieval misses useful conceptual matches;
6. add a small final-answer LLM sandbox with inspectable planner/retrieval/context/token/cost data;
7. experiment with episodic summaries and provenance-aware stable memory;
8. only then consider safe confirmed tools or a polished Advisor;
9. decide from actual use whether PCC needs its own Advisor UI, contextual AI features, an external assistant connector, or no permanent AI product at all.

The core rule remains: **PCC should become more coherent before it becomes more intelligent.**