# ARGUS AI — Design System

| | |
|---|---|
| Version | 0.1 |
| Date | 2026-09-21 |
| Read with | [PRD](PRD.md) section 8, [APP_FLOW](APP_FLOW.md), [RULES](RULES.md) R-UI |

---

## 1. Brief and subject

- **Product:** an evidence-first due diligence workspace for investors and analysts.
- **Audience:** angel investors, VC analysts, founders, researchers. Professional, time-poor, sceptical of AI output.
- **Primary job of the interface:** make it obvious what is known, what is inferred, what is assumed, and what is missing, and let people check any statement in one click.
- **Requested direction (from the brief):** premium dark interface; Linear's clarity, Vercel's polish, Bloomberg-style analytical density; subtle glass effects; smooth animation; no generic AI-dashboard look.

## 2. Design plan and review

**The one memorable idea: certainty as texture.** Argus Panoptes saw everything, and ARGUS is about how well things are seen. The four claim statuses are expressed as *how resolved the mark looks*: solid (verified), translucent (AI analysis), hatched (assumption), dashed and empty (missing). The same four textures appear in badges, in report prose, in the evidence bar, in charts and in the compare matrix. Colour reinforces the texture but never carries the meaning alone.

Everything else stays quiet so this idea reads.

**Defaults considered and rejected** (do not drift back to them):

| Default | Why rejected | What we do instead |
|---|---|---|
| Near-black with a single acid-green or vermilion brand accent | Generic "AI dashboard" tell | Ink-navy canvas, warm paper text, no brand hue. Chromatic colour is reserved for meaning (evidence spectrum). |
| Purple or blue gradient washes, glowing orbs, sparkles | Generic AI look | No gradients as decoration. No sparkle icons. |
| Chat-bubble UI as the primary surface | Wrong mental model for diligence | A report with a margin of evidence |
| Content chopped into identical rounded cards with identical soft shadows | SaaS-card kit | Continuous surfaces separated by hairlines; panels only around interactive modules; radii vary by role; no per-card shadows |
| ALL-CAPS tracked eyebrows, middle-dot meta strings, arrows on links | Template chrome | Sentence case, plain labels, no eyebrows |
| Monospace for every small data label | Template chrome | Sans with tabular numerals for data. Mono only for IDs, quotes and code. |
| Fade-and-slide-up on every section, hover lift on every card | Read as generated | Motion only answers a user action, plus one orchestrated moment on the landing hero |

Review note: the first plan used amber as a brand accent (Bloomberg nod). It was dropped because amber is needed for "assumption" and a brand hue would compete with the evidence spectrum. The brand is now paper-white and ink.

## 3. Tokens

### 3.1 Base palette (six named values)

| Name | Hex | Role |
|---|---|---|
| Ink | `#0C1118` | Canvas |
| Slate | `#172030` | Raised surfaces |
| Hairline | `rgb(190 205 230 / 0.10)` | Dividers and borders |
| Paper | `#ECE8DF` | Primary text, primary buttons, score arc, focus ring |
| Mist | `#AAB3C2` | Secondary text |
| Haze | `#7D889B` | Tertiary text, missing marker |

### 3.2 Evidence spectrum (meaning only)

| Name | Hex | Used for |
|---|---|---|
| Verified | `#3DCB9C` | `VERIFIED` marker and label |
| Analysis | `#7FA0FF` | `AI_ANALYSIS` |
| Assumption | `#E2AC45` | `ASSUMPTION`, medium severity |
| Missing | `#7D889B` (Haze) | `MISSING` |
| Ember | `#F0685D` | Critical severity, destructive actions, errors |
| Ember-high | `#EE8B57` | High severity |

Chart series (comparison only, never used for status): `#ECE8DF`, `#8FD3E8`, `#D6B58F`, `#B7A6E8`, each with a different dash pattern.

Text and status colours are chosen to meet WCAG AA on Ink and Slate. Verify with an automated contrast check in T-1.01 and record results in PROJECT_MEMORY.

### 3.3 CSS variables (`src/styles/tokens.css`)

```css
:root {
  color-scheme: dark;

  /* surfaces */
  --ink: #0c1118;
  --surface-1: #111823;
  --surface-2: #172030;
  --surface-3: #1d2838;
  --hairline: rgb(190 205 230 / 0.10);
  --hairline-strong: rgb(190 205 230 / 0.18);

  /* text */
  --paper: #ece8df;
  --mist: #aab3c2;
  --haze: #7d889b;

  /* evidence spectrum */
  --verified: #3dcb9c;
  --analysis: #7fa0ff;
  --assumption: #e2ac45;
  --missing: var(--haze);
  --ember: #f0685d;
  --ember-high: #ee8b57;

  /* semantic aliases: components use these, never raw hex */
  --bg: var(--ink);
  --panel: var(--surface-1);
  --panel-raised: var(--surface-2);
  --text: var(--paper);
  --text-2: var(--mist);
  --text-3: var(--haze);
  --border: var(--hairline);
  --focus: var(--paper);
  --cta-bg: var(--paper);
  --cta-fg: var(--ink);

  /* radii by role */
  --r-control: 6px;
  --r-data: 8px;
  --r-panel: 12px;
  --r-overlay: 16px;
  --r-pill: 999px;

  /* overlays and glass (overlays only) */
  --glass-bg: color-mix(in oklab, var(--surface-2) 72%, transparent);
  --glass-blur: 14px;
  --shadow-overlay: 0 24px 64px -16px rgb(0 0 0 / 0.6);

  /* motion */
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --dur-1: 90ms;
  --dur-2: 160ms;
  --dur-3: 240ms;
  --dur-4: 360ms;
}
```

### 3.4 Typography

| Role | Family | Notes |
|---|---|---|
| Editorial (headings, report prose, score numerals, landing display) | Newsreader | Variable with optical sizing; weight 400 to 500 |
| Interface (controls, tables, claim lists, labels) | IBM Plex Sans | Enable `font-variant-numeric: tabular-nums` for data. Verify tabular figures in T-1.01; if lacking, use Plex Mono for numeric table columns. |
| Code and identifiers (evidence IDs, quotes, JSON) | IBM Plex Mono | Only these uses |

Load through `next/font` with Latin subsets and `display: swap`.

Scale (size / line height):

| Token | Size | Family | Use |
|---|---|---|---|
| caption | 12 / 16 | Plex Sans | Chips, axis labels |
| ui-sm | 13 / 18 | Plex Sans | Dense tables, rail text |
| ui | 14 / 20 | Plex Sans | Controls, table cells |
| body | 15 / 24 | Plex Sans | Claim lists |
| prose | 18 / 29 | Newsreader | Report narrative (serif gets extra leading) |
| h4 | 16 / 24, weight 600 | Plex Sans | Subsection titles |
| h3 | 22 / 30 | Newsreader | Section titles |
| h2 | 30 / 38 | Newsreader | Page titles |
| h1 | 44 / 50 | Newsreader | Landing sections |
| display | clamp(40px, 6vw, 68px) / 1.04 | Newsreader | Landing hero |
| numeral | 72 / 72 | Newsreader | Score |

Rules: sentence case everywhere; no all-caps labels; no eyebrows; prose measure at most 68 characters; `text-wrap: balance` on headings and `pretty` on prose where supported; letter-spacing only slightly negative on display sizes. Do not accent a single word in a headline.

### 3.5 Spacing and layout

- 4 px base: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96.
- Breakpoints: 640, 768, 1024, 1280, 1536.
- App content max width 1360 px. Report: section nav 220 px, reading column 720 to 760 px, evidence rail 360 px.
- Density: table rows 40 px default, 32 px compact.

### 3.6 Elevation and glass

- Depth comes from surface luminance steps (Ink, Surface 1, 2, 3) and hairlines, not shadows.
- Shadows only on overlays (`--shadow-overlay`).
- Glass (`backdrop-filter`) is limited to: command palette, evidence sheet on narrow screens, popovers, and the sticky report header. Always provide a solid fallback:

```css
.glass { background: var(--surface-2); border: 1px solid var(--hairline-strong); }
@supports (backdrop-filter: blur(1px)) {
  .glass { background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)) saturate(1.15); }
}
```

## 4. The evidence texture system (signature element)

| Status | Marker (10 px) | Fill | Border | UI label | Icon (lucide) |
|---|---|---|---|---|---|
| `VERIFIED` | Solid square, 2 px radius | Verified 100% | none | "Verified" (independent support) or "Sourced" | `ShieldCheck` |
| `AI_ANALYSIS` | Translucent square | Analysis at 40% | 1 px Analysis | "AI analysis" | `Cpu` |
| `ASSUMPTION` | Hatched square (135° stripes) | Assumption stripes 2 px on, 2 px off | 1 px Assumption | "Assumption" | `CircleHelp` |
| `MISSING` | Empty square | none | 1 px dashed Missing | "Missing" | `CircleDashed` |

Implementation: one `EvidenceMarker` component and CSS classes `tex-verified`, `tex-analysis`, `tex-assumption`, `tex-missing`, plus matching SVG `<pattern>` definitions for charts. In forced-colors mode markers fall back to borders (solid, thin, double-hatched via pattern, dashed).

Reliability chips (small text chips, 1 px border): **Independent**, **Company**, **Provided**. Shown in the evidence rail and on hover of any claim.

`StatusBadge` = marker + label (+ icon in large sizes). Every claim rendered anywhere must go through `ClaimRow` or `ClaimInline`, which always include the marker.

## 5. Layout concepts

### 5.1 App shell

```
┌────────┬─────────────────────────────────────────────────────────────┐
│ ARGUS  │ Search analyses                     Cmd K     New analysis  ●│
│        ├─────────────────────────────────────────────────────────────┤
│ Dash   │ Page title                                                  │
│ Analy. │ ─────────────────────────────────────────────────────────── │
│ Compare│ content                                                     │
│ Watch  │                                                             │
│ ────── │                                                             │
│ Settings                                                             │
└────────┴─────────────────────────────────────────────────────────────┘
```
Sidebar 232 px, collapsible to 64 px. Topbar 52 px. Left-aligned content.

### 5.2 Dashboard

```
Dashboard                                             Compare   New analysis
─────────────────────────────────────────────────────────────────────────────
Analyses 24   │   Average score 61   │   In progress 2   │   Watchlisted 5
─────────────────────────────────────────────────────────────────────────────
Analyses (8 cols)                                     │ In progress (4 cols)
 Name        Stage  Sector   Score+confidence  Updated │  step list, progress
 ...                                                   │ Watchlist
                                                       │ Recent activity
─────────────────────────────────────────────────────────────────────────────
Patterns across your analyses (derived): sector mix | score distribution | common risks
```
The KPI strip is one continuous row with hairline dividers, not four cards. The analyses table is the dominant element. Score cells show the number, a thin confidence bar, and an evidence bar.

### 5.3 Report

```
┌ Startup name · stage · sector          v3  Compare  Export  Watch  Re-run ┐
├─ Filter: All  Sourced  AI analysis  Assumptions  Missing ─────────────────┤
│ Sections   │ Traction & growth  [evidence bar]      │ Evidence             │
│ (sticky)   │ ■ The deck states ARR is $2.0M. ▸      │ Deck, page 7         │
│ Executive  │ ◧ Growth looks concentrated in two…    │ "ARR reached $2.0M   │
│ Overview   │ ▨ Assumes churn stays under 3%.        │  in Q2"              │
│ Score      │ ┄ Retention data: not in the sources.  │ Reliability: Provided│
│ Founder    │ [chart]                                │                      │
└────────────┴────────────────────────────────────────┴──────────────────────┘
```
The reading column is the product. Claims are not boxed: they sit on the surface with a marker in a 14 px gutter, like margin notes on an annotated brief. Prose sections (executive summary, overview, insights) use Newsreader with inline markers before each sentence.

### 5.4 Compare

```
Startup A        Startup B        Startup C
 63 (Medium)      71 (High)        58 (Low)
────────────────────────────────────────────
Radar overlay (60%)     | Dimension table with deltas (40%)
────────────────────────────────────────────
Metric matrix: rows = canonical facts, columns = startups, missing = dashed cell
```

### 5.5 Setup wizard

Single column, 640 px, left-aligned, four steps shown as a real sequence (numbered, because it is one). The sources step is a two-column layout on desktop: drop zone and list on the left, guidance and privacy note on the right.

### 5.6 Landing

Left-aligned, asymmetric (5 / 7 columns), no centred hero.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ARGUS AI                                    Sample report    Sign in │
│                                                                      │
│ Every claim, traced              ┌ Sample, fictional company ──────┐ │
│ to its source.                   │ ■ The deck states ARR is $2.0M. │ │
│                                  │ ◧ Growth looks concentrated…    │ │
│ ARGUS reads a pitch deck, a      │ ▨ Assumes churn stays under 3%. │ │
│ website and your notes, then     │ ┄ Burn and runway: not provided.│ │
│ marks what it verified,          │   ── evidence: deck, page 7 ──  │ │
│ inferred, assumed, and what      └─────────────────────────────────┘ │
│ is still missing.                                                    │
│ [Start an analysis] [See a sample report]                            │
└──────────────────────────────────────────────────────────────────────┘
```

Sections in order: hero; the four kinds of statement (with examples); how it works (numbered, because it is a sequence); report tour (tabs: Score, Founder, Market, Risks, Evidence); compare; what ARGUS will not do (trust); final call to action; footer with disclaimer.

Hero headline: "Every claim, traced to its source." Sub copy: "ARGUS reads a pitch deck, a website and your notes, then marks what it verified, what it inferred, what it assumed, and what is still missing." Actions: "Start an analysis", "See a sample report". No arrows.

The hero demo is built from the real `ClaimInline` and evidence rail components with the fictional dataset, not a screenshot.

## 6. Components

| Component | Spec |
|---|---|
| Button | Heights 32, 36, 40. Primary: Paper fill, Ink text. Secondary: hairline border. Ghost: text only. Radius `--r-control`. No trailing arrows. |
| Input, Select | 36 px, Slate fill, hairline border, visible label above (never placeholder-only) |
| Table | TanStack Table; sticky header; 40 px rows; sortable columns marked by icon; numeric columns right-aligned with tabular numerals |
| Tabs | Underline style, not pills |
| StatusBadge, EvidenceMarker, ReliabilityChip | Section 4 |
| EvidenceBar | 6 px tall; segments sized by count using the four textures; minimum segment 2 px; `role="img"` with a text alternative listing counts; hover or focus shows a legend |
| ClaimRow, ClaimInline | Marker in gutter or inline; text; source count affordance; selecting opens the evidence rail |
| EvidenceRail and Sheet | 360 px column on desktop; bottom sheet on narrow screens. Shows quote in context, source, locator, reliability, "based on" list for inferences. |
| ScoreGauge | Section 7 |
| DimensionRadar | Section 7 |
| StepProgress | Vertical list; status glyph per step; counters; `aria-live="polite"` |
| SectionNav | Sticky; scroll-spy; keyboard J/K |
| CommandPalette | Glass overlay, 560 px; search analyses, jump to section, run actions |
| Toast | Bottom right, action-named ("Report ready", "Deleted") |
| Skeleton | Static Surface tone at final layout size; no shimmer |
| EmptyState | One sentence and one action; never illustration-only |
| DemoBanner | Persistent, plain: "Demo data. Fictional companies." |

## 7. Data visualisation

- **ScoreGauge:** 270° arc, 10 px stroke, track Surface 3, value Paper, ticks at 25, 50, 75 in Haze. Number in Newsreader 72, "of 100" beneath. A five-segment confidence meter with the label ("Confidence: Medium") sits under the number. When not scored: dashed arc, "Not scored", and the reason. When capped: "Capped at 60: open critical flag".
- **DimensionRadar:** eight axes; polygon Paper stroke 1.5 px with Paper fill at 8%; grid rings at 25, 50, 75, 100 in Hairline. Dimensions with confidence below 0.35 use a dashed edge and a hollow vertex. Unscored dimensions have no vertex and the axis label says "Not scored". Provide a data table alternative in a disclosure.
- **Comparison overlays:** series colours plus distinct dash patterns; direct labels at line ends where possible.
- **Sparklines:** Paper, 1.5 px, no fill.
- **Matrix cells:** value with a thin Paper bar for relative size; missing values are dashed-outline cells reading "Not available".
- All charts: labelled axes, no decorative gradients, no 3D, no animated draw-in on load.

## 8. Motion

Motion answers actions or shows what changed. Nothing animates on scroll or on hover except state feedback.

| Where | Motion | Duration |
|---|---|---|
| Evidence sheet, command palette, popovers | Fade and slight scale/translate in and out | 160 to 240 ms |
| Tab change | Crossfade | 120 ms |
| Claim selection | Highlight on the sentence and the rail quote | 160 ms |
| Run step completes | Glyph swaps to done; counter updates | 160 ms |
| Chart toggle | Series fade | 240 ms |
| **Landing hero (the one orchestrated moment)** | The four sample sentences begin hatched and muted, then resolve in sequence into their statuses while the evidence rail fills. Plays once, about 1.6 s. | Once |

Reduced motion: remove transforms, cut durations to 0 or 100 ms fades, skip the hero sequence and show the final state.

## 9. Content and voice

- Plain, specific, sentence case, active voice. Say what happens: "Start analysis", "Add sources", "Export report".
- One name per concept across the product: analysis, report, source, evidence, claim. Verbs stay consistent through a flow ("Delete" then "Deleted").
- Empty states are invitations. Errors say what happened and how to fix it, and do not apologise.
- Avoid: "AI-powered", "unlock", "supercharge", "magic", exclamation marks, emoji. "AI Insights" appears only as the required report section name.
- The disclaimer wording is fixed (PRD section 15).

## 10. Responsive behaviour

| Width | Behaviour |
|---|---|
| 1280 and up | Full three-column report; sidebar expanded |
| 1024 to 1279 | Sidebar collapsed; evidence rail becomes an overlay sheet |
| 768 to 1023 | Section nav becomes a top select; single reading column |
| Below 768 | Bottom tab bar; tables become stacked rows; evidence as bottom sheet; compare shows two at a time with swipe |
| 320 minimum | No horizontal scroll except inside data tables; touch targets at least 44 px |

## 11. Accessibility (WCAG 2.2 AA target)

- Status is always marker plus text label; never colour alone. Charts pair colour with dash and texture.
- Focus: 2 px Paper outline with 2 px Ink offset on every interactive element, never removed.
- Keyboard: full operation without a mouse; shortcuts listed in APP_FLOW section 9; Esc closes overlays and returns focus to the trigger.
- Native `dialog` and Popover semantics for overlays where used; correct labelling for custom widgets.
- Live regions: run progress uses `aria-live="polite"`.
- Every chart has a text or table alternative.
- Reduced motion respected (section 8). Forced-colors mode supported.
- Target size at least 32 px on desktop and 44 px on touch. Content reflows at 400% zoom.

## 12. Implementation notes

- Tokens live only in `src/styles/tokens.css`. Tailwind theme maps to the variables (`bg-panel`, `text-mist`, and so on). No raw hex in components.
- Run `pnpx modern-web-guidance@latest search "<query>"` before building any UI, CSS or client-JS feature and follow the retrieved guide. Guides likely to be needed: `animate-to-from-top-layer` (overlay entry and exit with `@starting-style`, `transition-behavior: allow-discrete`, `overlay`), `light-dismiss-a-dialog`, `resilient-context-menus-and-nested-dropdowns` (anchor positioning and Popover), `animate-element-entry-exit`, `directional-navigation-transitions` (View Transitions), and the general `html` guide.
- Prefer native `dialog` and Popover for overlays. `overlay` transitions are limited to some browsers; elsewhere exits are instant, which is acceptable. Use Radix (via shadcn) only where native lacks the behaviour (menus, combobox, command palette). Do not mix native and Radix for the same component type.
- View Transitions between routes are progressive enhancement only; check support in the installed Next.js version before relying on them.
- Use container queries for panel-level layout, `:has()` for parent state, and `content-visibility: auto` on long report sections.
- Charts render client-side and are code-split.

## 13. Visual review checklist

Before any UI task is marked done, review screenshots at 1440, 768 and 390 px against this list:

- [ ] Only the evidence spectrum uses chromatic colour; no decorative gradients or glows
- [ ] Every claim shows a marker; status has text as well as colour and texture
- [ ] No identical-card grid; radii follow roles; no per-card shadows
- [ ] No all-caps labels, eyebrows, middle-dot strings or arrows in link text
- [ ] Numbers are tabular and right-aligned in tables
- [ ] Loading, empty, error and partial states exist and are designed
- [ ] Focus is visible everywhere; keyboard path works; reduced motion respected
- [ ] Copy is plain, specific, sentence case, and consistent with section 9
