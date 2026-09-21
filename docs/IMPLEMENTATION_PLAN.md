# ARGUS AI — Implementation Plan

| | |
|---|---|
| Version | 0.1 |
| Date | 2026-09-21 |
| Read with | [TRACKER](TRACKER.md) (task list and status), [PRD](PRD.md), [TRD](TRD.md), [RULES](RULES.md) |

The plan defines phases, goals, exit criteria and kickoff prompts. Individual tasks (with IDs) live in the tracker. Task IDs follow `T-<phase>.<nn>`.

---

## 1. Strategy

1. **De-risk the hard part first.** The product lives or dies on grounded analysis. Phase 2 builds and proves the engine from the command line, with no UI and no Firebase, before the app is wired around it.
2. **Phase 1 and Phase 2 are independent** and can be done in either order or interleaved. Design work gives visible progress; engine work removes the biggest risk.
3. **Thin vertical slices.** Each phase ends with something runnable and reviewable.
4. **Docs stay true.** A change to behaviour, schema, prompts or design updates the matching doc in the same change.

## 2. Working agreement with Claude Code

Each session follows this loop:

1. Read `CLAUDE.md`, then the tracker's "Current focus" and the sections named by the task.
2. For any task sized M or L, write a short plan (files to touch, approach, tests) and confirm it before coding.
3. Implement in small steps. For UI, run modern-web-guidance first (RULES R-UI-01).
4. Run `pnpm check`. For engine changes also run `pnpm eval` or the relevant subset.
5. Update the tracker (tick the task, note follow-ups) and `PROJECT_MEMORY.md` (decisions, gotchas, session note).
6. Commit with a conventional commit message. One task, one commit where practical.

Size key: **S** under one session, **M** one to two sessions, **L** three or more. A session is one focused working block of roughly one to three hours. Estimates are for planning, not commitments.

## 3. Phase overview

| Phase | Name | Release | Est. sessions | Depends on |
|---|---|---|---|---|
| 0 | Foundation | | 1 to 2 | none |
| 1 | Design system, landing, shell, dashboard (demo data) | | 6 to 10 | 0 |
| 2 | Engine spike (CLI-first) | | 8 to 12 | 0 |
| 3 | Auth, persistence, intake, orchestration | | 8 to 12 | 1, 2 |
| 4 | Report UI | **Alpha** | 8 to 12 | 3 |
| 5 | Compare, export, watchlist, activity, dashboard intelligence | **Beta** | 6 to 9 | 4 |
| 6 | Monitoring, hardening, launch | **1.0** | 6 to 10 | 5 (parts earlier) |

Critical path: 0, 2, 3, 4, 5, 6. Phase 1 runs in parallel with Phase 2.

---

## 4. Phase 0 — Foundation

**Goal:** a running, checked, empty app with tooling, emulators, CI and the docs in place.

**Covers:** NFR-10, NFR-12. Tasks: T-0.01 to T-0.11.

**Deliverables:** Next.js App Router project (TypeScript strict, pnpm), lint and format, Tailwind, shadcn base, validated env handling, Firebase project and emulators, Vitest and Playwright set up, GitHub Actions, pino logger with redaction, docs and `CLAUDE.md` committed.

**Exit criteria**
- [ ] `pnpm check` and `pnpm build` pass locally and in CI
- [ ] `pnpm emulators` starts Auth, Firestore, Storage
- [ ] App fails fast with a clear message when required env vars are missing
- [ ] Exact dependency versions recorded in PROJECT_MEMORY

**Kickoff prompt**
```
Read CLAUDE.md, then docs/IMPLEMENTATION_PLAN.md (Phase 0) and docs/TRD.md sections 2, 4, 18, 19.
Execute T-0.01 to T-0.11 from docs/TRACKER.md in order.
Before installing anything, list the dependencies you plan to add and why, and wait for my
approval. Pin exact versions. After each task run `pnpm check`, tick it in TRACKER.md and
commit with a conventional commit. Finish by recording pinned versions in docs/PROJECT_MEMORY.md.
```

## 5. Phase 1 — Design system, landing, shell, dashboard (demo data)

**Goal:** ARGUS looks and feels like ARGUS before any backend exists.

**Covers:** FR-LND-01..03, FR-DSH-01, 02, 04 (search and sort), 05, NFR-05, NFR-06. Tasks: T-1.01 to T-1.17.

**Deliverables:** tokens and Tailwind mapping; primitives; the evidence texture components (`EvidenceMarker`, `StatusBadge`, `ReliabilityChip`, `EvidenceBar`); `ScoreGauge`; `DimensionRadar`; app shell with command palette skeleton; landing page with the hero sequence; `/sample` report preview from the demo dataset; dashboard and analyses list on demo data; all empty, loading and error states; `/dev/ui` gallery.

**Exit criteria**
- [ ] Landing, dashboard, analyses list and sample reviewed at 1440, 768, 390 px against DESIGN section 13
- [ ] No serious accessibility violations from automated checks; keyboard path works
- [ ] Contrast results for all text and status tokens recorded
- [ ] Demo data is typed with the real schemas and labelled "Demo data"
- [ ] Landing meets the performance budget on a production build (NFR-01)

**Kickoff prompt**
```
Read CLAUDE.md, docs/DESIGN.md in full, docs/APP_FLOW.md sections 4 to 7, and docs/PRD.md
section 8.
Before writing components, restate the token system and layout concept in about ten lines and
confirm it matches DESIGN section 2 (including the rejected defaults).
Run `pnpx modern-web-guidance@latest search` for each UI capability you need before building it.
Build T-1.01 first (tokens, fonts, contrast check), then continue in order. Use demo data typed
with the schemas in docs/SCHEMA.md. After each UI task, review screenshots at 1440, 768 and 390
against DESIGN section 13. Do not add gradients, sparkles, all-caps labels or identical card grids.
```

## 6. Phase 2 — Engine spike (CLI-first)

**Goal:** prove grounded analysis end to end on fictional fixtures, with no UI and no Firebase.

**Covers:** FR-ENG-01..08, 12, 13. Tasks: T-2.01 to T-2.18.

**Deliverables:** Zod schemas; `EvidenceStore` with `FileStore`; extractors (PDF with page locators and vision fallback, DOCX, XLSX, CSV, TXT, MD); SSRF-safe website ingestion; Anthropic client wrapper (roles, structured output, caching, usage); steps INGEST to FINALIZE; deterministic scoring with the golden test; verifier V1 to V7; research provider; injection defences; eval harness with fixtures F1 to F8; `pnpm analyze`.

**Exit criteria (gate for Phase 3)**
- [ ] `pnpm eval` meets every threshold in AI_SPEC section 10.2 on F1 to F8
- [ ] `pnpm analyze evals/fixtures/clean-seed-saas` prints a schema-valid report
- [ ] Scoring golden test from AI_SPEC 5.4 passes (65, 0.69, 63, 0.435)
- [ ] Coverage of `scoring/` and `verify/` at least 90%
- [ ] PROJECT_MEMORY records: model IDs used, eval results, median cost and duration per run, decisions for TQ-1, TQ-2, TQ-5

**Risk gate:** if grounded quality cannot be reached, stop and revisit the design (prompt structure, evidence selection, model role choice) before building the app around it.

**Kickoff prompt**
```
Read CLAUDE.md, docs/AI_SPEC.md in full, docs/SCHEMA.md sections 2 to 5 and 8, docs/TRD.md
sections 5, 6, 9, and docs/RULES.md (R-AI, R-SEC).
Goal: a UI-independent engine in src/lib/analysis runnable with `pnpm analyze <path>`.
Do not import from next/*, src/app or src/components in the engine.
Build in this order: T-2.01 schemas, T-2.02 store, T-2.10 scoring with the golden test from
AI_SPEC 5.4 (do this early, it needs no model), T-2.03 to T-2.06 ingestion, T-2.07 client
wrapper, T-2.08 facts, T-2.09 dimensions, T-2.13 verifier, then the rest.
Write the eval fixtures before tuning prompts. Never weaken a verifier or threshold to make an
eval pass. Log eval results in docs/PROJECT_MEMORY.md.
```

## 7. Phase 3 — Auth, persistence, intake, orchestration

**Goal:** a signed-in user can create an analysis, add sources, run the engine, watch progress, and see a stored result (a plain summary page; the full report arrives in Phase 4).

**Covers:** FR-AUT-01, 02, FR-INT-01..06, FR-ENG-09..11, FR-DSH-01..03 (real data), FR-SET-02. Tasks: T-3.01 to T-3.14.

**Deliverables:** Firebase Auth and session cookie; repositories and `FirestoreStore`; rules and rules tests; analyses API; setup wizard; upload flow with server validation; run orchestrator in inline mode with resume and cancel; progress UI via Firestore listener; dashboard on real data; usage limits; deletion cascade; failure UX; temporary result summary page.

**Exit criteria**
- [ ] End-to-end test: sign up, create, upload, run (mocked engine in CI), see summary
- [ ] Manual live run on a fictional fixture completes with the real model
- [ ] Rules tests prove owner isolation and client write denial
- [ ] Deleting an analysis removes Storage objects and all subcollections
- [ ] A killed or failed run can be resumed from the failed step
- [ ] Hosting decision (TQ-3 / OQ-7) recorded, including verified maximum request duration

**Kickoff prompt**
```
Read CLAUDE.md, docs/APP_FLOW.md sections 4, 5.3, 5.4, 8, docs/TRD.md sections 3, 7 to 9, 11,
docs/SCHEMA.md section 6, and docs/RULES.md (R-SEC, R-DAT, R-ARC).
Goal: wire the finished engine into the app without changing engine behaviour.
Implement FirestoreStore behind the existing EvidenceStore interface. All Firestore writes go
through the Admin SDK in route handlers; clients only read analyses and runs.
Every route calls requireUser() and assertOwns(). Write rules tests with the emulator before the
UI depends on them. Never log document content. Decide hosting (TQ-3) early in this phase and
record it in docs/PROJECT_MEMORY.md.
```

## 8. Phase 4 — Report UI (Alpha)

**Goal:** the full 16-section report with the evidence drawer and explain-the-score. This is the Alpha milestone.

**Covers:** FR-RPT-01..19, 21..23, FR-DSH-03 polish. Tasks: T-4.01 to T-4.14.

**Deliverables:** report shell and section nav; all 16 sections; evidence rail and sheet; status filter; evidence bars; explain-the-score; version selector and re-run; checklist tracking; partial-report banner; mobile layout; e2e and visual review.

**Exit criteria**
- [ ] Every section renders from real reports, including sections with missing and low-confidence data
- [ ] Every claim opens the evidence view; `AI_ANALYSIS` shows its basis; `MISSING` shows what is needed
- [ ] Explain-the-score reproduces the AI_SPEC 5.4 arithmetic in the UI
- [ ] `PARTIAL` reports are clearly labelled with a Resume action
- [ ] Keyboard, screen-reader labels and reduced-motion checked; DESIGN section 13 passed at three widths
- [ ] Dogfood on at least three permitted real startups; issues logged in the tracker

**Kickoff prompt**
```
Read CLAUDE.md, docs/DESIGN.md sections 4 to 8 and 13, docs/APP_FLOW.md section 5.5,
docs/PRD.md sections 8 and 10, and docs/SCHEMA.md sections 3 to 5.
Build the report page around ClaimRow/ClaimInline and the evidence rail first (T-4.08), then the
sections. Claims render as text only (never dangerouslySetInnerHTML). Every claim shows its
marker. Do not box claims in cards; follow the annotated-brief layout in DESIGN 5.3.
Run modern-web-guidance before implementing the sheet, sticky nav and content-visibility.
```

## 9. Phase 5 — Compare, export, watchlist, activity, dashboard intelligence (Beta)

**Goal:** make analyses reusable: compare them, export them, keep a watchlist, see patterns.

**Covers:** FR-CMP-01..06, FR-EXP-01, 02, 04, FR-WCH-01, FR-DSH-04 (filters), 06..09, FR-INT-07, FR-AUT-03, FR-SET-01, 04. Tasks: T-5.01 to T-5.13.

**Exit criteria**
- [ ] Compare works for 2 to 4 analyses with explicit missing cells and version warnings
- [ ] Markdown, JSON and print exports include disclaimer, statuses, sources and versions
- [ ] Add-sources-and-re-run creates a new report version without losing history
- [ ] Command palette searches analyses and runs core actions
- [ ] Security review checklist (RULES section 9) passed for new routes

**Kickoff prompt**
```
Read CLAUDE.md, docs/APP_FLOW.md sections 5.6 to 5.8, docs/PRD.md sections 9.7 to 9.10,
docs/SCHEMA.md (Comparison, Export), docs/RULES.md.
Comparison must never rescale or hide scores across scoring versions: warn instead. Missing
values are shown as "Not available", never blank or zero. Exports must include the disclaimer
and per-claim status. Add rules tests for any new collection.
```

## 10. Phase 6 — Monitoring, hardening, launch (1.0)

**Goal:** production-ready: monitoring signals, queue orchestration where needed, server PDF, legal pages, security and performance passes, deploy.

**Covers:** FR-WCH-02, 03, FR-EXP-03, FR-RPT-20, FR-INT-08, FR-SET-03, FR-LND-04, NFR-01..09. Tasks: T-6.01 to T-6.15.

**Exit criteria**
- [ ] Production deploy with separate Firebase project, secrets configured, domain live
- [ ] Legal pages published; disclaimer present everywhere required
- [ ] Security review complete (rules, SSRF, injection, headers, secrets, logging)
- [ ] Performance budgets met (TRD section 12); accessibility audit complete
- [ ] Error tracking and run dashboards live
- [ ] Beta feedback from 5 to 10 users triaged into the tracker

**Kickoff prompt**
```
Read CLAUDE.md, docs/TRD.md sections 3, 11 to 17, docs/PRD.md section 15, docs/RULES.md.
Start with T-6.05 (security review) and T-6.09 (legal pages), which can begin earlier. Run the
full eval suite before deploy and log results. Verify platform request limits against real run
durations before deciding whether T-6.03 (queue mode) is required.
```

## 11. Cut lines

If time is short, cut in this order (each is P1 or P2 and does not affect trust):

1. FR-CMP-05 comparison narrative
2. FR-WCH-02 and FR-WCH-03 monitoring signals
3. FR-EXP-03 server-rendered PDF (print stylesheet remains)
4. FR-DSH-08 derived market intelligence
5. FR-RPT-20 notes; FR-INT-08 duplicate analysis
6. T-6.03 queue mode, if the chosen host safely supports the longest observed run

**Never cut:** verifier and evals, evidence drawer, explain-the-score, deletion cascade, security rules, disclaimer, `PARTIAL` handling.

## 12. Definition of done

Task level:
- [ ] Behaviour matches the requirement IDs on the task
- [ ] Tests added or updated; `pnpm check` passes
- [ ] Engine changes: relevant evals pass and results are logged
- [ ] UI changes: DESIGN section 13 checklist passed
- [ ] Docs, tracker and PROJECT_MEMORY updated in the same change
- [ ] No TODO without a tracker ID

Phase level: every exit criterion above is ticked, and the phase's tracker section is fully checked or has explicit deferrals with reasons.
