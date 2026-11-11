# DESIGN.md — Kernel

Kernel is a local-first AI workspace. This document is the source of truth for its visual system; new pages and components should extend these rules instead of introducing another aesthetic.

## 1. Visual Theme & Atmosphere

Kernel is a **monochrome instrument for thinking**: part quiet studio, part precision tool. The interface should feel intentional and calm, with strong editorial typography, careful alignment, and a little material depth. It should not look like a generic SaaS dashboard or a chat clone.

The memorable element is the contrast between oversized, expressive headings and compact, technical interface labels. A nearly-black canvas gives the conversation room to breathe; silver controls and restrained borders make interactive elements legible without adding a colorful accent.

**Key Characteristics**
- OLED-adjacent near-black surfaces, layered by small changes in luminance rather than colored panels.
- Manrope display typography with tight tracking and large, asymmetric headline composition.
- Instrument Sans body copy for a readable, quiet rhythm.
- JetBrains Mono for system labels, file metadata, keyboard hints, and code.
- Thin neutral borders, precise 7–10px control radii, and only a few larger 18px panels.
- Soft atmospheric light at the edge of the canvas; never a large decorative gradient behind the conversation.
- Slow, controlled hover states and brief spring entrances for newly added messages.
- No focus glow on text fields: focus is communicated by a clear border and keyboard outline.

**Mood:** focused, understated, capable, and slightly editorial. The visual system should get out of the user's way without feeling empty or unfinished.

## 2. Color Palette & Roles

All colors are monochrome except semantic error/success states. Use these tokens rather than inventing component-specific colors.

### Primary
| Role | Hex | CSS Token | Usage |
|---|---|---|---|
| Primary text | #F1F2F3 | \`--text\` | Headings and strongest text |
| Secondary text | #C6C9CE | \`--text-soft\` | Body copy and interactive labels |
| Brand silver | #D9DCDF | \`--white\` | Primary action surfaces and highlights |

### Accent
| Role | Hex | CSS Token / Use | Usage |
|---|---|---|---|
| Action surface | #E4E6E8 | Primary button surface | Main connection and send actions |
| Action hover | #FFFFFF | Primary button hover | High-contrast hover without a chromatic accent |
| Muted silver | #8D939B | Component text / span emphasis | Secondary emphasis |

### Interactive States
| Role | Hex | CSS Token / Use | Usage |
|---|---|---|---|
| Link default | #E6E8EA | Inline Markdown link | External links in assistant messages |
| Link hover | #FFFFFF | Link hover | Hovered external links |
| Focus | #C6C9CE | \`:focus-visible\` outline | Keyboard focus indicator |
| Error | #E2A5A5 | \`--danger\` | API errors and destructive action feedback |
| Success | #D7E0D7 | Connection success | Successful API test or save feedback |

### Neutral Scale
| Role | Hex | CSS Token | Usage |
|---|---|---|---|
| Neutral 0 | #F1F2F3 | \`--text\` | Brightest UI text |
| Neutral 50 | #C6C9CE | \`--text-soft\` | Body text and labels |
| Neutral 100 | #9BA1A9 | \`--text-muted\` | Secondary text, hints |
| Neutral 200 | #7D848D | \`--text-faint\` | Metadata; passes AA on the primary and elevated surfaces |
| Neutral 400 | #686F78 | \`--border-strong\` | Input borders and stronger outlines |
| Neutral 600 | #30343A | \`--border\` | Subtle borders and dividers |
| Neutral 800 | #141619 | \`--surface-raised\` | Elevated panels |
| Neutral 900 | #090A0B | \`--bg\` | Main canvas |

### Surface & Borders
| Role | Hex | CSS Token | Usage |
|---|---|---|---|
| Deep canvas | #090A0B | \`--bg\` | Main page and workspace background |
| Deepest surface | #060708 | \`--bg-deep\` | Connection screen base |
| Primary surface | #0E1012 | \`--surface\` | Cards and panels |
| Elevated surface | #141619 | \`--surface-raised\` | Menus and raised elements |
| Hover surface | #1B1E22 | \`--surface-hover\` | Interactive hover state |
| Default border | #30343A | \`--border\` | Standard separation |
| Strong border | #686F78 | \`--border-strong\` | Inputs and focused controls |
| Subtle divider | rgba(255,255,255,.075) | \`--line\` | Quiet section separation |

### Shadow Colors
| Level | Value | Usage |
|---|---|---|
| Low | \`rgba(0,0,0,.16)\` | Small resting controls |
| Medium | \`rgba(0,0,0,.31)\` | Composer and cards |
| High | \`rgba(0,0,0,.48)\` | Connection panel and settings modal |
| Highest | \`rgba(0,0,0,.65)\` | Command palette |

### Contrast checks

Computed relative-luminance contrast ratios against the actual CSS surfaces:
- #F1F2F3 on #090A0B: **17.68:1**
- #C6C9CE on #090A0B: **11.93:1**
- #9BA1A9 on #090A0B: **7.61:1**
- #7D848D on #090A0B: **5.24:1**
- #7D848D on #0E1012: **5.04:1**
- #101113 on #E4E6E8: **15.10:1**

Normal text should remain at or above 4.5:1; large text and non-text UI indicators should remain at or above 3:1.

## 3. Typography Rules

**Display Font:** Manrope — \`"Manrope", "Instrument Sans", sans-serif\`  
**Body Font:** Instrument Sans — \`"Instrument Sans", sans-serif\`  
**Mono Font:** JetBrains Mono — \`"JetBrains Mono", monospace\`

All three are loaded from Google Fonts. Do not substitute Inter, Roboto, Arial, Helvetica, or Space Grotesk. Use the existing font roles; do not add a fourth family for decoration.

**OpenType Features:** use the browser's standard kerning and ligatures; apply \`font-feature-settings: "kern", "liga";\` where explicit settings are needed. Use tight negative tracking only for large Manrope headings.

### Type Scale

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---:|---:|---:|---:|---|
| Display / Hero | Manrope | clamp(2.65rem, 12.5vw, 6.9rem) | 700–800 | .97–1.0 | -.09em | Connection and welcome hero |
| H1 | Manrope | clamp(2.1rem, 4vw, 3.3rem) | 700 | 1.08 | -.075em | Files and personality page titles |
| H2 | Manrope | 1.6875rem | 700 | 1.15 | -.06em | Settings and modal headings |
| H3 | Manrope | 1.125–1.1875rem | 600–700 | 1.25–1.3 | -.04em | Cards and subsections |
| H4 | Instrument Sans | .75rem | 600 | 1.4 | 0 | Compact card and menu titles |
| Body Large | Instrument Sans | 1rem–1.125rem | 400 | 1.65–1.7 | 0 | Lead copy |
| Body | Instrument Sans | 1rem | 400 | 1.65–1.75 | 0 | Main interface and messages |
| Body Small | Instrument Sans | .75–.875rem | 400 | 1.5–1.6 | 0 | Captions and helper text |
| Label | JetBrains Mono | .5625–.6875rem | 500 | 1.4 | .08–.13em | Eyebrows, metadata, status |
| Code | JetBrains Mono | .75rem | 400 | 1.72 | 0 | Code blocks and editable agent files |

## 4. Component Stylings

### Buttons

**Primary Button**
- Default: near-white gradient from #F4F5F6 to #D9DCDF; text #101113; 1px #ECEEEF border; 9px radius; 51px minimum height; 13px / 700 Instrument Sans.
- Hover: #FFFFFF background; translateY(-2px); stronger but restrained shadow.
- Focus: 2px solid #C6C9CE outline with 3px offset.
- Active: return to y=0 and scale(.99).
- Disabled: reduce opacity; retain readable text and a non-interactive cursor.

**Secondary Button**
- Default: rgba(255,255,255,.03) surface, 1px #30343A border, #C6C9CE text, 7px radius.
- Hover: border #686F78, surface rgba(255,255,255,.08), text #F1F2F3.
- Focus: 2px solid #C6C9CE outline with 3px offset.
- Active: no exaggerated compression; keep the same shape and surface hierarchy.

**Icon Button**
- Transparent by default, 36px desktop / 44px touch target, 8px radius.
- Hover: subtle #30343A border, rgba(255,255,255,.045) fill, 1px upward movement.
- Always provide an accessible label when there is no visible text.

### Cards
- Suggestion cards use a near-black layered surface, #30343A border, 9px radius, and 14–15px padding.
- Hover raises the card by 3px, moves the border toward #686F78, and adds a low shadow; avoid rotation or large scaling.
- Settings cards use a quiet raised surface and a 10px radius.
- Never put every section in a card; reserve card treatment for discrete actions or bounded configuration groups.

### Inputs
- Background #0A0B0D, 1px #686F78 border, 8px radius, 10–12px padding.
- Form text 13px on pointer devices and at least 16px on touch hardware to avoid browser zoom.
- Focus changes the border to #A5AAB1. No glow, outer box-shadow, or animated halo.
- Keyboard focus uses a visible 2px #C6C9CE outline with 3px offset.
- Placeholder color #9BA1A9.
- Textareas remain resizable only where the task benefits from it.

### Navigation
- Sidebar background #0A0B0C, 1px rgba(255,255,255,.075) divider, 260px desktop width.
- Active item uses a low-contrast neutral surface and a 2px left silver indicator.
- Hover uses a slight 2px horizontal movement and a restrained neutral fill.
- Below 1024px, navigation becomes a slide-out drawer with a persistent menu trigger.
- Conversation titles are real buttons; context actions are separate buttons, not nested click targets.

### Motion
- Use CSS transitions and keyframes; do not add a motion library.
- Hover transitions should feel deliberate: approximately .28–.38s with the shared ease curves.
- Message entrance can use a .72s spring with a restrained overshoot; stagger response blocks/assets.
- Typing dots use a small staggered vertical bounce.
- Keep animations on transform and opacity wherever possible. Never animate layout dimensions or margins.
- Respect \`prefers-reduced-motion: reduce\` globally.

## 5. Layout Principles

- **Base Unit:** 4px.
- **Spacing Scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96px.
- **Max Connection Layout:** 1230px.
- **Welcome Content:** 920px maximum.
- **Conversation Measure:** 860px maximum.
- **Composer Measure:** 900px maximum.
- **Desktop Sidebar:** 260px; compact sidebar 76px; wide sidebar 278px.
- **Grid:** use CSS Grid for the full app frame and multi-column content; use Flexbox for rows, toolbars, and control groups.
- **Major Section Spacing:** 48–96px on desktop, 28–48px on mobile.
- **Border Radius:** 4px for code/metadata tags; 6–8px for inputs and buttons; 9–10px for cards; 13px for modals; 18px for the connection panel; 9999px only for circular status dots.

## 6. Depth & Elevation

| Level | Name | CSS Shadow | Usage |
|---|---|---|---|
| 0 | Flat | \`none\` | Message text, labels, dividers |
| 1 | Low | \`0 5px 18px rgba(0,0,0,.16)\` | Small primary controls |
| 2 | Raised | \`0 14px 30px rgba(0,0,0,.20)\` | Hovered suggestion cards |
| 3 | Elevated | \`0 17px 48px rgba(0,0,0,.31)\` | Composer surface |
| 4 | Floating | \`0 30px 110px rgba(0,0,0,.48)\` | Settings and overlay panels |
| 5 | Command | \`0 28px 90px rgba(0,0,0,.65)\` | Command palette |

Depth should primarily come from luminance layers and border changes. Shadows are for separation from the canvas, not decoration around every object.

## 7. Do's and Don'ts

### Do
1. Keep the canvas near #090A0B and use the defined neutral surface steps.
2. Use Manrope for high-impact headings, Instrument Sans for content, and JetBrains Mono for technical metadata.
3. Maintain 4px spacing rhythm and the 7–10px component radius system.
4. Give text inputs a border change, not a glow, when focused.
5. Keep important conversation content within an 860px reading measure.
6. Use a 44px minimum target for touch controls.
7. Keep motion slow enough to feel intentional but short enough not to delay work.
8. Add meaningful labels, keyboard states, and reduced-motion fallbacks to every interactive surface.
9. Prefer asymmetry in hero composition, then use a clean reading column for actual conversations.

### Don't
1. Do not add purple, blue, teal, or rainbow accents to the monochrome palette.
2. Do not introduce Inter, Roboto, Arial, Helvetica, or Space Grotesk.
3. Do not add a glow to fields, buttons, or focus states.
4. Do not animate width, height, top, left, or margins.
5. Do not turn every section into a rounded card.
6. Do not use tiny unlabeled icon buttons on touch hardware.
7. Do not use nested interactive elements in conversation rows.
8. Do not use browser \`prompt()\` dialogs for normal workspace actions.
9. Do not render model output as trusted HTML; escape text before formatting Markdown.

### The AI Slop Test
> Does this look like a generic AI chat dashboard with a dark gradient and a handful of rounded cards? If yes, remove decoration and strengthen the type, alignment, and hierarchy. Kernel should feel like a quiet tool, not a template.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---:|---|
| Mobile | 320px+ base | Single-column entry screen, drawer navigation, stacked suggestions and settings |
| Large Phone | 640px | Wider content gutters, two-column suggestion grid, roomier welcome and composer |
| Tablet | 768px | Persistent editor rail and full settings navigation |
| Desktop | 1024px | Fixed sidebar, split connection hero, full personality preview |
| Wide | 1280px | Maximum content widths and more hero breathing room |
| Ultra-wide | 1536px | Sidebar grows slightly; text measures remain capped |

All viewport breakpoints use progressive \`min-width\` enhancement. The base CSS is designed for a 320px viewport.

### Touch Targets
- Minimum touch target: 44 × 44px on touch hardware.
- Leave at least 8px between adjacent controls where layout allows.
- Form fields use 16px text on touch hardware.

### Typography Scaling
| Role | Mobile | Tablet | Desktop |
|---|---|---|---|
| Hero | 2.65–3.3rem | 3.4–5.2rem | 3.55–6.9rem |
| Page heading | 1.875rem | 2.1–2.8rem | 2.1–3.3rem |
| Body | 1rem | 1rem | 1rem |
| Metadata | .5625rem | .5625–.625rem | .5625–.6875rem |

### Collapsing Strategy
- **Navigation:** slide-out drawer below 1024px; persistent sidebar at 1024px and above.
- **Entry screen:** stacked hero and connection panel on mobile; two-column asymmetric composition on desktop.
- **Suggestions:** one column at base width; two columns at 640px and above.
- **Files:** horizontal file switcher on mobile; vertical file rail from 768px.
- **Personality:** preview appears above controls on mobile; side preview from 1024px.
- **Settings:** compact top tab row on mobile; vertical preference rail from 768px.
- **Conversation:** full-width messages on mobile; centered reading column on wider screens.
- **No essential content is hidden on mobile.** Panels reflow and stack instead.

### QA Viewports
Validate at 320px, 640px, 768px, 1024px, 1280px, and 1536px. Confirm there is no horizontal document overflow, labels do not clip, the drawer can be operated with a keyboard, and all touch targets remain reachable.

## 9. Agent Prompt Guide

### Quick Color Reference
\`\`\`text
Canvas:        #090A0B
Surface:       #0E1012
Raised:        #141619
Text:          #F1F2F3
Body:          #C6C9CE
Muted:         #9BA1A9
Faint:         #7D848D
Border:        #30343A
Strong border: #686F78
CTA:           #E4E6E8
Focus:         #C6C9CE
Error:         #E2A5A5
\`\`\`

### Component Prompts

**"Build a Kernel-style hero"**
- Canvas: #090A0B with one restrained radial light wash at the outer edge.
- Container: max-width 1230px, centered, with a two-column split only at 1024px+.
- Heading: Manrope, 700, clamp(2.65rem, 12.5vw, 6.9rem), line-height .97, letter-spacing -.09em, color #F1F2F3.
- Secondary heading line: #858B93. Lead copy: Instrument Sans, 16px, line-height 1.7, color #C6C9CE.
- Connection panel: #0E1012 layered surface, 1px #30343A border, 18px radius, 23–34px padding, shadow Level 4.

**"Build a Kernel action card"**
- Card: #0E1012 layered surface, 1px #30343A border, 9px radius, 14px padding, shadow Level 0.
- Title: Instrument Sans, 12px, 600, color #F1F2F3.
- Supporting copy: Instrument Sans, 11px, 400, color #9BA1A9.
- Hover: border #686F78, translateY(-3px), shadow 0 14px 30px rgba(0,0,0,.20), duration .36s.

**"Build a Kernel form field"**
- Background: #0A0B0D, border 1px solid #686F78, radius 8px, padding 10px 12px.
- Text: Instrument Sans, 13px / 16px on touch, color #F1F2F3.
- Placeholder: #9BA1A9. Focus border: #A5AAB1. No glow or box-shadow.
- Keyboard focus: outline 2px solid #C6C9CE with 3px offset.

**"Build a Kernel conversation message"**
- Reading column: max-width 860px, centered.
- Assistant text: Instrument Sans 15–16px, 1.75 line-height, color #C6C9CE.
- User message: #101214 surface, 1px #34383D border, 13px 13px 4px 13px radius, 15px 19px padding.
- Code block: #0A0B0D background, 1px #3A3E44 border, 9px radius, JetBrains Mono 12px / 1.72.
- New message: .72s restrained spring entrance; respect reduced motion.
