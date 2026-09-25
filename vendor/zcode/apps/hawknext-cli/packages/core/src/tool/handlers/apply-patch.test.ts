import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyPatchToolEntry } from "./apply-patch.ts";

function ctx(root: string) {
  return {
    workingDirectory: root,
    getWorkingDirectory: () => root,
  } as never;
}

describe("apply_patch tool", () => {
  let root: string;
  before(() => {
    root = mkdtempSync(join(tmpdir(), "hawk-apppatch-"));
    writeFileSync(join(root, "a.txt"), "line1\nline2\nline3\n");
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("adds and updates files", async () => {
    const patch = [
      "*** Begin Patch",
      "*** Add File: hello.js",
      '+console.log("HAWK");',
      "*** Update File: a.txt",
      "@@",
      "-line2",
      "+LINE2",
      "*** End Patch",
    ].join("\n");
    const out = (await applyPatchToolEntry.handler({ patch }, ctx(root))) as {
      type: string;
      paths: string[];
      summary: string;
    };
    assert.equal(out.type, "applied");
    assert.ok(out.paths.includes("hello.js"));
    assert.equal(readFileSync(join(root, "hello.js"), "utf8"), 'console.log("HAWK");\n');
    assert.equal(readFileSync(join(root, "a.txt"), "utf8"), "line1\nLINE2\nline3\n");
  });

  it("parse failure is recoverable with Write/Edit fallback hint", async () => {
    const res = (await applyPatchToolEntry.handler({ patch: "nope" }, ctx(root))) as {
      result: false;
      message: string;
    };
    assert.equal(res.result, false);
    assert.match(res.message, /Write\/Edit/);
  });

  it("apply failure is recoverable (missing update target)", async () => {
    const patch = [
      "*** Begin Patch",
      "*** Update File: missing.txt",
      "@@",
      "-x",
      "+y",
      "*** End Patch",
    ].join("\n");
    const res = (await applyPatchToolEntry.handler({ patch }, ctx(root))) as {
      result: false;
      message: string;
    };
    assert.equal(res.result, false);
    assert.match(res.message, /recoverable/);
    assert.ok(!existsSync(join(root, "missing.txt")));
  });
});
