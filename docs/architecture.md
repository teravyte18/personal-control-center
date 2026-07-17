# Architecture

## Initial approach

Build a phone-first responsive web application and package the first mobile experience as an installable Progressive Web App (PWA).

Desktop remains supported, but the primary interaction assumptions are:

- Short, frequent capture sessions from a phone
- One-handed navigation where practical
- Large touch targets and readable layouts without zooming
- Fast startup and minimal required input
- Review sessions that also work comfortably on a larger screen

A separate native Android application should only be introduced if important requirements cannot be met reliably through the PWA.

## Proposed stack

- Next.js with TypeScript
- PostgreSQL
- Supabase for hosted database and authentication
- Tailwind CSS for styling
- Vercel for initial deployment
- Playwright for critical end-to-end tests
- Vitest for unit tests

The first prototype uses browser-local persistence so the workflow can be tested before committing to hosted infrastructure.

## Navigation architecture

Navigation is based on destinations rather than hard-coded page buttons.

### Compact screens

- Four configurable pinned destinations
- One permanent central Capture action
- Floating bottom dock
- All Spaces directory for every current and future module

The MVP defaults are Inbox, Projects, Thoughts, and Review. Capture always routes to the quiet landing page.

### Wider screens

The same destinations become a slim left navigation rail. This is a presentation change only; phone and desktop share the same information architecture.

### Future modules

Library, Trips, Fitness, Habits, and other modules register in `src/lib/navigation.ts`. They first appear in All Spaces and can later become pinnable. Adding a module should not require rewriting the application shell.

## PWA strategy

The PWA should evolve incrementally:

1. Web-app manifest and app-like mobile metadata
2. Home-screen installation
3. Durable hosted storage and authentication
4. Offline-friendly capture
5. Background synchronisation where browser support permits it
6. Push notifications only after the reminder workflow is proven useful

The app must remain usable in a normal browser. Installation should improve convenience rather than create a separate product path.

## Design principles

- Design the smallest viewport first and progressively enhance larger screens.
- Keep domain logic independent from UI components.
- Prefer a small shared item model with explicit specialised extensions.
- Keep navigation configuration data-driven and independent from page layouts.
- Validate all external data at system boundaries.
- Never expose service credentials to the browser.
- Treat integrations as optional adapters so the core app works without them.
- Save user input early and protect unfinished reviews from accidental loss.
- Record significant architecture decisions under `docs/decisions/`.

## Initial domain model

### Area

- id
- name
- description
- status
- created_at
- updated_at

### Item

- id
- title
- description
- type
- status
- priority
- area_id
- start_date
- due_date
- completed_at
- created_at
- updated_at

### Project extension

- item_id
- desired_outcome
- next_action_id

### Relationship

Supports parent-child items, dependencies, and later references between projects, books, trips, and imported records.

## Prototype persistence

The current browser-local model migrates records created by the first prototype into a richer item shape containing kind, area, description, status, and update time. Durable multi-device persistence remains a separate infrastructure slice.

## Security

- Store secrets only in deployment environment variables.
- Use database row-level security when authentication is introduced.
- Request the minimum OAuth scopes required for each integration.
- Keep imported provider payloads separate from user-authored data where practical.
- Treat personal reviews, photos, and location information as private data.

## Architecture decision records

Use a short record for choices that would be expensive or confusing to revisit. Each record should include context, decision, consequences, and status.
