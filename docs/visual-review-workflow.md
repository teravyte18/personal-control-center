# Visual review workflow

**Status: recommended review practice; no product redesign is approved by this document.**

Use this workflow for UI changes, alongside AGENTS.md and CONTRIBUTING.md. Scale the scope to the user job rather than applying a generic restyle.

1. **Describe one user job and freeze a small scope.** For example, “Open a selected action from This week and return to the same week.” Record before/after behavior and anything requiring a product choice.
2. **Capture before touching code.** Use repeatable desktop and phone viewports and the relevant normal, expanded, empty and long-title states. Use fictional representative records in development. The live screenshots in this report should not enter the public repository, issues or PRs.
3. **Write a short design contract.** Specify reading order, primary/secondary actions, information that must remain visible, source ownership, semantic colour meaning and expected behavior at 320 pixels. Reuse existing components and theme tokens.
4. **Review the proposed screen before broad implementation.** A small visual comparison or focused mock is enough for hierarchy changes. Do not ask an agent to “make it modern” across the whole app. For product changes, agree on the job and ownership first.
5. **Implement one independently reviewable slice.** Preserve canonical domain actions, authentication boundaries and current integrations. Keep the existing no-autonomous-write constraints. Avoid a new component library merely for a cosmetic pass.
6. **Inspect the rendered result at the same states and sizes.** Put before and after side by side. Test full labels, long titles, nonzero and empty data, keyboard focus, source links, browser Back, dock clearance and the optional-field expansion. Include at least one light and one dark theme on layout-affecting work; run contrast/semantic-state checks across the full theme set when tokens change.
7. **Run meaningful repository checks.** Follow AGENTS.md for the change's lint, tests, build and Compose validation. Browser screenshots complement those checks; they do not replace functional tests. Avoid tests that merely repeat styling internals.
8. **Write a concise PR description.** State the original user problem, resulting behavior, screenshot/state coverage, remaining limits and any intentional trade-off. Include only fictional examples and safe screenshots in public review.
9. **Review in real use after merge.** Ask whether the specific friction actually decreased. Update current product documents when a role or flow changes, rather than treating an old redesign plan as the deployed truth.

Useful research inputs: Taste Skill's app-screen guidance supports quieter framing, aligned data and browser-based self-review; it is a reference, not a style to impose. Anthropic's Frontend Design guidance supports brief-specific choices and removing visual decoration that does not help the job. Neither justifies replacing PCC's themes or applying a marketing-page aesthetic. [Taste Skill](https://github.com/Leonxlnx/taste-skill), [app-screen guidance](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/references/app-screens.md), [Anthropic Frontend Design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).


The [October UI/UX audit](ui-ux-audit-2026-10.md) and [capture recipe](ui-ux-audit-2026-10-evidence.md) provide concrete review cases. The current application behavior remains documented in the product and feature guides; audit recommendations do not replace them.
