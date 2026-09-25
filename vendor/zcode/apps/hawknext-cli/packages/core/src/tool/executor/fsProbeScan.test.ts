import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectFsProbeHits,
  mergePublishedWithFsProbe,
  fsProbeToPublishedSummaries,
} from "./fsProbeArtifacts.ts";

describe("collectFsProbeHits", () => {
  let root: string;
  before(() => {
    root = mkdtempSync(join(tmpdir(), "hawk-fsprobe-"));
    mkdirSync(join(root, "out"), { recursive: true });
    mkdirSync(join(root, "node_modules", "x"), { recursive: true });
    writeFileSync(join(root, "out", "汇总.xlsx"), "x");
    writeFileSync(join(root, "out", "errors.txt"), "e");
    writeFileSync(join(root, "stats.json"), "{}");
    writeFileSync(join(root, "node_modules", "x", "skip.xlsx"), "s");
    writeFileSync(join(root, "readme.md"), "# t");
    writeFileSync(join(root, "out", "huge.bin"), "nope");
  });
  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("collects deliverables and skips node_modules", () => {
    const hits = collectFsProbeHits(root, { max: 16 });
    const names = hits.map((h) => h.name).sort();
    assert.deepEqual(names, ["errors.txt", "readme.md", "stats.json", "汇总.xlsx"]);
  });

  it("maps scan into published summaries ready for notification", () => {
    const hits = collectFsProbeHits(root);
    const pub = mergePublishedWithFsProbe(undefined, hits);
    assert.ok(pub && pub.length >= 3);
    assert.ok(pub!.some((a) => a.kind === "file"));
  });
});
