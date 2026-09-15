# Personal Context and LLM Experiments

## Status and decision

A standalone **Personal Advisor** is no longer a committed next product feature.

The useful conclusion from the original Advisor design is broader: Personal Control Center should first gain a reusable **Personal Context Layer** that can represent selected information across its existing domains without giving integrations blanket database access.

After that foundation exists, PCC may host a small **LLM sandbox** to learn how provider APIs, model choice, reasoning effort, context construction, memory, tool use, privacy, and cost behave with real personal data. The sandbox is an experiment, not a promise that PCC needs a permanent AI chat surface.

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

The next architectural goal is to make selected domains able to answer questions such as:

- what is currently being worked toward?
- what is due, overdue, waiting, or repeatedly postponed?
- what has recently changed?
- what books, films, series, or recipes were enjoyed, dropped, or reflected on?
- what themes have appeared across recent Reviews or Thoughts?
- what information is relevant to the current question without exposing the whole database?

This context is useful infrastructure even if no LLM feature survives. It may later support Weekly Rhythm, Home summaries, search, exports, external integrations, a ChatGPT connector, or other cross-space workflows.

## Personal Context Layer

Each eligible domain should expose a compact, deterministic, user-scoped representation of the information another feature may need.

Conceptual providers may resemble:

```text
getProjectContext(...)
getTaskContext(...)
getReviewContext(...)
getLibraryContext(...)
getFoodContext(...)
getThoughtContext(...)
getExpenseContext(...)
```

The exact function names and representation are implementation details. The important boundary is that integrations consume deliberate domain context rather than arbitrary database rows.

A higher-level builder may compose selected providers:

```text
buildPersonalContext({
  domains,
  purpose,
  limits,
})
```

### Context-layer rules

The layer should:

- use deterministic application state as the source of truth;
- be scoped to the authenticated user;
- expose only explicitly requested domains;
- prefer current state, ratings, reflections, dates, status, and bounded recent history;
- preserve stable record identifiers where useful for grounding;
- distinguish missing data from negative evidence;
- tolerate sparse history rather than requiring exhaustive backfilling;
- have predictable size limits;
- remain useful without any AI provider;
- never depend on Keychain tables, APIs, ciphertext, metadata, decrypted state, or client modules.

A generic `query_database` tool for an LLM is explicitly not the target architecture.

## Context Inspector

During development, a small internal **Context Inspector** is desirable.

It should make the context boundary visible rather than magical. Useful information may include:

- enabled domain;
- record/count summary;
- approximate byte/token size;
- the exact structured/text representation that an integration would receive;
- applied recency or count limits.

This is primarily a development and privacy-audit tool, not a new everyday PCC space.

It should be possible to validate the Personal Context Layer before any provider API key exists.

## LLM sandbox

After the context foundation works, PCC may add a deliberately experimental LLM surface.

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

## Memory experiments

Long-lived personalisation should not be implemented by continually resending an unbounded transcript.

If persistent conversational memory is explored, separate at least four concepts:

### Canonical PCC state

Projects, Tasks, Library entries, Reviews, Food, Expenses, and other application records remain canonical in their normal domains and are queried fresh when relevant.

### Short-term conversation state

The recent portion of the current conversation can be sent verbatim for normal follow-ups.

### Stable personal memory

A much smaller PCC-owned store may eventually hold durable information learned through conversations, such as preferences, recurring concerns, or explicit user instructions.

Possible approaches should be evaluated rather than assumed:

- explicit “remember this” only;
- model-proposed memories requiring user confirmation;
- automatically extracted memories with review/edit/delete controls;
- deterministic extraction for narrowly defined facts.

### Episodic conversation memory

Older conversations should be summarised or selectively retrieved when relevant rather than replayed in full. For example, a discussion about a particular book could be retrieved when that book becomes relevant again without attaching months of unrelated conversation.

The purpose is bounded continuity: recent messages + relevant old material + compact stable memory + fresh PCC context.

Conversation/memory storage, deletion, export, backup, retention, and privacy need explicit design before any persistent memory is shipped.

## Model independence

PCC-owned context and memory should not depend on one model generation.

If the model changes later, the new model should be able to consume the same canonical PCC data, context providers, and stored memory. Model upgrades may change interpretation or quality, but should not erase the personal history merely because a provider releases a new model.

This is another reason to keep durable personal memory in PCC rather than treating provider-side response storage as the long-term memory architecture.

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
- mandatory embeddings/vector search;
- unbounded transcript replay as memory;
- proactive periodic LLM polling;
- autonomous purchases, bookings, messages, or Calendar changes;
- replacing deterministic Tasks, Projects, Review, Library, or other application state with model-generated truth.

## Likely sequence

1. implement and test the Personal Context Layer without an LLM;
2. add an internal Context Inspector;
3. configure one hosted model/provider and explicit cost controls;
4. add a small multi-turn LLM sandbox;
5. experiment with context selection, model/effort, token/cost reporting, and real questions;
6. only then evaluate persistent conversation summaries, stable memory, retrieval, or safe tools;
7. decide from actual use whether PCC needs a Personal Advisor, contextual AI features, an external assistant connector, or no permanent AI product at all.

The core rule remains: **PCC should become more coherent before it becomes more intelligent.**