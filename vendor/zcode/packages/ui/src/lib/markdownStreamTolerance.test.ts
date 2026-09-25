import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tolerantMarkdown } from "./markdownStreamTolerance.ts";
import {
  collectUiArtifacts,
  uiKindFromName,
  artifactIconTint,
} from "./artifactFirstClass.ts";

describe("markdownStreamTolerance", () => {
  it("closes unclosed code fence while streaming", () => {
    const src = "hello\n```js\nconst x = 1;";
    const out = tolerantMarkdown(src, { streaming: true });
    assert.equal((out.match(/```/g) || []).length % 2, 0);
    assert.ok(out.endsWith("```"));
  });

  it("closes unclosed strong while streaming", () => {
    const out = tolerantMarkdown("use **bold now", { streaming: true });
    assert.equal((out.match(/\*\*/g) || []).length % 2, 0);
  });

  it("passes completed messages unchanged", () => {
    const src = "```js\nconst x = 1;\n```";
    assert.equal(tolerantMarkdown(src, { streaming: false }), src);
  });

  it("closes unclosed inline code", () => {
    const out = tolerantMarkdown("run `ls -la", { streaming: true });
    assert.equal((out.match(/(?<!`)`(?!`)/g) || []).length % 2, 0);
  });
});

describe("artifactFirstClass", () => {
  it("collects multi-format script outputs", () => {
    const list = collectUiArtifacts([
      { absPath: "D:\\out\\a.xlsx", size: 10, source: "script" },
      { absPath: "D:\\out\\b.txt", size: 2, source: "shell" },
      { absPath: "D:\\out\\a.xlsx", size: 10, source: "script" }, // dedupe
      { absPath: "D:\\out\\c.json", size: 5, source: "script" },
      { absPath: "D:\\out\\s.ps1", size: 3, source: "script" },
    ]);
    assert.equal(list.length, 4);
    assert.equal(uiKindFromName("a.xlsx"), "xlsx");
    assert.equal(uiKindFromName("s.ps1"), "script");
    assert.equal(artifactIconTint("xlsx"), "#39C7B0");
    assert.equal(artifactIconTint("pdf"), "#BE1D5D");
  });
});
