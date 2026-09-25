/**
 * Map tool/file outputs → first-class UI artifacts (ChatArea + WorkspaceDrawer).
 * Call after physical probe verification; attach to the assistant turn payload.
 */
import {
  collectUiArtifacts,
  type UiArtifactItem,
} from "./artifactFirstClass.js";

export interface ProbeFileHit {
  absPath: string;
  size?: number;
  mtime?: string | Date;
  source?: UiArtifactItem["source"];
  verified?: boolean;
  relPath?: string;
}

/**
 * Build the structured `artifacts` field for an assistant message.
 * Prefer this over appending only a prose probe report.
 */
export function buildTurnArtifacts(hits: ProbeFileHit[]): {
  artifacts: UiArtifactItem[];
  summary: string;
} {
  const artifacts = collectUiArtifacts(hits);
  const verified = artifacts.filter((a) => a.verified).length;
  const summary =
    artifacts.length === 0
      ? "无物理制品"
      : `交付制品 ${artifacts.length} 个（已验收 ${verified}）`;
  return { artifacts, summary };
}
