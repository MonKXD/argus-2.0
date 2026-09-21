# ARGUS AI — Project Memory

Version-controlled memory for this project: decisions, conventions, gotchas and session notes. It is separate from Claude Code's own auto-memory and is loaded into every session through `CLAUDE.md`, so keep it lean (about 150 lines; move older session notes to `docs/memory-archive/`).

How to update: add a decision when you choose between real options; add a gotcha when something cost time; add a session note at the end of each working session. Never store secrets, real company data or document content here.

Last updated: 2026-09-21

## 1. Snapshot

- Product: evidence-first startup due diligence platform. Every claim is `VERIFIED`, `AI_ANALYSIS`, `ASSUMPTION` or `MISSING`. Trust is enforced in code.
- Stage: documentation complete; implementation begins at Phase 0 (see TRACKER "Current focus").
- Stack: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Firebase (Auth, Firestore, Storage), Anthropic API, Zod, Vitest, Playwright, pnpm.

Pinned versions (fill in during T-0.11):

| Package | Version |
|---|---|
| | |

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
- Verify tabular numerals in IBM Plex Sans during T-1.01; fall back to Plex Mono for numeric columns if needed.

## 5. Open questions

See TRACKER "Decisions needed" for the live list (TQ-1 to TQ-5, OQ-1, OQ-8) and PRD section 16 for product questions.

## 6. Session log (newest first)

- 2026-09-21: Generated the documentation set v0.1: PRD, TRD, APP_FLOW, SCHEMA, DESIGN, AI_SPEC, IMPLEMENTATION_PLAN, TRACKER, RULES, PROJECT_MEMORY, CLAUDE.md, README, `.env.example`. No code written yet. Next: Phase 0 (T-0.01).
