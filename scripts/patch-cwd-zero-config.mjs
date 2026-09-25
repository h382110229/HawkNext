#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const impl =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/executor/impl.ts";
let s = readFileSync(impl, "utf8");
if (!s.includes("HAWK_CWD_ZERO_CONFIG")) {
  if (!s.includes("hawkWorkingDirectory")) {
    // add import after first import line group - find a relative import
    const anchor = s.indexOf("import ");
    const nl = s.indexOf("\n", s.lastIndexOf("import ", s.indexOf("\n\n") > 0 ? s.indexOf("\n\n") : s.length - 1));
    // simpler: prepend import after first line
    const firstNl = s.indexOf("\n");
    s =
      s.slice(0, firstNl + 1) +
      'import { setHawkWorkingDirectory } from "./hawkWorkingDirectory.js"; // HAWK_CWD_ZERO_CONFIG\n' +
      s.slice(firstNl + 1);
  }
  const old = `getWorkingDirectory: options.getWorkingDirectory ?? (() => options.workingDirectory ?? "."),`;
  const neu = `getWorkingDirectory: (() => {
        const resolveCwd = options.getWorkingDirectory ?? (() => options.workingDirectory ?? ".");
        // HAWK_CWD_ZERO_CONFIG: keep fs probe scan root in sync with session cwd
        const first = resolveCwd();
        if (first && first !== ".") setHawkWorkingDirectory(first);
        return () => {
          const cwd = resolveCwd();
          if (cwd && cwd !== ".") setHawkWorkingDirectory(cwd);
          return cwd;
        };
      })(),`;
  if (!s.includes(old)) {
    console.error("impl getWorkingDirectory missing");
    process.exit(1);
  }
  s = s.replace(old, neu);
  writeFileSync(impl, s, "utf8");
  console.log("impl.ts zero-config wired");
} else {
  console.log("impl already");
}

const bg =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/executor/background-tasks.ts";
let b = readFileSync(bg, "utf8");
if (!b.includes("HAWK_CWD_FROM_DEPS")) {
  // prefer deps cwd at terminal notification
  b = b.replace(
    `  const fsProbeFallback = scanWorkspaceFsProbeHits(
    (globalThis as { __hawkWorkingDirectory?: string }).__hawkWorkingDirectory,
  );`,
    `  const fsProbeFallback = scanWorkspaceFsProbeHits(
    (() => {
      try {
        return this?.deps?.getWorkingDirectory?.();
      } catch {
        return undefined;
      }
    })() ?? (globalThis as { __hawkWorkingDirectory?: string }).__hawkWorkingDirectory,
  ); // HAWK_CWD_FROM_DEPS`,
  );
  writeFileSync(bg, b, "utf8");
  console.log("background-tasks deps cwd");
} else {
  console.log("bg already");
}
