# ARGUS AI

Evidence-first startup due diligence platform. Users add a pitch deck, website and notes; ARGUS
extracts evidence, analyses eight dimensions and produces a report with an Investment Score.
Every statement is labelled VERIFIED, AI_ANALYSIS, ASSUMPTION or MISSING. Trust is enforced in
code (schemas, validators, deterministic scoring), not by prompts alone. Solo-built.

Stack: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Firebase (Auth, Firestore,
Storage), Anthropic API (server-side only), Zod, Vitest, Playwright, pnpm.

## Always-loaded context

@docs/RULES.md
@docs/PROJECT_MEMORY.md

Personal overrides go in `CLAUDE.local.md` (gitignored).

## Documents (read the sections a task names; do not load everything)

- `docs/PRD.md`: requirements (FR-*, NFR-*), epistemic model (section 8), report spec (section 10)
- `docs/TRD.md`: architecture, engine interfaces, API routes, security, budgets
- `docs/AI_SPEC.md`: evidence contract, pipeline, rubrics, scoring, verifier, prompts, evals
- `docs/SCHEMA.md`: Zod schemas, Firestore model and rules, canonical fact keys
- `docs/APP_FLOW.md`: routes, screens, states, edge cases
- `docs/DESIGN.md`: tokens, evidence textures, components, motion, review checklist
- `docs/IMPLEMENTATION_PLAN.md`: phases, exit criteria, kickoff prompts
- `docs/TRACKER.md`: task list and status. Read only "Current focus" and the task's phase section.

## Commands

- `pnpm dev`, `pnpm build`
- `pnpm check` runs lint, typecheck and tests. It must pass before any task is done.
- `pnpm test:e2e`, `pnpm test:rules` (needs `pnpm emulators` running), `pnpm emulators`
- `pnpm analyze <path>` runs the engine on a fixture. `pnpm eval` runs the eval harness (live model).

## Session loop

1. Read the tracker's Current focus and the doc sections the task names.
2. For M or L tasks, write a short plan and confirm it before coding.
3. UI work: run `pnpx modern-web-guidance@latest search "<query>"` first.
4. Implement, then run `pnpm check` (and `pnpm eval` for engine changes).
5. Update TRACKER.md and PROJECT_MEMORY.md, then commit (conventional commit with task ID).

## Non-negotiables (full list in docs/RULES.md)

- Never invent facts, quotes, sources or numbers. Unknown is a MISSING claim.
- The model proposes; validators decide. Never weaken a verifier, threshold or golden test to pass.
- Scores are computed by code. The model never outputs a score or confidence.
- Clients never write to Firestore and never call the model. Writes go through route handlers with the Admin SDK.
- Every route: requireUser() then assertOwns(). Never log document text, quotes or prompts.
- Render model and document text as text only. Never dangerouslySetInnerHTML.
- Colours from tokens only. Every claim shows its status marker. Follow the rejected defaults in DESIGN section 2.
- No investment recommendations. Keep the disclaimer where PRD section 15 requires it.
- Ask before adding dependencies or changing schemas, prompts, scoring, security rules or design direction.
- Never read, print or commit `.env*` files.

## Repo map

`src/lib/analysis` engine (no next/* imports), `src/lib/ai` model client, `src/lib/schema` Zod,
`src/lib/repos` Firestore, `src/app` routes, `src/components` UI, `evals/` fixtures and harness,
`firebase/` rules and indexes, `docs/` specifications.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
