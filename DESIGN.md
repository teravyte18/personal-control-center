---
name: Personal Control Center
description: Focus on phone, Atlas across wider working surfaces.
colors:
  background: "#f8fafc"
  foreground: "#0f172a"
  surface: "#ffffff"
  accent: "#0f172a"
  accent-hover: "#1e293b"
  accent-foreground: "#ffffff"
  line: "#e2e8f0"
  muted: "#5c616e"
  quiet: "#f4f5f5"
  selected: "#ececee"
  danger: "#881337"
  waiting: "#78350f"
  success: "#064e3b"
typography:
  headline-phone:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: "34px"
    letterSpacing: "0"
  headline-wide:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "30px"
    letterSpacing: "0"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "24px"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
    lineHeight: "24px"
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    lineHeight: "20px"
  metadata:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    lineHeight: "18px"
rounded:
  artwork: "6px"
  control: "12px"
  surface: "16px"
spacing:
  compact: "4px"
  small: "8px"
  row: "12px"
  standard: "16px"
  surface: "20px"
  section: "24px"
  wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "11px 16px"
  button-quiet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "11px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "11px 12px"
  navigation-active:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    typography: "{typography.label}"
    padding: "12px 8px"
  record:
    typography: "{typography.label}"
    padding: "12px 16px"
  surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
    padding: "20px"
---

# Design System: Personal Control Center

## Overview

**Creative North Star: "Focus + Atlas"**

The owner selected Focus for phone and Atlas for desktop. Phone screens give immediate work a clear place; wider screens expose related records and useful context side by side. A compact labelled rail bridges laptop widths. The interface is matter-of-fact, readable and precise, with flat rows, restrained surfaces and direct labels.

This document describes the implemented application. The latest approved Figma direction in file `rtPqrxzyCazl5XIIaorQ7Y` (start `60:996`, Focus `40:997`, Atlas `40:998`, Library `45:1349` / `45:1818`) establishes visual intent; the running source establishes actual tokens and behavior. Earlier directions and the deferred graph Home are outside this system. Preserve existing theme identities, private artwork and personal-data behavior when extending screens.

**Key Characteristics:**

- One locally served type family with a clear, compact hierarchy.
- Flat working rows; surfaces group work and context.
- Phone focus expands into desktop context without changing record meaning.
- Ten existing palettes and their Capture artwork remain available.
- Native controls, visible keyboard focus and readable loading/error states.

## Colors

The default palette uses a pale workspace, white surfaces, dark ink and quiet neutral selection. The frontmatter records default-mode values and shared semantic foregrounds; runtime theme variables remain authoritative.

### Primary

- **Accent** is the theme accent used for selection text treatment, caret and keyboard focus. Strong primary actions inside the working surface use foreground ink on workspace background.
- **Capture treatment** uses the separate home background, foreground and border variables in navigation. It can differ from both ink and accent in a theme.

### Neutral

- **Background** is the workspace; **Surface** is the rail, dock, controls and grouped forms.
- **Foreground** is primary text and working-surface primary action fill.
- **Muted** is supporting context and metadata; **Quiet** backs artwork placeholders.
- **Line** defines inputs, quiet controls and structural dividers; **Selected** identifies active navigation and row hover.

### Named Rules

**The Theme Authority Rule.** Resolve colors through the existing CSS variables. `src/app/globals.css` owns all ten palettes: Default, Pokémon, Hades, Hades II, Hollow Knight, Silksong, Elden Ring, Cyberpunk 2077, The Witcher 3 and Stardew Valley. `src/lib/theme.ts` owns their names, previews and browser color metadata. Do not infer new palette-to-feature mappings from preview swatches.

**The Semantic Status Rule.** Danger, waiting and success retain the shared semantic foreground, muted text and border families in `src/app/semantic-status.css`. Their pale status backgrounds need readable foregrounds even when a theme remaps the slate scale.

In non-default themes, muted text resolves to slate-600, quiet surfaces to slate-100, and selection mixes foreground into the current surface. Theme choice persists on this device, applies before hydration, synchronizes through the preference store and updates browser theme color.

## Typography

**Display Font:** DM Sans, with sans-serif fallback.
**Body Font:** DM Sans, with sans-serif fallback.

The variable font is served locally from `public/fonts/dm-sans.ttf`, with swap loading and optical sizing. Ordinary controls and metadata remain compact; medium weight supplies hierarchy without heavy headings. Section titles and record titles wrap rather than hiding meaningful text.

### Hierarchy

- **Phone headline:** the headline-phone token for main headings and authentication headings.
- **Wide headline:** the headline-wide token from the laptop breakpoint; also used for focused action and selected collection titles.
- **Title:** the title token for sections.
- **Body:** the body token for longer descriptions and textareas.
- **Label:** the label token for controls and record titles.
- **Metadata:** the metadata token for counts, dates, secondary details and phone dock labels.

**The Readable Control Rule.** Inputs use a minimum touchable height and 16px body text on phone; native controls remain readable regardless of pointer classification. Authentication inputs and textareas already use the body size. Keep browser zoom available and preserve native date, select and file input behavior.

## Layout

Phone is the base layout below (768px): a compact Home / Account header with a distinct surface, one working column and a fixed single-row dock. The dock preserves four configurable pins plus Capture and Spaces. Header and dock account for safe-area insets. When a focused editing control and the visual viewport indicate a software keyboard, the dock hides until the keyboard is dismissed. Main content includes bottom clearance for the dock, and editors reserve clearance for their fixed action bar.

From (768px), phone navigation disappears and a labelled rail occupies (112px). The workspace offsets by that width, with (32px) top and (24px) horizontal padding. Context layouts become two columns where implemented: tasks, notes, Week, food, review, music and Capture. Projects switch from one selected focus to ownership rows with associated actions.

From (1200px), the rail grows to (200px), its context label appears, and horizontal workspace padding increases to (32px). Library adds a sticky selected-record panel beside its collection. This collection detail threshold is distinct from the earlier two-column working layouts.

Use the frontmatter spacing steps: small gaps within controls, standard gaps within groups, section gaps between working regions. Main phone padding is (20px). Library uses two artwork columns on phone and four from laptop, with row and column gaps that allow wrapped captions. No universal centered maximum width is imposed on working pages; individual forms and reading surfaces constrain their own width.

**The Context Follows Space Rule.** Expose additional context when the available width supports it. Keep the phone's selected record and action understandable on their own.

## Elevation & Depth

Working surfaces are flat at rest. Background changes, borders, whitespace and selection provide depth; the Focus + Atlas override removes the inherited small and large shadows and backdrop blur on working surfaces. Structural rows remain compact within visibly bounded groups. Week and Home sections use a consistent surface, divider and internal padding; whitespace alone must not carry section hierarchy. Editor overlays are opaque workspace surfaces above navigation, with a surface-colored fixed action bar.

Inputs retain the existing soft focus ring alongside the global visible keyboard outline. Do not generalize that ring into resting card elevation. Motion is limited to existing control feedback; coarse touch does not depend on hover. Reduced-motion preference makes transitions and animations effectively immediate and disables smooth scrolling.

## Shapes

Controls and navigation use the control radius; grouped forms, selected context and empty containers use the surface radius. Artwork uses the smaller artwork radius and clips its content. Common controls are at least (44px) high, rail links (48px), dock items (50px), and space links (64px). Rows use an open silhouette rather than nested rounded cards. Collection status text is plain metadata, not a decorative pill.

## Components

### Buttons

Direct, labelled and compact. Quiet controls use surface fill and a one-pixel theme line; working-surface primary actions and selected view controls use foreground ink with reversed background text. Fine-pointer hover strengthens the control border; active buttons and links reduce opacity. Disabled actions retain their existing opacity and unavailable cursor. The universal keyboard outline uses the theme accent (2px), offset (3px).

### Inputs / Fields

Native controls use a theme surface, theme line and the control radius. Search and filter labels may be visually hidden but remain accessible. Focus changes border and adds the existing soft ring. Textareas preserve comfortable body text and vertical editing space. Error messages remain beside the operation, explain the failure, and use live announcements where implemented; saving actions expose their pending text and disabled state.

### Navigation

PCC remains the entry point; Capture, All Spaces and Account remain permanent destinations. Configurable pins carry visible text, with SVG/masked icons in the phone dock. Active links use quiet selection plus `aria-current`. The skip link becomes visible on focus and targets the working surface. Theme-specific Capture art is retained from the existing default mask, Pokémon SVG and artwork sprite.

### Records / Containers

Record rows use compact title and metadata roles, wrap long text and gain a quiet hover background for fine pointers. Use a grouped surface when information has a clear shared boundary; avoid adding a separate card around every field or record. Empty states name the missing content or unmatched filter and show a useful existing action where appropriate.

### Library Artwork / Selected Detail

Private cover artwork is content, not decoration. Portrait covers preserve (2:3), landscape artwork (4:3), with contained images and small clipped corners. Missing images show an explicit text fallback; failed requests show “Image unavailable”; image loading exposes a busy state. Captions remain visible and wrap. The desktop selected detail supports inspection and a clear Open details action; smaller widths open the editor directly.

### Editors / Dialogs

Editors occupy the available working area and keep Cancel / Save in the fixed lower action bar, including safe-area clearance. On wider screens overlays begin after the rail. Existing dialog focus handling makes background branches inert, cycles Tab within visible controls and restores focus to the launcher. Preserve role, accessible naming, modal state, Escape handling and body scroll locking where the editor implements them. Do not replace these behaviors with a purely visual overlay.

### Loading / Connection States

The shell names loading and shows three quiet placeholder rows before personal data is ready. Connection and save banners describe status in text and use live regions. Offline messaging distinguishes queued Capture from other editing; only Capture supports offline operation. Artwork, record loading and connection failure remain separate states with their own truthful messages.

## Do's and Don'ts

### Do:

- **Do** use the existing theme variables and semantic status families for every new surface.
- **Do** retain labelled phone navigation, compact laptop navigation and wider desktop context.
- **Do** wrap record titles and supporting content, including long unbroken strings.
- **Do** preserve native controls, keyboard focus, inert modal backgrounds and safe-area clearance.
- **Do** use real private artwork when available and explicit text fallbacks when it is unavailable.

### Don't:

- **Don't** introduce a new visual metaphor or inherit an archived Figma direction.
- **Don't** turn the deferred graph Home into the navigation model.
- **Don't** invent palette mappings, decorative emoji, promotional eyebrows or nested decorative card stacks.
- **Don't** encode private records, screenshots, credentials or trial host details in design documentation.
- **Don't** change record semantics, authentication, permissions or data behavior as part of visual extension.


## Trial feedback polish — 29 October 2026

The feedback-driven first pass is documented in [`docs/ui-polish-2026.md`](docs/ui-polish-2026.md). It restores directory icons and surfaces, groups Week/Home, corrects expense padding, clarifies outflow-share labels, separates task completion from editing, and shortens phone navigation. Shared `--pcc-line` and `--pcc-divider` tokens distinguish neutral control borders from theme identity linework. Figma and the machine-generated 22 October design snapshot remain references for the original trial, not certification of this follow-up. Runtime CSS and this feedback record describe the current adaptation.
