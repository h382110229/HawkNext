/**
 * UI: merge FS probe chips into completion card artifacts.
 * Call after `mergeCompletionArtifacts` if the host has probe hits for the turn.
 */
import type { WorkflowRunArtifactView } from "@/hooks/useWorkflowRunArtifacts.js";

export interface UiFsProbeHit {
  absPath: string;
  size?: number;
  name?: string;
  contentType?: string;
}

type CompletionArtifactLike = {
  id: string;
  kind: string;
  version: number;
  title?: string;
  contentType?: string;
  bytes?: number;
  primary?: true;
};

function probeId(absPath: string): string {
  let h = 2166136261;
  for (let i = 0; i < absPath.length; i++) {
    h ^= absPath.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fs${(h >>> 0).toString(36)}`.slice(0, 64);
}

function kindFromName(name: string): "file" | "markdown" {
  return /\.(md|markdown)$/i.test(name) ? "markdown" : "file";
}

/** Convert probe hits to completion-card artifact rows (file chips). */
export function uiFsProbeToCompletionArtifacts(
  hits: readonly UiFsProbeHit[],
  max = 8,
): CompletionArtifactLike[] {
  const out: CompletionArtifactLike[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (!hit.absPath || out.length >= max) continue;
    const name = hit.name ?? hit.absPath.split(/[\\/]/).pop() ?? hit.absPath;
    const id = probeId(hit.absPath);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      kind: kindFromName(name),
      version: 1,
      title: name,
      ...(hit.contentType === undefined ? {} : { contentType: hit.contentType }),
      ...(hit.size === undefined ? {} : { bytes: hit.size }),
    });
  }
  return out;
}

/** Append probe chips that are not already in the completion list. */
export function withFsProbeCompletionArtifacts<T extends { id: string }>(
  base: readonly T[],
  hits: readonly UiFsProbeHit[],
): Array<T | CompletionArtifactLike> {
  const have = new Set(base.map((a) => a.id));
  const extra = uiFsProbeToCompletionArtifacts(hits).filter((a) => !have.has(a.id));
  return [...base, ...extra];
}
