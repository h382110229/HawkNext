/**
 * First-class artifacts bridge — map verifier / filesystem hits to UI artifact cards.
 * Completes the gap: backend probe result → structured field on the turn, not only prose.
 */

export type UiArtifactKind =
  | "xlsx"
  | "docx"
  | "pptx"
  | "pdf"
  | "csv"
  | "txt"
  | "json"
  | "html"
  | "svg"
  | "script"
  | "other";

export interface UiArtifactItem {
  id: string;
  name: string;
  absPath: string;
  relPath?: string;
  kind: UiArtifactKind;
  size: number;
  mtime: string;
  source: "write_file" | "apply_patch" | "office" | "shell" | "script" | "unknown";
  verified: boolean;
}

const EXT: Record<string, UiArtifactKind> = {
  xlsx: "xlsx",
  xls: "xlsx",
  csv: "csv",
  docx: "docx",
  doc: "docx",
  pptx: "pptx",
  pdf: "pdf",
  txt: "txt",
  json: "json",
  html: "html",
  htm: "html",
  svg: "svg",
  js: "script",
  ts: "script",
  mjs: "script",
  py: "script",
  ps1: "script",
  sh: "script",
};

export function uiKindFromName(name: string): UiArtifactKind {
  return EXT[name.split(".").pop()?.toLowerCase() ?? ""] ?? "other";
}

export function artifactIconTint(kind: UiArtifactKind): string {
  switch (kind) {
    case "xlsx":
    case "csv":
      return "#39C7B0";
    case "docx":
      return "#6BA3FF";
    case "pptx":
      return "#F4A259";
    case "pdf":
      return "#BE1D5D";
    default:
      return "#8A9494";
  }
}

/** Broaden ChatArea scan: any verified physical file, not only write_file + allowlist suffix. */
export function collectUiArtifacts(
  entries: Array<{
    absPath: string;
    size?: number;
    mtime?: string | Date;
    source?: UiArtifactItem["source"];
    verified?: boolean;
    relPath?: string;
  }>,
): UiArtifactItem[] {
  const seen = new Set<string>();
  const out: UiArtifactItem[] = [];
  for (const e of entries) {
    if (!e.absPath || seen.has(e.absPath)) continue;
    seen.add(e.absPath);
    const name = e.absPath.split(/[\\/]/).pop() ?? e.absPath;
    out.push({
      id: `art_${e.absPath.length}_${name}`,
      name,
      absPath: e.absPath,
      relPath: e.relPath,
      kind: uiKindFromName(name),
      size: e.size ?? 0,
      mtime:
        e.mtime instanceof Date
          ? e.mtime.toISOString()
          : (e.mtime ?? new Date().toISOString()),
      source: e.source ?? "unknown",
      verified: e.verified ?? true,
    });
  }
  return out;
}
