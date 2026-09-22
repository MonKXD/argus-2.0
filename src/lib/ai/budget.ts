import type { Usage } from "@/lib/schema/run";

/**
 * Tracks input, output and cache tokens against a run's token budget (TRD
 * 5.4: "A Budget object tracks input, output and cache tokens against
 * RUN_TOKEN_BUDGET"). Deliberately just an accumulator — deciding what to do
 * when it's exceeded (stop starting new calls, persist, mark the run
 * PARTIAL with BUDGET_EXCEEDED) is the step runner's job (T-3.08), which
 * doesn't exist yet; this only answers "how much is left" and "has it run
 * out" so that runner has something to call once it does.
 */
export class Budget {
  private spent = 0;

  constructor(private readonly limitTokens: number) {}

  record(usage: Usage): void {
    this.spent += usage.inputTokens + usage.outputTokens + usage.cacheWriteTokens + usage.cacheReadTokens;
  }

  get spentTokens(): number {
    return this.spent;
  }

  remainingTokens(): number {
    return Math.max(this.limitTokens - this.spent, 0);
  }

  exceeded(): boolean {
    return this.spent >= this.limitTokens;
  }
}
