/**
 * Hosts should call `setHawkWorkingDirectory(workspaceRoot)` at session start
 * so terminal notifications can auto-scan deliverables into fsProbeHits.
 */
let hawkWorkingDirectory: string | undefined;

export function setHawkWorkingDirectory(dir: string | undefined): void {
  hawkWorkingDirectory = dir;
  (globalThis as { __hawkWorkingDirectory?: string }).__hawkWorkingDirectory = dir;
}

export function getHawkWorkingDirectory(): string | undefined {
  return hawkWorkingDirectory ?? (globalThis as { __hawkWorkingDirectory?: string }).__hawkWorkingDirectory;
}
