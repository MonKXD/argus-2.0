/**
 * In-process cancellation registry (T-3.08; PROJECT_MEMORY D-063). One
 * `AbortController` per currently-executing run, keyed by `runId`, held in
 * this server process's memory only. `POST /runs` registers a controller
 * before kicking off the pipeline via `after()`; `POST /runs/:runId/cancel`
 * looks it up and aborts it. This is deliberately not durable — the run
 * document's own `Run.cancelRequested` field is the durable signal a
 * different process (or a restarted one) can still observe, but only this
 * in-process registry can actually interrupt an in-flight `fetch`/LLM call
 * via `AbortSignal`, which is the user-chosen trade-off over building a
 * cross-process cancellation channel now (queued mode, Phase 6, will need
 * one anyway).
 */
const controllers = new Map<string, AbortController>();

export function registerRun(runId: string): AbortController {
  const controller = new AbortController();
  controllers.set(runId, controller);
  return controller;
}

/** Returns true if a live controller was found and aborted, false if this process isn't the one running it. */
export function abortRun(runId: string): boolean {
  const controller = controllers.get(runId);
  if (!controller) return false;
  controller.abort();
  return true;
}

export function unregisterRun(runId: string): void {
  controllers.delete(runId);
}
