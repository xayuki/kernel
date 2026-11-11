# Kernel Design System

**Version:** 1.0  
**Direction:** dark technical editorial / precision minimalism  
**Reference:** https://github.com/lotfb86/web-design-skills

## 1. Visual Theme & Atmosphere

Kernel is a personal AI workspace, not a marketing dashboard. It should feel like a quiet, precise instrument for thinking: a near-black canvas, restrained typography, crisp boundaries, and enough empty space to keep the conversation central.

**Key characteristics**
- Near-black canvas with softly stepped graphite surfaces, never a stack of glowing cards.
- Monochrome hierarchy: warm off-white for primary content, neutral grays for supporting information.
- Lowercase wordmark and compact mono labels establish a technical/editorial identity.
- Strong reading column and predictable controls; the layout disappears behind the work.
- Interaction feedback is tactile and deliberate, with spring reserved for chat arrival.
- Background texture is static and low contrast; no decorative motion loops or neon gradients.

**Mood:** calm, focused, private, engineered. The interface should feel considered rather than futuristic for its own sake.

## 2. Color Palette & Roles

| Token | Value | Role | Contrast against #080808 |
|---|---|---|---:|
| --bg | #080808 | Primary canvas | — |
| --surface-0 | #0D0D0D | Recessed surface | — |
| --surface-1 | #111111 | Cards, sidebar, composer | — |
| --surface-2 | #171717 | Elevated / active surface | — |
| --surface-3 | #202020 | Hover surface | — |
| --surface-4 | #292929 | Selected / strong hover surface | — |
| --text | #F1F0EC | Primary text | 17.56:1 |
| --text-2 | #B5B3AC | Body / secondary text | 9.54:1 |
| --text-3 | #8B8982 | Supporting text | 5.72:1 |
| --text-4 | #68665F | Decorative metadata only | 3.49:1 |
| --accent | #E8E6DF | Primary action surface | 16.60:1 for dark text |
| Focus | #D0CEC7 | Keyboard focus against canvas | 12.72:1 |
| Success | #A8C7AF | Connection / save state | Status only |
| Error | #D5A7A2 | Validation / provider errors | Status only |

**Rules**
- Keep large areas neutral. Do not introduce a new accent color for decoration.
- Never use --text-4 for essential instructions or body copy.
- Borders are structural, not the sole means of communicating state.
- Focus is shown with a visible outline or brighter border, never a glow or box-shadow halo.
- Primary button text uses near-black on off-white; normal text contrast is designed to exceed WCAG AA.

## 3. Typography Rules

**Display:** Manrope, Instrument Sans, sans-serif  
**Body:** Instrument Sans, Manrope, sans-serif  
**Mono:** JetBrains Mono, ui-monospace, monospace  
**OpenType:** browser defaults; use tabular numerals for counts and timestamps.

| Role | Family | Size | Weight | Line height | Tracking | Use |
|---|---|---:|---:|---:|---:|---|
| Entry display | Manrope | clamp(58px, 7vw, 105px) | 650 | .96 | -.09em | First-run headline |
| Workspace H1 | Manrope | clamp(43px, 5.8vw, 72px) | 650 | 1.02 | -.075em | Welcome |
| Page H2 | Manrope | clamp(32px, 3.5vw, 45px) | 650 | 1.05 | -.065em | Secondary views |
| Section H3 | Manrope | 20px | 650 | 1.2 | -.04em | Section headings |
| Body | Instrument Sans | 15px | 400 | 1.65 | -.012em | Chat / descriptions |
| Body small | Instrument Sans | 12px | 400 | 1.5 | 0 | Supporting details |
| Label | JetBrains Mono | 10px | 500 | 1.4 | .12em | Metadata / eyebrow |
| Code | JetBrains Mono | 12px | 400 | 1.7 | 0 | Code blocks / editor |

Use balanced line wrapping on headings, overflow-wrap: anywhere for generated content, and tabular numerals for counts.

## 4. Component Stylings

### Buttons
- Primary: #E8E6DF background, #090909 text, 8–10px radius, 40–52px height.
- Primary hover: slightly brighter surface and 1px lift; no shine sweep.
- Secondary: #171717 background, subtle border, secondary text.
- Focus: 2px solid #D0CEC7, 3px offset. Active: scale to .96–.99.
- Icon buttons are transparent by default; use quiet graphite fill on hover.

### Cards
- Background #101010, 1px subtle border, 9–13px radius, restrained shadow.
- Welcome suggestion cards should read as a compact launchpad, not marketing tiles.
- Avoid gradients on each card.

### Inputs
- Background #090909, 1px structural border, 8–11px radius.
- Focus uses a brighter border only. No glow, inset bloom, or animated box-shadow.
- Chat composer auto-grows; agent-file editor may be resized.

### Navigation
- Sidebar: #0B0B0B, 258px desktop width, 76px collapsed width.
- Active item: #171717 with a subtle border and clear text contrast.
- Recent chat rows use sibling native buttons for open/options behavior.
- Overflow labels truncate without making their controls inaccessible.

### Chat
- Assistant content is the primary reading surface and stays visually open.
- User messages use a restrained graphite surface and compact rounded shape.
- Message actions remain available on keyboard focus and touch devices.
- Code blocks have their own toolbar, language label, and horizontally scrollable body.
- Thinking dots bounce in sequence; streamed text itself must not reanimate per token.

## 5. Layout Principles

- Main shell uses a desktop sidebar and a min-width-zero content column.
- Chat reading width is capped at 880px; secondary pages use up to 1180px.
- Composer shares the chat width and stays anchored below the scrollable transcript.
- Entry screen moves from a single-column stack to an editorial two-column layout at 960px.
- Files and personality pages use responsive grids; panels never force horizontal overflow.
- At narrow widths, the sidebar becomes an off-canvas drawer.

## 6. Depth & Elevation

| Level | Treatment |
|---|---|
| Canvas | #080808, no shadow |
| Recessed | #0D0D0D, quiet separator |
| Surface | #111111, 1px subtle border |
| Raised | #171717, fine border |
| Modal | #0C0C0C, strong border, deep shadow |
| Primary action | Off-white surface, no decorative glow |

Depth comes from contrast steps and crisp separators, not glassmorphism or heavy blur.

## 7. Do's & Don'ts

**Do**
- Keep the screen mostly black and grayscale.
- Make the current task and conversation the strongest visual focus.
- Use spring easing for message arrival and short transitions for controls.
- Keep errors next to the action that caused them.
- Preserve keyboard focus, reduced-motion support, and long-content wrapping.

**Don't**
- Re-add focus glows to text fields.
- Add neon gradients, glass panels, or constant background animation.
- Use transition: all.
- Turn every interaction into a bounce or rotation.
- Hide important instructions in tiny uppercase labels.

## 8. Responsive Behavior

- Base layout targets 320px and progressively enhances.
- Breakpoints: 640px, 768px, 960px, 1200px, and 1536px.
- Chat message width is fluid; long URLs and code remain contained.
- On small screens, sidebar is a drawer, files rail becomes horizontal, and settings become one column.
- Modal and drawer content use contained overscroll.
- Essential functionality remains available on mobile.

## 9. Agent Prompt Guide

When changing Kernel's UI:
1. Read this document before editing CSS or markup.
2. Preserve DOM IDs and data attributes unless application logic changes with them.
3. Keep API, local-storage, and TokenJuice proxy behavior independent from visual code.
4. Treat styles.css as the single visual source of truth. src/main.css only imports Tailwind and that stylesheet.
5. Test first-run connection, new chat, streamed response, errors, attachments, agent files, personality, settings, and command palette.
6. Validate at 320px, 640px, 768px, 960px, 1200px, and 1536px, plus keyboard and reduced-motion modes.
