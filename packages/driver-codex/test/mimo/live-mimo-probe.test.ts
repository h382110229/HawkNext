/**
 * Live mimo apply-patch probes — gated on HAWKNEXT_LLMAPI_LIVE=1 + key.
 * Asks Auto/mimo to emit apply_patch for a trivial create; scores shape success.
 * Failure rate feeds evaluatePatchPolicy (Office → write_file only).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCodexDriver } from "../../src/driver.ts";
import { extractPatch } from "../../src/apply-patch/extract.ts";
import { evaluatePatchPolicy } from "../../src/apply-patch/policy.ts";
import type { PatchRegressionSummary } from "../../src/apply-patch/policy.ts";

const LIVE = process.env.HAWKNEXT_LLMAPI_LIVE === "1";
const KEY = process.env.HAWKNEXT_LLMAPI_API_KEY || process.env.LLMAPI_API_KEY || "";
const maybe = LIVE && KEY ? describe : describe.skip;

maybe("live mimo apply-patch shape probes", () => {
  it("Auto emits parseable apply_patch for create-file", async () => {
    const driver = createCodexDriver({ apiKey: () => KEY });
    const outcomes = await driver.officeTurn(
      'Create hello.js with console.log("HAWK") using apply_patch.',
      {},
    );
    const patchOut = outcomes.find((o) => o.kind === "apply_patch");
    assert.ok(patchOut, "expected apply_patch tool call from Auto/mimo");
    assert.equal(patchOut.ok, true, patchOut.detail);
    const hello = patchOut.files["hello.js"] ?? "";
    assert.match(hello, /console\.log\(["']HAWK["']\)/, `hello.js content: ${JSON.stringify(hello)}`);
  });

  it("summary feeds policy", async () => {
    const driver = createCodexDriver({ apiKey: () => KEY });
    const results: PatchRegressionSummary = { total: 0, passed: 0, failed: 0, failures: [] };
    for (const prompt of [
      "Use apply_patch to add a.txt containing HAWK.",
      "Use apply_patch to create b.txt with one line: hi.",
      "Use apply_patch to add c/d.txt content=x.",
    ]) {
      results.total++;
      try {
        const outs = await driver.officeTurn(prompt, {});
        const ok = outs.some((o) => o.ok && o.kind === "apply_patch");
        if (ok) results.passed++;
        else {
          results.failed++;
          results.failures.push({ name: prompt, reason: outs.map((o) => o.detail).join("; ") });
        }
      } catch (e) {
        results.failed++;
        results.failures.push({ name: prompt, reason: e instanceof Error ? e.message : String(e) });
      }
    }
    const policy = evaluatePatchPolicy(
      { total: 24, passed: 24, failed: 0, failures: [] },
      results,
      0.15,
    );
    // document outcome; hard-assert only that we classified
    assert.ok(policy.mode === "apply_patch" || policy.mode === "deterministic_only");
    if (results.failed / results.total > 0.15) {
      assert.equal(policy.mode, "deterministic_only");
    }
  });

  it("extract works on raw tool arguments when model wraps", () => {
    const sample = "```patch\n*** Begin Patch\n*** Add File: z.txt\n+1\n*** End Patch\n```";
    const ex = extractPatch(sample);
    assert.equal(ex.ok, true);
  });
});
