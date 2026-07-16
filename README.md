# Personal Control Center

A personal planning and tracking application designed to reduce cognitive load by bringing responsibilities, projects, habits, reading, travel plans, and automated activity data into one coherent system.

## Product principles

- Capture first; organise later.
- Show what matters now instead of everything stored.
- Keep active work separate from incubating ideas.
- Automate data entry where reliable integrations exist.
- Let AI suggest structure without silently changing user data.
- Remain useful before any external integrations are configured.

## Initial scope

The first usable release will include:

- Inbox capture
- Areas
- Projects
- Tasks and next actions
- Notes
- Statuses and priorities
- A focused **Now** view
- Weekly review support
- Search
- Responsive mobile-friendly layout

Specialised trackers and integrations—books, travel, Strava, calendar, price alerts, and AI assistance—will follow after the core workflow is validated.

## Repository structure

```text
app/                  Next.js application
components/           Shared UI components
lib/                  Domain and infrastructure code
docs/                 Product and architecture documentation
.github/               Issue and pull-request templates
```

## Development workflow

1. Start with a GitHub issue describing the outcome.
2. Work on a feature branch.
3. Open a draft pull request.
4. Review behaviour and product decisions.
5. Merge into `main` after approval.

See [`docs/product-spec.md`](docs/product-spec.md), [`docs/roadmap.md`](docs/roadmap.md), and [`CONTRIBUTING.md`](CONTRIBUTING.md).
