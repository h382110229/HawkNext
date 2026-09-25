#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/exec/execution-command.ts";
let s = readFileSync(p, "utf8");
if (s.includes("HAWK_UTF8_CMD")) {
  console.log("already");
  process.exit(0);
}

const re =
  /if \(provider\.dialect === "cmd"\) \{\s*return \{\s*args: \[\],\s*cwdDialect: provider\.dialect,\s*envOverlay: provider\.envOverlay,\s*file: command,\s*shell: provider\.shell,\s*\};\s*\}/;
if (!re.test(s)) {
  console.error("pattern missing");
  process.exit(1);
}

const replacement = `if (provider.dialect === "cmd") {
    // HAWK_UTF8_CMD: force UTF-8 console codepage (fix GBK mojibake on Chinese Windows).
    return {
      args: [],
      cwdDialect: provider.dialect,
      envOverlay: provider.envOverlay,
      file: wrapWindowsShellCommandUtf8(command),
      shell: provider.shell,
    };
  }`;

s = s.replace(re, replacement);
s += `
/** HAWK_UTF8_CMD */
function wrapWindowsShellCommandUtf8(command: string): string {
  if (/powershell|pwsh/i.test(command)) {
    return (
      "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " +
      "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; " +
      command
    );
  }
  return "chcp 65001 >nul & " + command;
}
`;
writeFileSync(p, s, "utf8");
console.log("patched");
