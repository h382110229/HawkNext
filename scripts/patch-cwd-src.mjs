#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const bg =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/executor/background-tasks.ts";
let b = readFileSync(bg, "utf8");

// import getHawkWorkingDirectory
if (!b.includes("getHawkWorkingDirectory")) {
  b = b.replace(
    'import { mergePublishedWithFsProbe, collectFsProbeHits, type FsProbeHit } from "./fsProbeArtifacts.js";',
    'import { mergePublishedWithFsProbe, collectFsProbeHits, type FsProbeHit } from "./fsProbeArtifacts.js";\nimport { getHawkWorkingDirectory } from "./hawkWorkingDirectory.js";',
  );
}

const re = /const fsProbeFallback = scanWorkspaceFsProbeHits\(\s*\(\(\) => \{\s*try \{\s*return this\?\.deps\?\.getWorkingDirectory\?\.\(\);\s*\} catch \{\s*return undefined;\s*\}\s*\}\)\(\) \?\? \(globalThis as \{ __hawkWorkingDirectory\?: string \}\)\.__hawkWorkingDirectory,\s*\); \/\/ HAWK_CWD_FROM_DEPS/;

const neu = `const fsProbeFallback = scanWorkspaceFsProbeHits(
    getHawkWorkingDirectory(),
  ); // HAWK_CWD_FROM_DEPS`;

if (!re.test(b)) {
  console.error("fallback block missing");
  process.exit(1);
}
b = b.replace(re, neu);
writeFileSync(bg, b, "utf8");
console.log("fixed to getHawkWorkingDirectory");
