import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sha256File,
  sha256String,
  buildHashLockfile,
  verifyHashLockfile,
  signatureSelfCheck,
} from "../../src/signature.ts";
import { buildInstallerPlan, formatInstallerPlan } from "../../src/installer.ts";

describe("signature self-check", () => {
  let root: string;

  before(() => {
    root = mkdtempSync(join(tmpdir(), "hawknext-rt-"));
    writeFileSync(join(root, "a.bin"), "hello");
    writeFileSync(join(root, "b.bin"), "world");
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("sha256File matches sha256String", () => {
    writeFileSync(join(root, "c.txt"), "abc");
    const h = sha256File(join(root, "c.txt"));
    assert.equal(h.sha256, sha256String("abc"));
    assert.equal(h.size, 3);
  });

  it("lockfile build + verify pass", () => {
    const lock = buildHashLockfile(root, ["a.bin", "b.bin"]);
    assert.equal(lock.length, 2);
    assert.equal(lock[0]!.path, "a.bin");
    const items = verifyHashLockfile(root, lock);
    assert.ok(items.every((i) => i.status === "pass"));
  });

  it("lockfile detects tamper", () => {
    const lock = buildHashLockfile(root, ["a.bin"]);
    writeFileSync(join(root, "a.bin"), "tampered");
    const items = verifyHashLockfile(root, lock);
    assert.equal(items[0]!.status, "fail");
    writeFileSync(join(root, "a.bin"), "hello"); // restore
  });

  it("lockfile detects missing", () => {
    const lock = [{ path: "nope.bin", sha256: "00", size: 0 }];
    const items = verifyHashLockfile(root, lock);
    assert.equal(items[0]!.status, "fail");
  });

  it("signatureSelfCheck fails win32 without signtool", () => {
    const report = signatureSelfCheck({
      bundleRoot: root,
      platform: "win32",
      signToolPath: null,
    });
    assert.equal(report.ok, false);
    assert.ok(report.items.some((i) => i.id === "signtool" && i.status === "fail"));
  });

  it("signatureSelfCheck passes with lockfile + sign tool", () => {
    const lock = buildHashLockfile(root, ["a.bin", "b.bin"]);
    writeFileSync(join(root, "signtool.exe"), "x");
    const report = signatureSelfCheck({
      bundleRoot: root,
      lockfile: lock,
      platform: "win32",
      signToolPath: join(root, "signtool.exe"),
      appEntry: join(root, "a.bin"),
    });
    assert.equal(report.ok, true);
    assert.ok(report.items.some((i) => i.id === "hash-lockfile" || i.id === "a.bin"));
  });

  it("dev build without lockfile is skip not fail on linux", () => {
    const report = signatureSelfCheck({ bundleRoot: root, platform: "linux" });
    assert.ok(report.items.some((i) => i.id === "hash-lockfile" && i.status === "skip"));
  });
});

describe("installer plan", () => {
  it("win32 plan includes NSIS + runtime tree + gates", () => {
    const plan = buildInstallerPlan("win32", "0.1.0", "x64");
    assert.equal(plan.os, "win32");
    assert.ok(plan.tree.runtime === "runtime");
    assert.ok(plan.artifacts.some((a) => a.id === "nsis" && a.includesRuntime));
    assert.ok(plan.gates.length >= 4);
    assert.ok(plan.sizeBudgetMb > 0);
    const text = formatInstallerPlan(plan);
    assert.match(text, /HawkNext-Setup-0\.1\.0-x64\.exe/);
    assert.match(text, /release gates/);
  });

  it("darwin / linux variants", () => {
    assert.equal(buildInstallerPlan("darwin").artifacts[0]!.id, "dmg");
    assert.equal(buildInstallerPlan("linux").artifacts[0]!.id, "AppImage");
  });
});
