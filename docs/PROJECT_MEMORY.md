# ARGUS AI — Project Memory

Version-controlled memory for this project: decisions, conventions, gotchas and session notes. It is separate from Claude Code's own auto-memory and is loaded into every session through `CLAUDE.md`, so keep it lean (about 150 lines; move older session notes to `docs/memory-archive/`).

How to update: add a decision when you choose between real options; add a gotcha when something cost time; add a session note at the end of each working session. Never store secrets, real company data or document content here.

Last updated: 2026-09-21

## 1. Snapshot

- Product: evidence-first startup due diligence platform. Every claim is `VERIFIED`, `AI_ANALYSIS`, `ASSUMPTION` or `MISSING`. Trust is enforced in code.
- Stage: documentation complete; implementation begins at Phase 0 (see TRACKER "Current focus").
- Stack: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Firebase (Auth, Firestore, Storage), Anthropic API, Zod, Vitest, Playwright, pnpm.

Pinned versions (Node 22, pnpm 10.33.0):

| Package | Version | | Package | Version |
|---|---|---|---|---|
| next | 16.3.5 | | @playwright/test | 1.63.0 |
| react / react-dom | 19.2.8 | | @testing-library/react | 16.3.3 |
| typescript | 5.9.3 | | @testing-library/jest-dom | 7.0.1 |
| tailwindcss | 4.3.3 | | @testing-library/user-event | 14.6.7 |
| zod | 4.6.5 | | @vitejs/plugin-react | 6.1.1 |
| pino / pino-pretty | 10.3.1 / 13.1.3 | | jsdom | 30.1.0 |
| @radix-ui/react-slot | 1.3.3 | | msw | 2.15.0 |
| class-variance-authority | 0.7.1 | | eslint / eslint-config-next | 9.39.5 / 16.3.5 |
| clsx / tailwind-merge | 2.1.1 / 3.7.0 | | prettier | 3.9.8 |
| lucide-react | 1.47.0 | | firebase-tools | 15.30.2 |
| tw-animate-css | 1.4.0 | | @types/node | 26.6.2 |

TypeScript is pinned to 5.9.3, not the newly-published 7.0.2 (the Go-based
`tsgo` compiler) — too new for this ecosystem's tooling to have caught up to.

Model IDs in use (fill in during Phase 2; defaults are in `.env.example`):

| Role | Model ID | Since |
|---|---|---|
| ANALYSIS | | |
| SYNTHESIS | | |
| FAST | | |

Eval log (one row per `pnpm eval` run that matters):

| Date | Prompt / scoring version | Result | Notes |
|---|---|---|---|
| | | | |

Run baseline (fill in at T-2.18): median cost per run, median duration, downgrade rate.

## 2. Decisions

| ID | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D-001 | 2026-09-21 | Product is ARGUS AI. Output is considerations and a score, never a buy or pass verdict. | Trust and legal posture | Accepted |
| D-002 | 2026-09-21 | Stack: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, pnpm. | Fits solo build and the Claude Code workflow | Accepted |
| D-003 | 2026-09-21 | Backend: Firebase Auth, Firestore, Storage. Clients are read-only; all writes go through route handlers with the Admin SDK. | Simple, secure by default | Accepted |
| D-004 | 2026-09-21 | Claims backed only by `PROVIDED` evidence are labelled "Sourced". "Verified" is used only when at least one `INDEPENDENT` source supports the claim. Data status stays `VERIFIED`; the label is derived. | A founder statement is not independent confirmation (PRD OQ-5) | Accepted, revisit after beta |
| D-005 | 2026-09-21 | The engine is a UI-independent library behind `EvidenceStore`, built CLI-first in Phase 2. | De-risk the core value before building the app | Accepted |
| D-006 | 2026-09-21 | Structured output via forced tool call, Zod validation, one repair attempt. Model IDs from env only. | Reliability and easy model changes | Accepted |
| D-007 | 2026-09-21 | Scoring is deterministic and versioned. The model scores rubric criteria; code computes dimension score, confidence and overall. | Explainable, comparable, testable | Accepted |
| D-008 | 2026-09-21 | Insufficient-evidence gate (coverage below 0.5 gives no headline score). An open critical flag caps the score at 60. | Avoid false precision; policy assumption, revisit with beta data | Accepted |
| D-009 | 2026-09-21 | Orchestration: inline step machine first; queued mode in Phase 6 only if the host cannot safely run the longest runs. | Avoid infrastructure until needed | Accepted |
| D-010 | 2026-09-21 | Run progress is delivered by Firestore listeners on the run document, not by holding an HTTP stream. | Resumable, decoupled from the request | Accepted |
| D-011 | 2026-09-21 | Export order: Markdown and JSON, then print-optimised page for browser PDF, then server PDF later. | Avoid headless-browser complexity early | Accepted |
| D-012 | 2026-09-21 | Design: dark only in v1; "certainty as texture"; Newsreader plus IBM Plex Sans; no brand hue; chromatic colour reserved for the evidence spectrum. | Distinct, subject-specific, avoids generic AI look | Accepted |
| D-013 | 2026-09-21 | Competitor, customer, investor and people names come only from evidence. Independent competitor discovery needs web research. | Prevent fabricated entities | Accepted |
| D-014 | 2026-09-21 | Demo and fixture data is fictional and labelled. | Avoid misrepresentation and real-data exposure | Accepted |
| D-015 | 2026-09-21 | Founder analysis uses professional information only; sensitive-attribute guard in the verifier. | Privacy and fairness | Accepted |
| D-016 | 2026-09-21 | This file is named `PROJECT_MEMORY.md`, not `MEMORY.md`, to avoid confusion with Claude Code's auto-memory file. | Clarity | Accepted |
| D-017 | 2026-09-21 | Run modern-web-guidance before any UI, CSS or client-JS work; browser policy in RULES R-UI-13. | Current best practice, fewer dependencies | Accepted |
| D-018 | 2026-09-21 | Client Firestore reads limited to `analyses` and `runs`; everything else is read server-side. | Minimal exposure and rules cost | Accepted |
| D-019 | 2026-09-21 | Phase 1 (design) and Phase 2 (engine) are independent and may be interleaved. | Visible progress plus risk reduction | Accepted |
| D-020 | 2026-09-21 | T-1.01 contrast check (WCAG AA, computed from the real token hex values): every text and evidence-spectrum colour clears 4.5:1 on both Ink and Slate (worst case: Haze/Missing at 4.56:1 on Slate). Haze fails AA text contrast on Surface-3 (4.15:1) but clears the 3:1 non-text minimum there; Surface-3 is reserved for non-text use (the ScoreGauge track), so this is a guardrail, not a violation — automated in `tests/unit/contrast.test.ts`. | DESIGN section 3.2 asks for an automated check recorded here | Accepted |
| D-021 | 2026-09-21 | T-1.01 tabular-numeral check: inspected the self-hosted IBM Plex Sans (400) file directly (fontTools) — digits 0-9 are all 600 units wide by default, i.e. genuinely tabular, not gated behind an optional `tnum` OpenType feature (which this build doesn't declare). `font-variant-numeric: tabular-nums` is safe to use as-is; no fallback to Plex Mono for numeric columns needed. | Verified by parsing the actual font file rather than assuming (R-PRC-08) | Accepted |
| D-022 | 2026-09-21 | T-1.02 overlay primitives: Dialog and Sheet are hand-built on native `<dialog>` (DESIGN section 12); Select, Tabs, Popover, Tooltip and Toast use Radix. Checked via modern-web-guidance rather than assumed: CSS anchor positioning isn't reliably native anywhere yet, and Customizable `<select>` (`appearance: base-select`) is Chrome/Edge-only — both fail R-UI-13's cross-browser bar, so "native lacks the behaviour" applies to those five. | R-UI-01/R-PRC-08: checked the actual guides instead of assuming | Accepted |
| D-023 | 2026-09-21 | Table uses `@tanstack/react-table` pinned to 8.21.3, not the npm "latest" dist-tag (9.2.4). The 9.x line is stale (published 2022, predates the actively-maintained 8.x line's 2026 releases) and has a completely different API (`useTable`/`createTableHook` instead of the standard `useReactTable`/`flexRender`/`getCoreRowModel`) — a real footgun in the registry, not a deliberate current release. | Verified via `npm view ... time.created`/`time.modified` rather than trusting the dist-tag (R-PRC-08) | Accepted |
| D-024 | 2026-09-22 | T-1.03 pulled `src/lib/schema/enums.ts` (ClaimStatus, Reliability, + the rest of SCHEMA.md section 2's enums) forward from Phase 2, verbatim from the doc. The full Evidence/Claim/Report/Analysis/Run schemas still land at T-2.01; this is only the enum vocabulary the UI components needed now, per R-COD-03 (types are z.infer of schemas, not hand-written duplicates). | Avoids a UI-only shadow type Phase 2 would have to reconcile | Accepted |
| D-025 | 2026-09-22 | ScoreGauge/DimensionRadar's confidence buckets (Low/Medium/High) come from AI_SPEC section 5.3 ("below 0.35 Low, 0.35 to 0.65 Medium, above 0.65 High"), in `src/lib/confidence.ts`, shared by both charts rather than invented per-component. Charts live in `src/components/charts/` per TRD's repo map, not `src/components/argus/` (that's for StatusBadge/EvidenceBar-style domain components). | Single source for a threshold the engine will also use | Accepted |
| D-026 | 2026-09-22 | T-1.08 pulled the rest of SCHEMA.md sections 2-5 forward (superseding D-024's "lands at T-2.01"): `src/lib/schema/{ids,evidence,claims,report,analysis,run}.ts`, verbatim from the doc. Needed because "demo dataset typed with schemas" (T-1.08's own spec) requires the real `Analysis`/`Report` shapes, and R-COD-03 forbids a hand-written duplicate. T-2.01 is now mainly the remaining TQ-2 decision (JSON Schema conversion for the model's tool call) plus section 6 (Comparison/Activity/Signal/Export), not a from-scratch build. | No new design decisions were needed — SCHEMA.md already fully specifies these; only R-PRC-07's "changing schemas" gate applies to an actual design change, not implementing what's already written down | Accepted |
| D-027 | 2026-09-22 | `Iso` uses `z.iso.datetime()`, and URL fields use `z.url()`, not `z.string().datetime()` / `z.string().url()` as SCHEMA.md originally showed. Both are `@deprecated` in the pinned Zod 4.6.5's own type definitions (same runtime behaviour, current spelling). Fixed in both the doc and `src/lib/schema/`. | Checked the installed package's types rather than copying the doc's snippet verbatim (R-PRC-08/R-COD-09) | Accepted |
| D-028 | 2026-09-22 | Demo/fixture IDs (`src/demo/ids.ts`) are `${prefix}_${n.toString().padStart(26, "0")}` — digits only, deterministic, satisfies `idOf()`'s regex. The real prefixed-ULID generator (R-COD-04) is deferred to Phase 2 (T-2.01/T-2.02): demo data is static and never needs a fresh unique ID, so building the real generator now would be unused scaffolding. | Avoids speculative infrastructure ahead of the task that actually needs it | Accepted |
| D-029 | 2026-09-22 | T-1.09 `AppShell`: sidebar collapse state is in-memory only (no localStorage persistence) — DESIGN only requires it to be collapsible, not for the choice to survive a reload, and persisting it would need a read-on-mount effect that either mismatches the SSR'd markup or trips the "no setState synchronously in an effect" lint rule for a requirement that doesn't exist. `/app/compare`, `/app/watchlist`, `/app/settings` nav links point at routes that don't exist until Phase 4/5; left as ordinary `<Link>`s (ordinary click-to-fetch, no `prefetch={false}` special-casing) rather than working around Next's harmless prefetch 404s. | Don't build for a requirement nobody asked for; don't hide an honest "not built yet" behind a flag | Accepted |

Pending decisions (resolve at the named task, then add a D-entry):

| Topic | Resolve in |
|---|---|
| PDF extraction library (TQ-1) | T-2.03 |
| Zod version and JSON Schema conversion (TQ-2) | T-2.01 |
| Web research provider (TQ-5) | T-2.14 |
| Hosting and verified request limits (TQ-3, OQ-7) | T-3.14 |
| Queue technology (TQ-4) | T-6.03 |

## 3. Conventions

- IDs: prefixed ULIDs (`ana_`, `run_`, `clm_` and so on). Enums are UPPER_SNAKE. Fields are camelCase.
- Files: components PascalCase, everything else kebab-case. Named exports.
- Commits: conventional commits with the task ID, for example `feat(engine): add scoring module (T-2.10)`.
- Fixtures: fictional companies only, under `evals/fixtures/<slug>/`.
- Docs are updated in the same change as the code they describe.

## 4. Gotchas and lessons

- `@` imports in `CLAUDE.md` are ignored inside code spans and code blocks. Imported files load in full at session start, so keep `RULES.md` and this file lean.
- Firestore rules are not filters. Any client list query must include an `ownerId` filter. The app lists on the server.
- Firestore documents are limited to 1 MiB. Dimension analyses live in a subcollection for this reason.
- Storage rules can be satisfied by a spoofed content type. Always re-validate uploads by content (magic bytes) on the server. Some browsers send `application/octet-stream` for `.md`; the client sets `contentType` explicitly.
- In inline orchestration mode the handler must ignore client disconnects; do not tie the pipeline to the request abort signal.
- The CSS `overlay` property has limited support; exits are unanimated in some browsers, which is acceptable.
- Numeric grounding exempts bare integers of 10 or below (known limitation, AI_SPEC V2).
- Tabular numerals in IBM Plex Sans: confirmed, see D-021. `font-variant-numeric: tabular-nums` works as-is.
- Next.js 16 generates `LayoutProps`/`PageProps` globals into `.next/types`; plain `tsc --noEmit` fails on them until those types exist. `pnpm typecheck` runs `next typegen` first.
- `next dev` auto-appends a `<!-- BEGIN:nextjs-agent-rules -->` block to `CLAUDE.md` pointing at `node_modules/next/dist/docs/` for this Next.js version's breaking changes vs. training data. It re-adds itself if removed; commit it rather than fight it.
- Prettier's markdown formatter escapes bare `*` as emphasis (e.g. `FR-*` becomes `FR-_`), corrupting the spec docs' glob-style IDs. Root and `docs/` markdown are excluded from Prettier (`.prettierignore`).
- The `shadcn` CLI's `init`/`add` need `ui.shadcn.com`, which this sandbox's network policy blocks outright (403 at the CONNECT layer). `raw.githubusercontent.com` and `api.github.com` are reachable. T-0.04's Button primitive was hand-written (cva + @radix-ui/react-slot + cn), matching shadcn/ui's own convention, instead of run through the CLI. Same workaround applies to T-1.02's remaining primitives unless the policy changes.
- This sandbox pre-installs Chromium at `/opt/pw-browsers/chromium` outside Playwright's own managed cache. `playwright.config.ts` stays portable (normal browser resolution by default); set `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` as an env var (not committed) to point the `chromium` project at it in this sandbox.
- A Tailwind `display` utility (e.g. `flex`) applied unconditionally to a native `<dialog>`/`[popover]` element overrides the UA stylesheet's `:not([open]) { display: none }` — author origin always wins over UA origin, specificity tie or not — so the element stays visible and interactive after "closing". Scope any `display` utility on top-layer elements to `open:` (e.g. `hidden open:flex`), same as the opacity/transform transition classes (T-1.02, Sheet).
- jsdom doesn't implement `HTMLDialogElement.showModal()`/`close()` at all (not even a stub). Native-`<dialog>` components (Dialog, Sheet) can't be meaningfully unit-tested in Vitest; use Playwright instead (`tests/e2e/dialog-sheet.spec.ts`).
- `@testing-library/react`'s auto-cleanup only registers if it detects a *global* `afterEach`; this project's `globals: false` (vitest.config.ts) means it silently never ran, so components rendered by one test leaked into the next and caused ambiguous-query failures once a file had more than one render of the same markup. Fixed by calling `cleanup()` explicitly in `tests/setup.ts`'s own `afterEach`.
- T-0.06: no real Firebase project exists yet. `.firebaserc` points at the demo project `demo-argus-ai` (the Firebase Emulator Suite's offline mode — no GCP project, billing or credentials needed) so `pnpm emulators` works standalone; verified Auth (9099), Firestore (8080) and Storage (9199) all start and answer. **Action needed from the project owner before T-3.01**: create real `dev` and `prod` Firebase projects in the console, add their aliases to `.firebaserc`, and put the Admin SDK service-account values into `.env.local` — an agent session can't do this without your Firebase account.
- `src/lib/env.ts`'s server `env` export originally threw on `typeof window !== "undefined"` to catch a client import early. Dropped it: jsdom (Vitest's default test environment) defines `window` too, so it broke legitimate server-side tests. Next.js already leaves non-`NEXT_PUBLIC_*` vars undefined in the browser bundle, so a client import still fails fast via the normal Zod error, just without the friendlier message.
- `Math.cos`/`Math.sin` can return values that differ in their last bit between Node's V8 build (SSR) and the browser's V8 build (hydration), which shows up as a real React hydration mismatch once those values are embedded verbatim in an SSR'd SVG path `d` string. Only caught via a Playwright console-error check, not any unit test. Fixed at the source: `polarToCartesian` in `src/components/charts/geometry.ts` rounds every coordinate to 2 decimal places, which collapses the sub-visible difference before it reaches the DOM. Applies to every chart built on that shared geometry module (ScoreGauge, DimensionRadar, and future ones).
- `next start` loads the server bundle into memory once; a later `pnpm build` overwriting `.next/` is invisible to an already-running `next start` process, and `playwright.config.ts`'s `reuseExistingServer` will happily hand a fresh test run to that stale server. Symptom looked like real bugs (duplicate accessible names, a random 500) that vanished once the leftover `next-server` process was killed. Check `lsof -i :3000` (or just kill any stray `next-server`) before trusting a Playwright run that follows manual `pnpm start`/`pnpm build` commands in the same session.

## 5. Open questions

See TRACKER "Decisions needed" for the live list (TQ-1 to TQ-5, OQ-1, OQ-8) and PRD section 16 for product questions.

## 6. Session log (newest first)

- 2026-09-22: T-1.08 (demo dataset, `DemoBanner`) and T-1.09 (`AppShell`) done. T-1.08 pulled the rest of SCHEMA.md sections 2-5 forward (D-026), fixed two now-deprecated Zod APIs the doc used (D-027), and built one fully-worked fictional analysis (Loopwell, all 8 dimension analyses) plus three lighter ones for list diversity — every fixture schema-parsed at module load and re-asserted in tests, including that each fact's quote is a real substring of its evidence text (R-AI-03). T-1.09 built Sidebar/Topbar/MobileBottomBar/Breadcrumbs and wired them into a real `/app` route (not just `/dev/ui` — the mobile bar is viewport-fixed, so a contained gallery preview would misrepresent it); a Playwright pass at 1440/768/390 caught two real accessibility bugs (collapsed sidebar links losing their accessible name entirely; a duplicate "New analysis" control once the topbar and mobile bar were both visible) and one environment false alarm (see gotchas, stale `next-server`). Nav links to not-yet-built routes (Compare, Watchlist, Settings) are left as ordinary Links (D-029) rather than special-cased. `pnpm check`, `pnpm build` green. Next: T-1.10 (command palette skeleton). Older entries: `docs/memory-archive/2026-09-session-log.md`.
