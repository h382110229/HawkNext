#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/executor/background-tasks.ts";
let s = readFileSync(p, "utf8");

if (s.includes("HAWK_FS_PROBE_ARTIFACTS")) {
  console.log("already");
  process.exit(0);
}

if (!s.includes("fsProbeArtifacts")) {
  const re = /(from "\.\/workflow-published-artifacts\.js";)/;
  if (!re.test(s)) {
    console.error("import anchor missing");
    process.exit(1);
  }
  s = s.replace(
    re,
    `$1\nimport { mergePublishedWithFsProbe } from "./fsProbeArtifacts.js"; // HAWK_FS_PROBE_ARTIFACTS`,
  );
}

const reFn = /function workflowSnapshotArtifacts\(\s*snapshot: BackgroundTaskSnapshot \| undefined,\s*\): ReturnType<typeof toPublishedArtifactSummaries> \{\s*if \(snapshot === undefined \|\| !\("artifacts" in snapshot\)\) return undefined;\s*return toPublishedArtifactSummaries\(snapshot\.artifacts\);\s*\}/;
if (!reFn.test(s)) {
  console.error("workflowSnapshotArtifacts regex missing");
  // dump nearby
  const i = s.indexOf("function workflowSnapshotArtifacts");
  console.log(JSON.stringify(s.slice(i, i + 280)));
  process.exit(1);
}
s = s.replace(
  reFn,
  `function workflowSnapshotArtifacts(
  snapshot: BackgroundTaskSnapshot | undefined,
): ReturnType<typeof toPublishedArtifactSummaries> {
  if (snapshot === undefined) return undefined;
  // HAWK_FS_PROBE_ARTIFACTS: merge physical file probe hits with artifact.* publications.
  const published =
    "artifacts" in snapshot ? toPublishedArtifactSummaries(snapshot.artifacts) : undefined;
  const probeHits =
    "fsProbeHits" in snapshot && Array.isArray(snapshot.fsProbeHits)
      ? (snapshot.fsProbeHits as Parameters<typeof mergePublishedWithFsProbe>[1])
      : undefined;
  if (probeHits && probeHits.length > 0) {
    return mergePublishedWithFsProbe(published, probeHits) as ReturnType<
      typeof toPublishedArtifactSummaries
    >;
  }
  return published;
}`,
);
writeFileSync(p, s, "utf8");
console.log("wired");
