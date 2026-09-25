import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  powershellUtf8Preamble,
  wrapPowerShellCommand,
  windowsPowerShellArgs,
} from "./winConsoleUtf8.ts";

describe("winConsoleUtf8", () => {
  it("preamble forces UTF-8 codepage", () => {
    const p = powershellUtf8Preamble();
    assert.match(p, /OutputEncoding.*UTF8/);
    assert.match(p, /chcp 65001/);
  });

  it("wrap prefixes preamble before user command", () => {
    const c = wrapPowerShellCommand("Get-ChildItem");
    assert.ok(c.indexOf("UTF8") < c.indexOf("Get-ChildItem"));
  });

  it("windowsPowerShellArgs uses -NoProfile -Command with preamble", () => {
    const { shell, args } = windowsPowerShellArgs("dir");
    assert.equal(shell, "powershell.exe");
    assert.ok(args.includes("-NoProfile"));
    assert.match(args.at(-1) ?? "", /UTF8/);
  });
});
