import type { LLM } from "@/lib/ai/llm";
import { analyzeDimension } from "@/lib/analysis/steps/analyze-dimension";
import type { DimensionAnalysis } from "@/lib/schema/claims";
import type { DimensionKey, Stage } from "@/lib/schema/enums";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";
import type { RunWarning } from "@/lib/schema/report";
import { DIMENSION_KEYS } from "@/lib/schema/rubrics";
import type { Usage } from "@/lib/schema/run";

const DEFAULT_CONCURRENCY = 4;

export interface AnalyzeAllDimensionsArgs {
  analysisId: string;
  runId: string;
  startupName: string;
  stage: Stage;
  sector?: string;
  analystFocus?: string;
  llm: LLM;
  evidence: Evidence[];
  sources: Source[];
  facts: Fact[];
  /** TRD 5.4: "runs up to 4 dimension calls concurrently (configurable)" — pass env.ANALYZE_CONCURRENCY. */
  concurrency?: number;
  signal?: AbortSignal;
}

export interface FailedDimension {
  dimension: DimensionKey;
  error: string;
}

export interface AnalyzeAllDimensionsResult {
  dimensions: DimensionAnalysis[];
  failed: FailedDimension[];
  warnings: RunWarning[];
  usage: Usage[];
}

/**
 * AI_SPEC's ANALYZE step across all 8 dimensions, bounded concurrency (TRD
 * 5.4). "Failure in ANALYZE for one dimension marks that dimension failed
 * and the run PARTIAL" (TRD 5.2): a thrown error from one dimension's call
 * is caught and recorded in `failed` rather than aborting the others;
 * translating that into the run's `dimensionStatus`/`PARTIAL` status is the
 * step runner's job (T-3.08), which doesn't exist yet.
 */
export async function analyzeAllDimensions(args: AnalyzeAllDimensionsArgs): Promise<AnalyzeAllDimensionsResult> {
  const concurrency = Math.max(1, args.concurrency ?? DEFAULT_CONCURRENCY);
  const queue = [...DIMENSION_KEYS];

  const dimensions: DimensionAnalysis[] = [];
  const failed: FailedDimension[] = [];
  const warnings: RunWarning[] = [];
  const usage: Usage[] = [];

  async function worker(): Promise<void> {
    let dimension: DimensionKey | undefined;
    while ((dimension = queue.shift())) {
      try {
        const result = await analyzeDimension({ ...args, dimension });
        dimensions.push(result.dimension);
        warnings.push(...result.warnings);
        usage.push(result.usage);
      } catch (error) {
        failed.push({ dimension, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));

  const order = new Map(DIMENSION_KEYS.map((d, i) => [d, i]));
  dimensions.sort((a, b) => order.get(a.dimension)! - order.get(b.dimension)!);

  return { dimensions, failed, warnings, usage };
}
