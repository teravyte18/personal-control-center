# Interface Rules

These rules define the current structural and visual baseline after the UI simplification and game-theme slice.

The guiding principle is:

> Show the space, its content, and only metadata that helps the user make a decision.

The application is a personal tool used repeatedly by someone who already understands its spaces. Permanent explanations should not consume screen space after the workflow is known.

## 1. Mobile navigation and All Spaces

### Spaces access

The mobile floating Spaces button and its reserved top area were removed in PR #35.

Current rules:

- Keep the centre Capture action permanent.
- Place a small tappable upward handle beneath it.
- The handle opens the existing All Spaces directory.
- The handle must remain as visible as other unselected dock controls.
- A gesture may be added as a secondary shortcut, but Spaces must never depend on a hidden gesture.
- Respect the phone safe area without creating a decorative blank header bar.

Desktop keeps a permanent Capture action and All Spaces entry in the side rail.

### Spaces directory

- Present each working destination as a compact icon-and-name row/card.
- Do not display permanent descriptive sentences for familiar spaces.
- Preserve comfortable phone touch targets; the normal row is approximately 64 px tall.
- Use one shared icon-container size and consistent perceived icon weight.
- Keep Mobile quick access as an expandable configuration block rather than a working space.
- Keep Account & access after the working spaces.
- Future unavailable spaces may appear separately as subdued placeholders.

A normal entry contains only:

```text
[icon]  Projects
```

## 2. Space headers and permanent copy

A normal working space displays its name and then its content. Do not add a pretitle, slogan, explanation, or usage instruction unless the information changes the user's current decision.

Use title-focused headers for Inbox, Projects, Tasks, Thoughts, Notes, Review, Library, Expenses, Accomplishments, Archive, Account & access, and Spaces. Remove decorative full stops from names and headings.

Small dynamic context may remain when it communicates current state: Inbox item count, Review period, Library book count, Expenses save state or selected analytics context, explicit offline/pending/synchronising/error state, and useful result or view counts. It should remain concise and visually secondary.

Instructions belong near the moment where they are needed: an empty state, destructive action, complex field, one-time onboarding message, error, or unavailable state. Do not permanently place usage instructions above familiar content.

## 3. Home

- Do not display an Online label; online is expected.
- Keep offline, pending, syncing, retry, and last-error states explicit because they change capture behaviour.
- Use one short greeting selected once per browser session.
- Keep greetings calm, brief, and non-pressuring—normally two to five words.

Current examples include “What's going on?”, “What's next?”, “Anything on your mind?”, “What matters today?”, “Ready when you are.”, and “Where are we?”. A greeting must not imply failure, guilt, artificial urgency, or streak pressure.

## 4. Visual consistency

The neutral interface and all themes share page-header spacing; card radius, border, shadow, and padding; button and field heights; icon boxes and perceived weight; navigation states; heading and muted-text hierarchy; empty-state layout; and phone safe-area/dock spacing.

A palette must not hide inconsistent hierarchy or spacing. Structural consistency remains independent from theme choice.

## 5. Current theme model

PR #36 delivered Default, Pokémon, Hades, Hades II, Hollow Knight, Silksong, Elden Ring, Cyberpunk 2077, The Witcher 3, and Stardew Valley.

### Persistence and application

- Theme selection is stored per browser/device under a versioned `localStorage` key.
- It is not synchronised through the authenticated user snapshot.
- The selection applies before first paint to avoid flashing Default during PWA startup.
- Missing or malformed values fall back to Default.
- Browser theme-colour metadata updates with the selection.

### What a theme may change

The current tier may change page/application backgrounds, surfaces, foreground and muted scales, primary/hover accents, borders and restrained line treatment, navigation/focus presentation, and the centre Capture artwork on mobile and desktop.

Themes do not change routes, page layout, typography hierarchy, touch targets, information architecture, workflow behaviour, or domain semantics.

### Colour direction

Muted or pastel colours are a starting point rather than a rigid restriction. A theme should be recognisably connected to its source while remaining comfortable and readable:

- Pokémon uses clean red, white, and charcoal.
- Hades uses warm dark surfaces with gold linework.
- Hades II uses cool dark surfaces with silver linework.
- Hollow Knight uses a deep Crossroads-blue atmosphere.
- Silksong uses stronger Hornet cape red with warm gold detail.
- Elden Ring uses spectral green-blue with gold as the focal accent.
- Cyberpunk 2077 intentionally uses stronger black, red, and bright yellow contrast.
- The Witcher 3 is a light cool landscape/leather/green theme.
- Stardew Valley is greener, creamier, and somewhat more vibrant without matching the game's full saturation.

Default remains the reliable neutral fallback.

### Semantic colours

Themes must not redefine lifecycle meaning. Overdue/destructive/error retain stable danger treatment; Waiting retains amber/yellow meaning; success, disabled, focus, and accessibility states remain understandable; and themed surfaces or linework must not make semantic indicators ambiguous.

### Centre Capture artwork

Default keeps the normal Capture plus symbol. Game themes use recognisable game-related artwork on both phone and desktop while preserving the same tap target, route, accessible name, and Capture meaning. Artwork must fit an equal visual canvas and remain legible at navigation size.

Most artwork is packaged into one small optimised sprite. Pokémon uses a crisp vector Poké Ball matching the chosen reference.

## 6. Theme previews

The Account & access selector shows the theme name, three representative palette colours, and the actual centre artwork on a theme-specific preview background/border. Switching is immediate, the selected theme is clear, and the selector remains readable inside every active theme.

## 7. Advanced art-direction themes — later

A later theme may go beyond palette, linework, and centre artwork when the source has a distinctive visual language. A **Clair Obscur: Expedition 33** theme could use restrained brush-stroke borders, textured separators, or a hand-painted navigation-shell treatment.

This later tier must preserve layout, navigation meaning, hit areas, workflows, readability, and semantic states; use reusable theme tokens/decorative layers instead of page rewrites; and remain a separate future slice rather than unfinished work in the current implementation.

## 8. Current acceptance baseline

- No mobile page reserves blank top space for a floating Spaces button.
- Spaces is discoverable and tappable without requiring a gesture.
- Page headers do not overlap navigation controls.
- Working-space content begins near the top with modest breathing room.
- Permanent copy is limited to useful dynamic context.
- Directory icons have consistent perceived size and weight.
- Account & access follows the working spaces.
- Normal online state is silent; offline state remains explicit.
- Home greetings remain short and stable during a session.
- Default remains visually neutral and reliable.
- Theme selection persists on the current device and applies before first paint.
- Alternate themes change shared tokens and centre artwork without changing workflows.
- Semantic status meaning remains understandable in every theme.
