# ARGUS AI

An evidence-first startup due diligence and investment intelligence platform. Give it a pitch deck, a website and notes; it extracts evidence, analyses eight dimensions, and produces a structured report with an Investment Score. Every statement is labelled as verified or sourced, AI analysis, assumption, or missing, and every claim can be traced to its source.

Status: pre-alpha. The specification set is complete; implementation starts at Phase 0 (see `docs/TRACKER.md`).

> ARGUS AI is a research and intelligence tool. It does not provide investment, legal, tax or financial advice, and its outputs are not a substitute for professional due diligence. Verify all material facts independently.

## Prerequisites

- Node.js (current LTS) and pnpm
- Firebase CLI, plus whatever runtime the Firebase emulators require (check the Firebase docs for current requirements)
- An Anthropic API key
- A Firebase project for development

## Quick start

```bash
pnpm install
cp .env.example .env.local     # fill in the values
pnpm emulators                 # Auth, Firestore, Storage
pnpm dev                       # http://localhost:3000
```

Never commit `.env.local` or any real documents.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Run, build, serve |
| `pnpm lint` / `pnpm format` / `pnpm typecheck` | Static checks |
| `pnpm test` / `pnpm test:e2e` | Unit and integration tests, Playwright |
| `pnpm check` | Lint, typecheck and tests. Must pass before a task is done. |
| `pnpm emulators` | Firebase emulators |
| `pnpm analyze <path>` | Run the analysis engine on a fixture or folder |
| `pnpm eval` | Run the eval harness (calls the live model) |

## Documentation

| Doc | Contents |
|---|---|
| `docs/PRD.md` | Product requirements, epistemic model, report spec |
| `docs/TRD.md` | Architecture, stack, API, security, budgets |
| `docs/AI_SPEC.md` | Evidence contract, pipeline, scoring, verification, prompts, evals |
| `docs/SCHEMA.md` | Zod schemas, Firestore model, rules, canonical fact keys |
| `docs/APP_FLOW.md` | Routes, screens, states, edge cases |
| `docs/DESIGN.md` | Design system |
| `docs/IMPLEMENTATION_PLAN.md` | Phases and kickoff prompts |
| `docs/TRACKER.md` | Task status |
| `docs/RULES.md` | Engineering and AI rules |
| `docs/PROJECT_MEMORY.md` | Decisions, conventions, gotchas, session notes |
| `CLAUDE.md` | Entry point for Claude Code |

## Structure

```
src/app          routes and API handlers
src/components   UI components
src/lib          analysis engine, model client, schemas, repositories
evals/           fictional fixtures and eval harness
firebase/        security rules and indexes
docs/            specifications
```

## Working with Claude Code

Start each session from the repository root so `CLAUDE.md` loads. Use the kickoff prompt for the current phase in `docs/IMPLEMENTATION_PLAN.md`.

## License

To be decided before any public release.
