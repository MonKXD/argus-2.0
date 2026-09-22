# ARGUS AI — Tracker

Living status of the build. Update in the same commit as the work it describes.

Last updated: 2026-09-22

Legend: `[ ]` todo, `[~]` in progress, `[x]` done, `[!]` blocked. Size: S, M, L (see IMPLEMENTATION_PLAN section 2). Each task lists the requirement IDs it satisfies.

## Current focus

- Phase: 1 — Design system, landing, shell, dashboard (demo data)
- Task: none in progress
- Next up: T-1.14 (analyses list with search and sort)
- Blockers: none. Caveat: T-0.06 needs the project owner to create real Firebase dev/prod projects before T-3.01; local dev runs fully on the emulators in the meantime.

## Phase progress

| Phase | Name | Tasks | Done | Status |
|---|---|---|---|---|
| 0 | Foundation | 11 | 11 | Done (T-0.06 caveat: no real Firebase project yet) |
| 1 | Design system, landing, shell, dashboard (demo data) | 17 | 13 | In progress |
| 2 | Engine spike (CLI-first) | 18 | 0 | Not started |
| 3 | Auth, persistence, intake, orchestration | 14 | 0 | Not started |
| 4 | Report UI (Alpha) | 14 | 0 | Not started |
| 5 | Compare, export, watchlist, activity (Beta) | 13 | 0 | Not started |
| 6 | Monitoring, hardening, launch (1.0) | 15 | 0 | Not started |

---

## Phase 0 — Foundation

- [x] **T-0.01** Scaffold Next.js App Router, TypeScript strict, pnpm, `src/` layout per TRD section 4 · S · NFR-10
- [x] **T-0.02** ESLint, Prettier, import ordering; `pnpm lint` and `pnpm format` · S · NFR-10
- [x] **T-0.03** Tailwind, `next/font` (Newsreader, IBM Plex Sans, IBM Plex Mono), empty `tokens.css` · S · NFR-10
- [x] **T-0.04** shadcn/ui init with base primitives · S · NFR-10
- [x] **T-0.05** Zod-validated env (`src/lib/env.ts`); `.env.example` kept in sync · S · NFR-12
- [~] **T-0.06** Firebase dev and prod projects, `firebase/` placeholders, emulators, `pnpm emulators` · M · NFR-03 — emulators verified working (Auth, Firestore, Storage all healthy); creating the real dev/prod Firebase projects needs the account holder, see PROJECT_MEMORY
- [x] **T-0.07** Vitest, Testing Library, MSW; one sample test · S · NFR-10
- [x] **T-0.08** Playwright with a smoke test · S · NFR-10
- [x] **T-0.09** GitHub Actions: lint, typecheck, test, build · S · NFR-10
- [x] **T-0.10** Commit docs and `CLAUDE.md`; verify imports load; add `CLAUDE.local.md` to `.gitignore` · S · NFR-10
- [x] **T-0.11** pino logger with redaction; `Intl` format helpers in `src/lib/format.ts` · S · NFR-04, NFR-11

## Phase 1 — Design system, landing, shell, dashboard (demo data)

- [x] **T-1.01** Tokens, Tailwind mapping, fonts; automated contrast check recorded in PROJECT_MEMORY; verify tabular numerals · M · NFR-05
- [x] **T-1.02** Primitives: Button, Input, Select, Tabs, Dialog/Sheet, Popover, Tooltip, Toast, Skeleton, Table · M · NFR-05
- [x] **T-1.03** `EvidenceMarker`, `StatusBadge`, `ReliabilityChip` with all four textures and forced-colors fallback · S · FR-RPT-17, NFR-05
- [x] **T-1.04** `EvidenceBar` with text alternative and legend · S · FR-RPT-18
- [x] **T-1.05** `ScoreGauge` (scored, not scored, capped states; confidence meter) · M · FR-RPT-03
- [x] **T-1.06** `DimensionRadar` (low-confidence and unscored styling; table alternative) · M · FR-RPT-03
- [x] **T-1.07** Sparkline and bar chart wrappers · M · FR-DSH-01
- [x] **T-1.08** Fictional demo dataset typed with schemas (`src/demo/`), `isDemo` labelling, `DemoBanner` · M · FR-LND-02
- [x] **T-1.09** `AppShell`: sidebar, topbar, mobile bottom bar, breadcrumbs · M · FR-DSH-01, NFR-06
- [x] **T-1.10** Command palette skeleton (glass overlay, native dialog pattern) · S · FR-DSH-09
- [x] **T-1.11** Landing page with hero sequence, statuses, how it works, tour, trust section, footer disclaimer · L · FR-LND-01, FR-LND-03, NFR-01
- [x] **T-1.12** `/sample` preview (score, radar, two sections with claims and evidence rail) · M · FR-LND-02
- [x] **T-1.13** Dashboard on demo data (KPI strip, table, in-progress, panels) · L · FR-DSH-01, FR-DSH-02
- [ ] **T-1.14** Analyses list on demo data with search and sort · M · FR-DSH-04
- [ ] **T-1.15** Empty, loading and error states for all Phase 1 surfaces · S · FR-DSH-05
- [ ] **T-1.16** Responsive and accessibility pass (axe, keyboard, reduced motion) at 1440, 768, 390 · M · NFR-05, NFR-06
- [ ] **T-1.17** `/dev/ui` component gallery covering every state · S · NFR-10

## Phase 2 — Engine spike (CLI-first)

- [ ] **T-2.01** Zod schemas per SCHEMA sections 2 to 5 (mostly done: T-1.03/T-1.08 pulled `src/lib/schema/{enums,ids,evidence,claims,report,analysis,run}.ts` forward for the UI/demo data; this task is now mainly the remaining TQ-2 decision — JSON Schema conversion for the model's forced tool call — plus Comparison/Activity/Signal/Export from section 6) · M · NFR-12
- [ ] **T-2.02** `EvidenceStore` interface and `FileStore` · S · FR-ENG-01
- [ ] **T-2.03** PDF extraction with page locators and vision fallback; choose library (TQ-1) · M · FR-ENG-01
- [ ] **T-2.04** DOCX, XLSX, CSV, TXT, MD extractors behind an `Extractor` interface · M · FR-ENG-01
- [ ] **T-2.05** SSRF-safe website ingestion (limited crawl, robots.txt, readable text) · M · FR-ENG-01, NFR-03
- [ ] **T-2.06** Evidence chunking, locators, hashes, sanitisation, injection-pattern detection · S · FR-ENG-01, FR-ENG-13
- [ ] **T-2.07** LLM client: model roles, forced-tool structured output, repair, caching, usage and budget · M · FR-ENG-11, FR-ENG-13
- [ ] **T-2.08** Fact extraction step with quote validation (V1) · M · FR-ENG-02
- [ ] **T-2.09** Dimension analysis for all eight dimensions with rubrics, clamps and per-dimension validation · L · FR-ENG-05
- [ ] **T-2.10** Scoring module with the AI_SPEC 5.4 golden test · M · FR-ENG-06
- [ ] **T-2.11** Consistency step (deterministic pass plus model adjudication) and flags · M · FR-ENG-04
- [ ] **T-2.12** Synthesis step (narrative and checklist) · M · FR-ENG-07
- [ ] **T-2.13** Verifier V1 to V7 with unit tests · L · FR-ENG-08
- [ ] **T-2.14** `ResearchProvider` interface and implementation; choose provider (TQ-5) · M · FR-ENG-03
- [ ] **T-2.15** Prompt-injection defences and tests · S · FR-ENG-13
- [ ] **T-2.16** Eval harness, fixtures F1 to F8, thresholds, results logging · L · FR-ENG-12
- [ ] **T-2.17** CLI `pnpm analyze` with progress output and JSON report · S · FR-ENG-01, FR-ENG-05
- [ ] **T-2.18** Phase gate: thresholds met; log results, cost and duration in PROJECT_MEMORY · S · FR-ENG-12

## Phase 3 — Auth, persistence, intake, orchestration

- [ ] **T-3.01** Firebase Auth (Google, email), session cookie, middleware, `requireUser()` · M · FR-AUT-01, FR-AUT-02
- [ ] **T-3.02** Firestore repositories and `FirestoreStore` with converters · M · NFR-12
- [ ] **T-3.03** Firestore and Storage rules with emulator tests · M · NFR-03
- [ ] **T-3.04** Analyses API: create, list, get, update, `assertOwns()` · M · FR-INT-01, FR-INT-06, FR-DSH-01
- [ ] **T-3.05** Setup wizard UI (basics, sources, options, review) with draft saving · L · FR-INT-01, FR-INT-03, FR-INT-04, FR-INT-06
- [ ] **T-3.06** Upload flow: direct-to-Storage, server validation by content, limits, errors · M · FR-INT-02, FR-INT-05
- [ ] **T-3.07** URL and pasted-text sources · S · FR-INT-02
- [ ] **T-3.08** Run orchestrator (inline mode) with resume and cancel · L · FR-ENG-09, NFR-02
- [ ] **T-3.09** Run progress UI via Firestore listener; in-progress module on dashboard · M · FR-ENG-10, FR-DSH-03
- [ ] **T-3.10** Dashboard on real data; temporary result summary page · M · FR-DSH-01, FR-DSH-02
- [ ] **T-3.11** Usage limits, run budget, daily limit, concurrency limit · S · FR-ENG-11, NFR-09
- [ ] **T-3.12** Deletion cascade (Firestore and Storage) · S · FR-SET-02
- [ ] **T-3.13** Failure UX: retry, resume, partial states · M · FR-ENG-09
- [ ] **T-3.14** Hosting decision with verified request-duration limits (TQ-3, OQ-7) · S · NFR-02

## Phase 4 — Report UI (Alpha)

- [ ] **T-4.01** Report shell: header, sticky section nav, scroll-spy, deep links · M · FR-RPT-15
- [ ] **T-4.02** Sections 1 to 3: executive summary, investment overview, score with explain-the-score · L · FR-RPT-01, FR-RPT-02, FR-RPT-03, FR-RPT-22
- [ ] **T-4.03** Sections 4 and 5: founder and team, product and business model · M · FR-RPT-04, FR-RPT-05
- [ ] **T-4.04** Sections 6 to 8: market opportunity, trends, competitive landscape · L · FR-RPT-06, FR-RPT-07, FR-RPT-08
- [ ] **T-4.05** Sections 9 and 10: traction, financial signals · M · FR-RPT-09, FR-RPT-10
- [ ] **T-4.06** Sections 11 to 13: risks and flags, strengths and weaknesses, market gaps · M · FR-RPT-11, FR-RPT-12, FR-RPT-13
- [ ] **T-4.07** Sections 14 to 16: AI insights, evidence and sources, checklist · L · FR-RPT-14, FR-RPT-15, FR-RPT-16
- [ ] **T-4.08** Evidence rail and sheet with quote in context, reliability, and "based on" (extends `EvidenceRailContent` from T-1.11/D-031 with the responsive docked-column-vs-sheet chrome and live Firestore lookups — not a rebuild) · L · FR-RPT-17
- [ ] **T-4.09** `ClaimRow` and `ClaimInline`; status filter (`ClaimInline` already exists from T-1.11/D-031; this adds `ClaimRow` for the report-page gutter and the status filter) · M · FR-RPT-23
- [ ] **T-4.10** Section evidence bars and coverage notes · S · FR-RPT-18
- [ ] **T-4.11** Report versions, version selector, re-run · M · FR-RPT-19
- [ ] **T-4.12** Checklist tracking (status, notes) and flag acknowledge · M · FR-RPT-21
- [ ] **T-4.13** Mobile report layout · M · NFR-06
- [ ] **T-4.14** Report e2e, visual review, dogfood on three startups; switch `/sample` to the full demo report · M · NFR-05

## Phase 5 — Compare, export, watchlist, activity (Beta)

- [ ] **T-5.01** Compare creator and comparison persistence · M · FR-CMP-01, FR-CMP-06
- [ ] **T-5.02** Compare view: radar overlay, score table with deltas, metric matrix · L · FR-CMP-02, FR-CMP-03
- [ ] **T-5.03** Comparability warnings · S · FR-CMP-04
- [ ] **T-5.04** Grounded comparison narrative through the verifier · M · FR-CMP-05
- [ ] **T-5.05** Markdown and JSON export · S · FR-EXP-01, FR-EXP-04
- [ ] **T-5.06** Print stylesheet and `/print/report/[id]` · M · FR-EXP-02, FR-EXP-04
- [ ] **T-5.07** Watchlist toggle and panel · S · FR-WCH-01, FR-DSH-06
- [ ] **T-5.08** Activity feed · S · FR-DSH-07
- [ ] **T-5.09** Dashboard patterns panel (derived from own analyses) · M · FR-DSH-08
- [ ] **T-5.10** Command palette wired; list filters · M · FR-DSH-04, FR-DSH-09
- [ ] **T-5.11** Add sources to a completed analysis; incremental re-run · L · FR-INT-07
- [ ] **T-5.12** Sign out and delete account · S · FR-AUT-03
- [ ] **T-5.13** Usage and limits view; scoring methodology view · M · FR-SET-01, FR-SET-04

## Phase 6 — Monitoring, hardening, launch (1.0)

- [ ] **T-6.01** Signals pipeline for watchlisted companies (scheduled) · L · FR-WCH-02
- [ ] **T-6.02** Signal feed UI and re-run prompt · M · FR-WCH-03
- [ ] **T-6.03** Queue-based orchestrator if required (TQ-4) · L · NFR-02
- [ ] **T-6.04** Server-rendered PDF export · M · FR-EXP-03
- [ ] **T-6.05** Security review: rules, SSRF, injection, headers and CSP, secrets, logging · M · NFR-03, NFR-04
- [ ] **T-6.06** Performance pass against budgets · M · NFR-01
- [ ] **T-6.07** Accessibility audit and cross-browser check · M · NFR-05, NFR-06, NFR-07
- [ ] **T-6.08** Observability: error tracking, run and cost dashboards · M · NFR-08, NFR-09
- [ ] **T-6.09** Legal pages (terms, privacy, disclaimer); legal wording review (OQ-8) · S · PRD section 15
- [ ] **T-6.10** Production deploy, secrets, domain · M · NFR-02
- [ ] **T-6.11** Beta feedback loop with 5 to 10 users · M · PRD section 13
- [ ] **T-6.12** Export all my data · S · FR-SET-03
- [ ] **T-6.13** Duplicate analysis · S · FR-INT-08
- [ ] **T-6.14** Section notes · M · FR-RPT-20
- [ ] **T-6.15** Landing SEO and social metadata · S · FR-LND-04

---

## Decisions needed

| ID | Question | Resolve in | Status |
|---|---|---|---|
| TQ-1 | PDF extraction library | T-2.03 | Open |
| TQ-2 | Zod version and JSON Schema conversion | T-2.01 | Open |
| TQ-3 / OQ-7 | Hosting: Firebase App Hosting or Vercel | T-3.14 | Open |
| TQ-4 | Queue technology for mode B | T-6.03 | Open |
| TQ-5 | Web research provider | T-2.14 | Open |
| OQ-1 | Pricing and packaging | Before public launch | Open |
| OQ-8 | Legal review of terms and disclaimer | T-6.09 | Open |

## Blocked

None.

## Bug log

| ID | Found | Description | Severity | Status |
|---|---|---|---|---|
| | | | | |

## Tech debt

| ID | Description | Origin task | Payback |
|---|---|---|---|
| | | | |

## Changelog

- 2026-09-21: Phase 0 (T-0.01 to T-0.11) complete, except the real Firebase dev/prod projects within T-0.06 (needs the account owner). `pnpm check` and `pnpm build` green.
- 2026-09-21: Documentation set v0.1 created (PRD, TRD, APP_FLOW, SCHEMA, DESIGN, AI_SPEC, IMPLEMENTATION_PLAN, TRACKER, RULES, PROJECT_MEMORY, CLAUDE.md, README, .env.example).
