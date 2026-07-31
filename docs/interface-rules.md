# Interface Rules

These rules define the structural baseline for the interface-personality slice. They should be applied before introducing broader palettes or theme-specific styling.

The guiding principle is:

> Show the space, its content, and only metadata that helps the user make a decision.

The application is a personal tool used repeatedly by someone who already understands its spaces. Permanent explanations should not consume screen space after the workflow is known.

## 1. Mobile navigation and the Spaces directory

### Spaces access

- Remove the floating Spaces button from the top-right of mobile pages.
- Remove the top spacer or reserved vertical area created for that button.
- Keep the desktop side rail unchanged.
- Add a small upward chevron or handle attached to the centre action in the mobile dock.
- The handle must be tappable and open the existing Spaces directory.
- A swipe-up gesture from the centre of the dock may be supported as a secondary shortcut.
- Spaces must never be available only through a hidden gesture.

The first implementation may use normal navigation to the existing Spaces page. A bottom sheet or drawer should be considered only after real use shows that full navigation is unnecessarily heavy.

### Spaces directory

- Present each destination as a compact icon-and-name row or card.
- Remove permanent descriptive sentences from directory entries.
- Reduce card height while preserving comfortable phone touch targets; approximately 60–72 px is the intended range.
- Use one shared icon-container size, SVG size, and stroke weight.
- Apply small optical corrections where icons with identical dimensions still appear visually mismatched.
- Keep Account & access at the end of the directory because it is a settings destination rather than a primary working space.

A normal entry should contain only:

```text
[icon]  Projects
```

## 2. Space headers and permanent copy

### Default rule

A normal working space should display its name and then its content. Do not add a pretitle, slogan, explanation, or usage instructions unless the information changes the user's current decision.

Use title-only headers for:

- Notes;
- Projects;
- Tasks;
- Thoughts;
- Accomplishments;
- Archive;
- Account & access.

Remove decorative full stops from space names and headings. Naming and punctuation should remain clean and consistent.

### Useful dynamic context

Small dynamic context may remain when it communicates current state:

- Inbox may show a useful item count;
- Review may show the current review period;
- Library may show the number of books;
- offline state may show a clear warning because it changes application behavior.

Dynamic context should be concise and visually secondary to the space name.

### Instructions

Instructions belong near the moment where they are needed, including:

- an empty state;
- a destructive or irreversible action;
- a complex field;
- a one-time onboarding message;
- an error or unavailable state.

Do not permanently place usage instructions above familiar content.

These copy rules apply on both phone and desktop. Desktop width is not a reason to retain text that does not help.

## 3. Home

- Do not display an Online label; online is the expected state.
- Keep offline mode visibly distinct because it changes capture and synchronisation behavior.
- Replace generic introductory copy with one short greeting.
- Select the greeting once per app session or once per day so it does not change during normal rerenders.
- Keep greetings calm and brief.
- A greeting should normally contain approximately two to five words.

Suitable initial examples include:

- What's going on?
- What's next?
- Anything on your mind?
- What matters today?
- Ready when you are.
- Where are we?

The greeting provides personality but must not pressure the user, imply failure, or manufacture urgency.

## 4. Visual consistency

Before themes are introduced, the neutral interface should use shared rules for:

- page-header spacing;
- card radius, border, shadow, and padding;
- button heights and emphasis levels;
- field heights and labels;
- icon boxes, dimensions, and stroke weight;
- navigation selected and unselected states;
- heading hierarchy;
- muted text hierarchy;
- empty-state layout;
- phone safe-area and dock spacing.

A palette must not be used to hide inconsistent hierarchy or spacing. Structural consistency comes first.

## 5. Theme scope

Themes are intentionally small. Their first implementation should mainly change two things:

1. the application color palette;
2. the centre Home/Capture icon in the mobile navigation dock.

Do not turn each theme into a separate redesign. Layout, typography, spacing, information hierarchy, component behavior, semantic icons, and workflows should remain consistent across themes.

### Default theme

- Keep a **Default** theme using the current neutral colors.
- Keep the current centre Home/Capture icon in the Default theme.
- Default remains the reliable fallback when a theme is missing, removed, or malformed.

### Color direction

- Prefer faint, muted, pastel, dusty, or otherwise low-saturation colors.
- A theme may use moderately richer accents where needed for identity, but should avoid highly saturated, striking, fluorescent, or visually exhausting surfaces.
- Stronger accents should be concentrated in selected navigation, the centre action, primary buttons, focus states, and small details rather than filling normal reading surfaces.
- The initial palette choices may be selected during implementation and then tweaked or removed after phone testing.
- Theme support should be implemented through shared tokens or CSS variables rather than page-specific overrides.

Themes must not redefine semantic meaning:

- overdue, destructive, and error states retain a stable danger treatment;
- Waiting retains a stable amber/yellow treatment;
- success, disabled, focus, and accessibility states remain understandable;
- contrast remains readable on phone and desktop;
- themed surfaces must not make semantic indicators ambiguous.

### Theme names

Use the actual game names as the user-facing theme names rather than invented substitutes. The application is a small personal project, and direct naming is preferred over disguised references.

Keep **Default** alongside the game themes.

### Centre navigation icon

Each game theme may replace only the centre Home/Capture icon with one simple, recognisable game symbol. The replacement should remain icon-like rather than becoming detailed artwork.

Agreed examples:

- **Pokémon** — Poké Ball;
- **The Witcher 3** — simplified wolf medallion/head symbol;
- **Hades** — simplified skull symbol associated with the cover identity.

Additional themes may receive equivalent symbols during implementation. The icon should:

- remain readable at the existing dock-button size;
- preserve the same tap target and Home/Capture action;
- retain an accessible label independent of its visual shape;
- avoid excessive detail, gradients, or illustration-style rendering;
- be easy to tweak or remove when the theme is tested on the phone.

The first theme pass does not require theme-specific typography, animation systems, page layouts, sound, large background art, or extensive decorative motifs. Those remain optional future additions only after the palette-and-icon model proves worthwhile.

### Advanced art-direction themes — later

A later theme may go beyond palette and centre-icon changes when the source has a particularly distinctive visual language. For example, a **Clair Obscur: Expedition 33** theme could echo its painterly direction through restrained brush-stroke borders, textured separators, or a hand-painted treatment around the mobile navigation shell.

Rules for this later tier:

- preserve the same layout, navigation meaning, hit areas, and workflows;
- express the art direction through surface treatment, borders, separators, background texture, or similarly non-semantic decoration;
- keep the result readable and calm enough for everyday use;
- do not allow decorative brushwork, texture, or irregular edges to obscure controls or semantic states;
- build these effects as optional theme tokens or decorative layers rather than one-off page rewrites;
- validate the simpler palette-and-icon system first before prioritising advanced art-direction themes.

This is a future improvement, not part of the initial theme implementation.

## 6. Implementation order

The interface-personality slice should proceed in this order:

1. remove mobile Spaces-button overlap and wasted top space;
2. add the accessible dock-attached Spaces handle;
3. simplify headers and remove permanent explanatory copy;
4. compress and standardise the Spaces directory;
5. remove the Home Online label and add restrained rotating greetings;
6. consolidate shared spacing, typography, card, control, and icon rules;
7. define neutral and semantic color tokens;
8. add theme selection with Default as the fallback;
9. add muted game-named palettes and their centre navigation icons;
10. test each theme on a real phone and tweak or remove anything too saturated, noisy, or unclear.

This order keeps usability changes reviewable and prevents palette work from becoming coupled to unresolved layout problems.

## 7. Acceptance checklist for the structural UI pass

- No mobile page reserves blank top space for the Spaces button.
- Spaces remains discoverable and tappable without requiring a gesture.
- No page header overlaps navigation controls at supported phone widths.
- Working spaces open with their content visible earlier on the screen.
- Space names use consistent capitalization and punctuation.
- Permanent copy is limited to useful dynamic context.
- Directory icons have consistent perceived size and weight.
- Compact directory rows retain adequate touch targets.
- Account & access is grouped after the working spaces.
- Online state is silent; offline state remains explicit.
- Home greetings remain short, stable during a session, and non-pressuring.
- The Default theme retains the current neutral palette and current centre icon.
- Alternate themes mainly change colors and the centre navigation icon.
- Theme palettes remain muted enough for sustained everyday use.
- Game themes use their actual game names.
- Theme icons remain simple, recognisable, accessible, and functionally equivalent.
- Semantic state colors remain understandable in every theme.
