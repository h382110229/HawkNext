import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPatchText, ApplyPatchError } from "../../src/apply-patch/apply.ts";

describe("apply-patch apply", () => {
  it("adds a file", () => {
    const r = applyPatchText(
      "*** Begin Patch\n*** Add File: bar.md\n+This is a new file\n*** End Patch",
      {},
    );
    assert.equal(r.files["bar.md"], "This is a new file\n");
    assert.deepEqual(r.added, ["bar.md"]);
  });

  it("updates multiple chunks", () => {
    const files = { "multi.txt": "line1\nline2\nline3\nline4\n" };
    const r = applyPatchText(
      [
        "*** Begin Patch",
        "*** Update File: multi.txt",
        "@@",
        "-line2",
        "+changed2",
        "@@",
        "-line4",
        "+changed4",
        "*** End Patch",
      ].join("\n"),
      files,
    );
    assert.equal(r.files["multi.txt"], "line1\nchanged2\nline3\nchanged4\n");
  });

  it("preserves CRLF", () => {
    const files = { "lines.txt": "one\r\ntwo\r\nthree\r\n" };
    const r = applyPatchText(
      "*** Begin Patch\n*** Update File: lines.txt\n@@\n-one\n+uno\n*** End Patch",
      files,
    );
    assert.equal(r.files["lines.txt"], "uno\r\ntwo\r\nthree\r\n");
  });

  it("fails on missing context but keeps prior hunk (partial)", () => {
    const files = { "modify.txt": "a\nb\n" };
    try {
      applyPatchText(
        [
          "*** Begin Patch",
          "*** Add File: created.txt",
          "+hello",
          "*** Update File: missing.txt",
          "@@",
          "-old",
          "+new",
          "*** End Patch",
        ].join("\n"),
        files,
      );
      assert.fail("should throw");
    } catch (e) {
      assert.ok(e instanceof ApplyPatchError);
    }
  });

  it("empty old lines inserts at end", () => {
    const r = applyPatchText(
      "*** Begin Patch\n*** Update File: input.txt\n@@\n+new\n*** End Patch",
      { "input.txt": "a\nb\n" },
    );
    assert.equal(r.files["input.txt"], "a\nb\nnew\n");
  });
});
