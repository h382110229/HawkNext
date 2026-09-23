import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  wrapPowerShellCommand,
  defaultSpawnArgs,
  powershellUtf8Preamble,
} from "../../src/win-encoding.ts";
import {
  buildArtifactItem,
  kindFromName,
  mergeArtifacts,
  artifactIconLabel,
} from "../../src/artifacts.ts";

describe("win encoding", () => {
  it("preamble forces UTF-8 console", () => {
    const p = powershellUtf8Preamble();
    assert.match(p, /OutputEncoding.*UTF8/);
    assert.match(p, /InputEncoding.*UTF8/);
    assert.match(p, /chcp 65001/);
  });

  it("wrapPowerShellCommand prefixes preamble", () => {
    const c = wrapPowerShellCommand("Write-Host 你好");
    assert.ok(c.indexOf("UTF8") < c.indexOf("Write-Host"));
  });

  it("defaultSpawnArgs uses powershell with preamble on win32", () => {
    const { shell, args } = defaultSpawnArgs("ls", true);
    assert.equal(shell, "powershell.exe");
    assert.ok(args.includes("-NoProfile"));
    assert.match(args[2] ?? "", /UTF8/);
  });
});

describe("artifacts first-class", () => {
  it("kind from name covers deliverables", () => {
    assert.equal(kindFromName("防火墙_汇总.xlsx"), "xlsx");
    assert.equal(kindFromName("说明.docx"), "docx");
    assert.equal(kindFromName("errors.txt"), "txt");
    assert.equal(kindFromName("stats.json"), "json");
    assert.equal(kindFromName("run.ps1"), "script");
    assert.equal(kindFromName("data.csv"), "csv");
  });

  it("buildArtifactItem exposes absPath/size/source for UI grid", () => {
    const a = buildArtifactItem({
      absPath: "D:\\out\\防火墙策略_汇总.xlsx",
      size: 1024,
      mtime: "2026-09-23T14:06:01Z",
      source: "script",
    });
    assert.equal(a.kind, "xlsx");
    assert.equal(a.source, "script");
    assert.equal(a.verified, true);
    assert.ok(a.absPath.endsWith("xlsx"));
    assert.equal(artifactIconLabel(a.kind), "XLS");
  });

  it("mergeArtifacts dedupes by absPath (script + write_file)", () => {
    const x = buildArtifactItem({ absPath: "/a/b.xlsx", size: 1, mtime: new Date(), source: "script" });
    const y = buildArtifactItem({ absPath: "/a/b.xlsx", size: 1, mtime: new Date(), source: "write_file" });
    const z = buildArtifactItem({ absPath: "/a/c.txt", size: 1, mtime: new Date(), source: "shell" });
    const merged = mergeArtifacts([x], [y, z]);
    assert.equal(merged.length, 2);
  });
});
