/**
 * Map physical file probe hits → workflow completion artifacts (file kind).
 * Complements script `artifact.*` publications: shell/Office landings also get chips.
 */
import type { WorkflowRunArtifactSummary } from "@hawknext/shared/hawknext-protocol-v4";

export interface FsProbeHit {
  absPath: string;
  relPath?: string;
  size?: number;
  name?: string;
  contentType?: string;
}

function kindFromName(name: string): "file" | "markdown" {
  return /\.(md|markdown)$/i.test(name) ? "markdown" : "file";
}

function titleFromName(name: string): string {
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

/**
 * Build WorkflowRunArtifactSummary entries for probe-verified files.
 * `id` is stable per absPath so merge dedupes against journal/live views.
 */
export function fsProbeToArtifactSummaries(
  hits: readonly FsProbeHit[],
  opts?: { primary?: boolean; max?: number },
): WorkflowRunArtifactSummary[] {
  const max = opts?.max ?? 8;
  const seen = new Set<string>();
  const out: WorkflowRunArtifactSummary[] = [];
  for (const hit of hits) {
    if (!hit.absPath || out.length >= max) continue;
    const name = hit.name ?? hit.absPath.split(/[\\/]/).pop() ?? hit.absPath;
    const id = `fs_${Buffer.from(hit.absPath).toString("base64url").slice(0, 24)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      kind: kindFromName(name),
      title: titleFromName(name),
      version: 1,
      ...(hit.contentType === undefined ? {} : { contentType: hit.contentType }),
      ...(hit.size === undefined ? {} : { bytes: hit.size }),
      ...(opts?.primary ? ({ primary: true } as const) : {}),
    } as WorkflowRunArtifactSummary);
  }
  return out;
}

/**
 * Merge probe chips into an existing completion artifact list (by id).
 * Probe hits fill gaps only — journal/live versions win when both exist.
 */
export function mergeFsProbeIntoCompletionArtifacts<
  T extends { id: string },
>(base: readonly T[], probe: readonly WorkflowRunArtifactSummary[]): Array<T | WorkflowRunArtifactSummary> {
  const have = new Set(base.map((a) => a.id));
  const extra = probe.filter((a) => !have.has(a.id));
  return [...base, ...extra];
}
