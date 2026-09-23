import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePatch, ApplyPatchParseError } from "../../src/apply-patch/parse.ts";

describe("apply-patch parse", () => {
  it("parses add file", () => {
    const p = parsePatch("*** Begin Patch\n*** Add File: bar.md\n+This is a new file\n*** End Patch");
    assert.equal(p.hunks.length, 1);
    const h = p.hunks[0]!;
    assert.equal(h.type, "add");
    if (h.type === "add") {
      assert.equal(h.path, "bar.md");
      assert.equal(h.contents, "This is a new file\n");
    }
  });

  it("parses update with chunks and move", () => {
    const p = parsePatch(
      [
        "*** Begin Patch",
        "*** Add File: path/add.py",
        "+abc",
        "+def",
        "*** Delete File: path/delete.py",
        "*** Update File: path/update.py",
        "*** Move to: path/update2.py",
        "@@ def f():",
        "-    pass",
        "+    return 123",
        "*** End Patch",
      ].join("\n"),
    );
    assert.equal(p.hunks.length, 3);
    assert.equal(p.hunks[0]!.type, "add");
    assert.equal(p.hunks[1]!.type, "delete");
    const u = p.hunks[2]!;
    assert.equal(u.type, "update");
    if (u.type === "update") {
      assert.equal(u.movePath, "path/update2.py");
      assert.equal(u.chunks[0]!.changeContext, "def f():");
      assert.deepEqual(u.chunks[0]!.oldLines, ["    pass"]);
      assert.deepEqual(u.chunks[0]!.newLines, ["    return 123"]);
    }
  });

  it("accepts whitespace-padded markers (mimo/gpt-4.1 shape)", () => {
    const p = parsePatch(" *** Begin Patch \n  *** Add File: foo.txt\n+hi\n *** End Patch ");
    assert.equal(p.hunks[0]!.type, "add");
  });

  it("unwraps heredoc (gpt-4.1 local_shell shape)", () => {
    const body = "*** Begin Patch\n*** Add File: f.txt\n+x\n*** End Patch";
    const p = parsePatch(`<<'EOF'\n${body}\nEOF\n`);
    assert.equal(p.hunks.length, 1);
  });

  it("rejects empty update hunk", () => {
    assert.throws(
      () => parsePatch("*** Begin Patch\n*** Update File: foo.txt\n*** End Patch"),
      (e: unknown) => e instanceof ApplyPatchParseError,
    );
  });

  it("rejects invalid hunk header", () => {
    assert.throws(
      () => parsePatch("*** Begin Patch\n*** Frobnicate File: foo\n*** End Patch"),
      (e: unknown) =>
        e instanceof ApplyPatchParseError &&
        e.detail.kind === "invalid_hunk",
    );
  });

  it("rejects missing Begin", () => {
    assert.throws(() => parsePatch("nope"), ApplyPatchParseError);
  });

  it("parses End of File marker", () => {
    const p = parsePatch(
      "*** Begin Patch\n*** Update File: file.txt\n@@\n+quux\n*** End of File\n*** End Patch",
    );
    const u = p.hunks[0]!;
    if (u.type === "update") {
      assert.equal(u.chunks[0]!.isEndOfFile, true);
    }
  });
});
