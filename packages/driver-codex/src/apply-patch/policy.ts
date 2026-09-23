/**
 * Patch capability policy for Office pipeline.
 * Iron rule from llmapi-adapter-design §5:
 *   apply-patch must be regression-tested against mimo; on failure → disable
 *   patch and use deterministic tools only (write_file / structured JSON).
 */

export interface PatchRegressionSummary {
  total: number;
  passed: number;
  failed: number;
  failures: Array<{ name: string; reason: string }>;
}

export type PatchMode = "apply_patch" | "deterministic_only";

export interface PatchPolicy {
  mode: PatchMode;
  reason: string;
  /** Set when live mimo regression has been run in this process/session. */
  lastRegression?: PatchRegressionSummary;
}

const DEFAULT_MAX_FAILURE_RATE = 0.15;

/**
 * Decide whether apply_patch may be exposed to the model.
 * - Offline fixture suite must pass (shape contract).
 * - Optional live mimo regression failure rate above threshold disables patch.
 */
export function evaluatePatchPolicy(
  fixture: PatchRegressionSummary,
  live?: PatchRegressionSummary,
  maxFailureRate = DEFAULT_MAX_FAILURE_RATE,
): PatchPolicy {
  if (fixture.failed > 0) {
    return {
      mode: "deterministic_only",
      reason: `fixture suite failed ${fixture.failed}/${fixture.total} — Office uses write_file only`,
      lastRegression: live,
    };
  }
  if (live && live.total > 0) {
    const rate = live.failed / live.total;
    if (rate > maxFailureRate) {
      return {
        mode: "deterministic_only",
        reason: `mimo apply-patch failure rate ${(rate * 100).toFixed(1)}% > ${(maxFailureRate * 100).toFixed(0)}% — patch disabled`,
        lastRegression: live,
      };
    }
    return {
      mode: "apply_patch",
      reason: `fixtures ok; live mimo ok (${live.passed}/${live.total})`,
      lastRegression: live,
    };
  }
  return {
    mode: "apply_patch",
    reason: "fixtures ok; live mimo not run (shape gate open, fallback to write_file on parse fail)",
    lastRegression: live,
  };
}

/** Tools offered to the model given policy. */
export function toolsForPolicy(mode: PatchMode): Array<"apply_patch" | "write_file" | "write_memo"> {
  if (mode === "deterministic_only") {
    return ["write_file", "write_memo"];
  }
  return ["apply_patch", "write_file", "write_memo"];
}
