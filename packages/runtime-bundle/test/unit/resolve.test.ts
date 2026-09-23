import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MANIFEST, toolById, LAYOUT_VERSION } from "../../src/manifest.ts";
import { resolveRuntime, evaluateClosedLoop } from "../../src/resolve.ts";

const REQUIRED_IDS = [
  "node",
  "python",
  "libreoffice",
  "pandoc",
  "ffmpeg",
  "rg",
  "fd",
  "git",
  "playwright",
  "sevenzip",
  "signtool",
];

describe("runtime manifest", () => {
  it("covers max closed-loop tool list", () => {
    for (const id of REQUIRED_IDS) {
      assert.ok(toolById(DEFAULT_MANIFEST, id), id);
    }
    assert.equal(DEFAULT_MANIFEST.layoutVersion, LAYOUT_VERSION);
  });

  it("all listed tools are required for closed-loop", () => {
    for (const id of REQUIRED_IDS) {
      assert.equal(toolById(DEFAULT_MANIFEST, id)!.required, true, id);
    }
  });
});

describe("resolveRuntime", () => {
  it("prefers managed env over PATH", () => {
    const r = resolveRuntime(DEFAULT_MANIFEST, {
      env: { MIMO_NODE: "/fake/managed/node", PATH: "" },
      which: () => "/usr/bin/node",
      exists: (p) => p === "/fake/managed/node",
      allowPathFallback: true,
    });
    const node = r.find((x) => x.id === "node")!;
    assert.equal(node.source, "managed");
    assert.equal(node.path, "/fake/managed/node");
  });

  it("falls back to PATH when allowed", () => {
    const r = resolveRuntime(DEFAULT_MANIFEST, {
      env: { PATH: "/usr/bin" },
      which: (cmd) => (cmd === "git" ? "/usr/bin/git" : null),
      allowPathFallback: true,
      bundleRoot: "/no-bundle",
    });
    const git = r.find((x) => x.id === "git")!;
    assert.equal(git.source, "path");
    assert.equal(git.ok, true);
  });

  it("missing required tool fails closed-loop", () => {
    const r = resolveRuntime(DEFAULT_MANIFEST, {
      env: {},
      which: () => null,
      allowPathFallback: true,
    });
    const report = evaluateClosedLoop(r, true);
    assert.equal(report.ok, false);
    assert.ok(report.missingRequired.length > 0);
  });

  it("PATH-only is not fullyBundled (release gate)", () => {
    const r = resolveRuntime(DEFAULT_MANIFEST, {
      env: {},
      which: () => "/bin/tool",
      allowPathFallback: true,
      bundleRoot: "/no",
    });
    const report = evaluateClosedLoop(r, true);
    assert.equal(report.fullyBundled, false);
    assert.equal(report.ok, false, "release requires bundled/managed");
  });

  it("all managed → fullyBundled ok", () => {
    const synthetic = [
      { id: "a", source: "managed" as const, path: "/x", detail: "", required: true, ok: true },
      { id: "b", source: "bundled" as const, path: "/y", detail: "", required: true, ok: true },
    ];
    const report = evaluateClosedLoop(synthetic, true);
    assert.equal(report.ok, true);
    assert.equal(report.fullyBundled, true);
  });

  it("bundled path wins when file exists", () => {
    const r = resolveRuntime(DEFAULT_MANIFEST, {
      env: {},
      bundleRoot: "/app",
      which: () => "/usr/bin/tool",
      exists: (p) => p.replace(/\\/g, "/").includes("runtime/node"),
      allowPathFallback: true,
    });
    const node = r.find((x) => x.id === "node")!;
    assert.equal(node.source, "bundled");
    assert.equal(node.ok, true);
  });
});
