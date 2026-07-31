# Interface Rules

These rules define the structural baseline for the interface-personality slice. They should be applied before introducing broader palettes, decorative motifs, or theme-specific styling.

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
- Keep greetings original, calm, and brief rather than building the identity from recognisable copyrighted catchphrases.
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

## 5. Theme boundaries

Themes may later change neutral presentation tokens such as:

- application and page backgrounds;
- card and elevated surfaces;
- primary and muted text;
- neutral borders and shadows;
- navigation, buttons, links, focus rings, and selected controls;
- restrained decorative accents and motifs.

Themes must not redefine semantic meaning:

- overdue, destructive, and error states retain a stable danger treatment;
- Waiting retains a stable amber/yellow treatment;
- success, disabled, focus, and accessibility states remain understandable;
- contrast remains readable on phone and desktop;
- themed surfaces must not make semantic indicators ambiguous.

Decorative personality must remain subordinate to the content. Themes should make the app enjoyable, not noisier.

## 6. Implementation order

The interface-personality slice should proceed in this order:

1. remove mobile Spaces-button overlap and wasted top space;
2. add the accessible dock-attached Spaces handle;
3. simplify headers and remove permanent explanatory copy;
4. compress and standardise the Spaces directory;
5. remove the Home Online label and add restrained rotating greetings;
6. consolidate shared spacing, typography, card, control, and icon rules;
7. define theme tokens and implement theme selection;
8. add palettes and restrained theme-specific motifs.

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
- The neutral theme remains complete and usable before alternate palettes are added.
