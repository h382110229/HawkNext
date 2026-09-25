#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/executor/background-tasks.ts";
let s = readFileSync(p, "utf8");

if (s.includes("HAWK_FS_PROBE_SCAN")) {
  console.log("already");
  process.exit(0);
}

// widen import
s = s.replace(
  'import { mergePublishedWithFsProbe } from "./fsProbeArtifacts.js"; // HAWK_FS_PROBE_ARTIFACTS',
  'import { mergePublishedWithFsProbe, collectFsProbeHits, type FsProbeHit } from "./fsProbeArtifacts.js"; // HAWK_FS_PROBE_ARTIFACTS',
);

// auto-scan when snapshot lacks fsProbeHits
const re = `function workflowSnapshotArtifacts(
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
}`;

const neu = `function workflowSnapshotArtifacts(
  snapshot: BackgroundTaskSnapshot | undefined,
  probeFallback?: readonly FsProbeHit[],
): ReturnType<typeof toPublishedArtifactSummaries> {
  if (snapshot === undefined) return undefined;
  // HAWK_FS_PROBE_ARTIFACTS: merge physical file probe hits with artifact.* publications.
  const published =
    "artifacts" in snapshot ? toPublishedArtifactSummaries(snapshot.artifacts) : undefined;
  const snapshotHits =
    "fsProbeHits" in snapshot && Array.isArray(snapshot.fsProbeHits)
      ? (snapshot.fsProbeHits as FsProbeHit[])
      : undefined;
  const probeHits =
    snapshotHits && snapshotHits.length > 0 ? snapshotHits : (probeFallback ?? []);
  if (probeHits.length > 0) {
    return mergePublishedWithFsProbe(published, probeHits) as ReturnType<
      typeof toPublishedArtifactSummaries
    >;
  }
  return published;
}

// HAWK_FS_PROBE_SCAN: deliverable files on disk (scripts/Office landings).
function scanWorkspaceFsProbeHits(root: string | undefined): FsProbeHit[] {
  if (!root) return [];
  try {
    return collectFsProbeHits(root, { max: 16, depth: 4 });
  } catch {
    return [];
  }
}`;

if (!s.includes(re)) {
  console.error("workflowSnapshotArtifacts block missing");
  process.exit(1);
}
s = s.replace(re, neu);

// inject scan at terminal notification call
const oldCall = `  const artifactsSection = buildWorkflowArtifactsManifestSection(workflowSnapshotArtifacts(snapshot));`;
const newCall = `  const fsProbeFallback = scanWorkspaceFsProbeHits(
    (globalThis as { __hawkWorkingDirectory?: string }).__hawkWorkingDirectory,
  );
  const artifactsSection = buildWorkflowArtifactsManifestSection(
    workflowSnapshotArtifacts(snapshot, fsProbeFallback),
  ); // HAWK_FS_PROBE_SCAN`;

if (!s.includes(oldCall)) {
  console.error("terminal artifacts call missing");
  process.exit(1);
}
s = s.replace(oldCall, newCall);

// also enhance notification section call if present
s = s.replace(
  `          workflowSnapshotArtifacts(snapshot),
          WORKFLOW_ARTIFACTS_NOTIFICATION_MAX_LINES,`,
  `          workflowSnapshotArtifacts(snapshot, scanWorkspaceFsProbeHits(
            (globalThis as { __hawkWorkingDirectory?: string }).__hawkWorkingDirectory,
          )),
          WORKFLOW_ARTIFACTS_NOTIFICATION_MAX_LINES, // HAWK_FS_PROBE_SCAN`,
);

writeFileSync(p, s, "utf8");
console.log("scan wired");
