#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const runPath =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/exec/node-execution-adapter-run.ts";
let s = readFileSync(runPath, "utf8");

if (!s.includes("HAWK_HEARTBEAT_TIMEOUT")) {
  const re = /if \(timeoutMs > 0\) \{\s*timeoutTimer = setTimeout\(\(\) => requestStop\("timeout"\), timeoutMs\);\s*\}/;
  if (!re.test(s)) {
    console.error("timeout regex missing");
    process.exit(1);
  }
  s = s.replace(
    re,
    `// HAWK_HEARTBEAT_TIMEOUT: idle timeout — any output resets the clock
      const armTimeout = () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (timeoutMs > 0) {
          timeoutTimer = setTimeout(() => requestStop("timeout"), timeoutMs);
        }
      };
      armTimeout();
      const onOutputActivity = () => armTimeout();`,
  );
  s = s.replace(
    "this.attachPipedOutput(spawnedChild, stdout, stderr, legacyOutputEncoding, options);",
    "this.attachPipedOutput(spawnedChild, stdout, stderr, legacyOutputEncoding, options, onOutputActivity);",
  );
  writeFileSync(runPath, s, "utf8");
  console.log("run.ts heartbeat patched");
} else {
  console.log("run.ts already");
}

const procPath =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/exec/node-execution-adapter-process.ts";
let p = readFileSync(procPath, "utf8");
if (!p.includes("onActivity?")) {
  const reSig =
    /protected attachPipedOutput\(\s*child: ChildProcess,\s*stdout: OutputCollector,\s*stderr: OutputCollector,\s*encoding: string \| null,\s*options: ExecutionRunOptions,\s*\): void \{/;
  if (!reSig.test(p)) {
    console.error("attach sig missing");
    process.exit(1);
  }
  p = p.replace(
    reSig,
    `protected attachPipedOutput(
    child: ChildProcess,
    stdout: OutputCollector,
    stderr: OutputCollector,
    encoding: string | null,
    options: ExecutionRunOptions,
    onActivity?: () => void,
  ): void {`,
  );
  p = p.replace(
    "collector.append(buffer, stream);",
    "collector.append(buffer, stream);\n        onActivity?.();",
  );
  writeFileSync(procPath, p, "utf8");
  console.log("process.ts onActivity wired");
} else {
  console.log("process.ts already");
}
