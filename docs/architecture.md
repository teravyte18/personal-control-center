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

## Security

- Store secrets only in deployment environment variables.
- Use database row-level security when authentication is introduced.
- Request the minimum OAuth scopes required for each integration.
- Keep imported provider payloads separate from user-authored data where practical.
- Treat personal reviews, photos, and location information as private data.

## Architecture decision records

Use a short record for choices that would be expensive or confusing to revisit. Each record should include context, decision, consequences, and status.
