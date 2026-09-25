import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fsProbeToPublishedSummaries,
  mergePublishedWithFsProbe,
  fsProbeArtifactId,
} from "./fsProbeArtifacts.ts";

describe("fsProbeArtifacts CLI", () => {
  it("maps hits to published summaries with kind/contentType", () => {
    const list = fsProbeToPublishedSummaries([
      { absPath: "D:\\out\\汇总.xlsx", size: 20 },
      { absPath: "D:\\out\\report.md", size: 5, primary: true },
      { absPath: "D:\\out\\stats.json", size: 8 },
    ]);
    assert.equal(list.length, 3);
    assert.equal(list[0]!.kind, "file");
    assert.equal(list[1]!.kind, "markdown");
    assert.equal(list[1]!.primary, true);
    assert.match(list[0]!.contentType ?? "", /spreadsheet/);
    assert.ok(fsProbeArtifactId("D:\\out\\汇总.xlsx").length <= 64);
  });

  it("merges with artifact.* publications without dup", () => {
    const pub = [{ id: "art1", kind: "markdown", version: 2, title: "phase" }];
    const probe = [
      { absPath: "D:\\a.xlsx", size: 1 },
      { absPath: "D:\\b.txt", size: 2 },
    ];
    // make probe id collide with art1? no — different ids
    const merged = mergePublishedWithFsProbe(pub, probe);
    assert.equal(merged!.length, 3);
    assert.equal(merged![0]!.id, "art1");
  });

  it("returns undefined when both empty", () => {
    assert.equal(mergePublishedWithFsProbe(undefined, []), undefined);
  });
});
