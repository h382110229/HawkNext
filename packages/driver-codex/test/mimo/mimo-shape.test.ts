/**
 * mimo × apply-patch shape regression.
 * Offline shapes that mimo/Auto actually emit (or have been seen to emit)
 * must extract + apply. Unrecoverable shapes must fail closed to write_file.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractPatch, isLikelyApplyPatchPayload } from "../../src/apply-patch/extract.ts";
import { applyPatchText } from "../../src/apply-patch/apply.ts";
import { evaluatePatchPolicy, toolsForPolicy } from "../../src/apply-patch/policy.ts";
import { createCodexDriver } from "../../src/driver.ts";

const CLEAN = `*** Begin Patch
*** Add File: hello.js
+console.log("HAWK");
*** End Patch`;

const FENCED = ["I'll create the file.", "", "```diff", CLEAN, "```", "Done."].join("\n");

const JSON_WRAP = JSON.stringify({ patch: CLEAN });

const HEREDOC = `<<'EOF'\n${CLEAN}\nEOF\n`;

const PROSE = `Sure. Here is the patch:\n\n${CLEAN}\n\nLet me know if you need more.`;

const TYPO_STAR = CLEAN.split("\n")
  .map((l) => l.replace(/^\*\*\*/, "*"))
  .join("\n");

describe("mimo shape extraction", () => {
  it("raw", () => {
    const r = extractPatch(CLEAN);
    assert.equal(r.ok, true);
    assert.equal(r.via, "raw");
  });

  it("markdown fence", () => {
    const r = extractPatch(FENCED);
    assert.equal(r.ok, true);
    assert.ok(r.via === "fence" || r.via === "slice-markers");
  });

  it("json patch field", () => {
    const r = extractPatch(JSON_WRAP);
    assert.equal(r.ok, true);
  });

  it("heredoc", () => {
    const r = extractPatch(HEREDOC);
    assert.equal(r.ok, true);
  });

  it("prose + markers", () => {
    const r = extractPatch(PROSE);
    assert.equal(r.ok, true);
  });

  it("single-star typo repaired", () => {
    const r = extractPatch(TYPO_STAR);
    assert.equal(r.ok, true);
    assert.equal(r.via, "repaired-markers");
  });

  it("unrecoverable fails closed", () => {
    const r = extractPatch("just write the file somehow");
    assert.equal(r.ok, false);
    assert.equal(r.via, "none");
  });

  it("isLikelyApplyPatchPayload", () => {
    assert.equal(isLikelyApplyPatchPayload(CLEAN), true);
    assert.equal(isLikelyApplyPatchPayload("hello"), false);
  });
});

describe("mimo regression: shapes apply to workspace", () => {
  const cases: Array<[string, string]> = [
    ["raw", CLEAN],
    ["fence", FENCED],
    ["json", JSON_WRAP],
    ["heredoc", HEREDOC],
    ["prose", PROSE],
    ["typo-star", TYPO_STAR],
  ];

  for (const [name, payload] of cases) {
    it(name, () => {
      const ex = extractPatch(payload);
      assert.equal(ex.ok, true, `${name}: ${ex.error}`);
      const r = applyPatchText(ex.patch!, {}, "preserve");
      assert.equal(r.files["hello.js"], 'console.log("HAWK");\n');
    });
  }
});

describe("policy: fail closed to deterministic tools", () => {
  it("fixture failure disables patch", () => {
    const p = evaluatePatchPolicy(
      { total: 3, passed: 2, failed: 1, failures: [{ name: "x", reason: "y" }] },
    );
    assert.equal(p.mode, "deterministic_only");
    assert.deepEqual(toolsForPolicy(p.mode), ["write_file", "write_memo"]);
  });

  it("high live failure rate disables patch", () => {
    const p = evaluatePatchPolicy(
      { total: 24, passed: 24, failed: 0, failures: [] },
      { total: 10, passed: 7, failed: 3, failures: [] },
      0.15,
    );
    assert.equal(p.mode, "deterministic_only");
  });

  it("ok path keeps apply_patch + write_file", () => {
    const p = evaluatePatchPolicy({ total: 24, passed: 24, failed: 0, failures: [] });
    assert.equal(p.mode, "apply_patch");
    assert.ok(toolsForPolicy(p.mode).includes("apply_patch"));
    assert.ok(toolsForPolicy(p.mode).includes("write_file"));
  });
});

describe("driver tool execution (mock)", () => {
  it("apply_patch tool call extracts from mimo JSON args", () => {
    const driver = createCodexDriver({
      apiKey: () => "as-test",
      patchPolicy: evaluatePatchPolicy({ total: 1, passed: 1, failed: 0, failures: [] }),
    });
    const out = driver.executeToolCall(
      {
        id: "c1",
        name: "apply_patch",
        arguments: JSON.stringify({ patch: FENCED }),
      },
      {},
    );
    assert.equal(out.ok, true);
    assert.equal(out.files["hello.js"], 'console.log("HAWK");\n');
  });

  it("write_file fallback works when patch disabled", () => {
    const driver = createCodexDriver({
      apiKey: () => "as-test",
      patchPolicy: evaluatePatchPolicy(
        { total: 1, passed: 0, failed: 1, failures: [{ name: "x", reason: "y" }] },
      ),
    });
    const denied = driver.executeToolCall(
      { id: "c1", name: "apply_patch", arguments: CLEAN },
      {},
    );
    assert.equal(denied.ok, false);
    const wf = driver.executeToolCall(
      {
        id: "c2",
        name: "write_file",
        arguments: JSON.stringify({ path: "hello.js", content: 'console.log("HAWK");\n' }),
      },
      {},
    );
    assert.equal(wf.ok, true);
  });

  it("bad patch suggests disabling apply_patch", () => {
    const driver = createCodexDriver({
      apiKey: () => "as-test",
      patchPolicy: evaluatePatchPolicy({ total: 1, passed: 1, failed: 0, failures: [] }),
    });
    const out = driver.executeToolCall(
      { id: "c1", name: "apply_patch", arguments: "*** Begin Patch\n*** End Patch" },
      {},
    );
    // empty update-less parse may succeed with 0 hunks or fail — either way policy can flip
    // Use clearly bad payload:
    const bad = driver.executeToolCall(
      { id: "c2", name: "apply_patch", arguments: "not a patch" },
      {},
    );
    assert.equal(bad.ok, false);
    assert.equal(bad.suggestDisablePatch, true);
    assert.equal(driver.getPolicy().mode, "deterministic_only");
  });
});
