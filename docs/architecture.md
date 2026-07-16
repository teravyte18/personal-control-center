# Architecture

## Initial approach

Build a responsive web application first, with Progressive Web App capabilities added after the core workflow is stable.

## Proposed stack

- Next.js with TypeScript
- PostgreSQL
- Supabase for hosted database and authentication
- Tailwind CSS for styling
- Vercel for initial deployment
- Playwright for critical end-to-end tests
- Vitest for unit tests

The stack is provisional until the first implementation issue is reviewed.

## Design principles

- Keep domain logic independent from UI components.
- Prefer a small shared item model with explicit specialised extensions.
- Validate all external data at system boundaries.
- Never expose service credentials to the browser.
- Treat integrations as optional adapters so the core app works without them.
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

## Architecture decision records

Use a short record for choices that would be expensive or confusing to revisit. Each record should include context, decision, consequences, and status.
