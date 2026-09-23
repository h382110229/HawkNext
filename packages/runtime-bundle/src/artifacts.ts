/**
 * First-Class Artifacts — structured deliverables on AssistantMessage.
 * Aligns ChatArea / WorkspaceDrawer with scheduler + artifact-verifier output
 * (Claude Artifacts / Cursor style). All generators: write_file, Office, shell scripts.
 */

export type ArtifactKind =
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

export interface ArtifactItem {
  id: string;
  /** File name on disk (UTF-8 safe). */
  name: string;
  /** Absolute path (physical). */
  absPath: string;
  /** Workspace-relative path if known. */
  relPath?: string;
  kind: ArtifactKind;
  /** Bytes. */
  size: number;
  /** ISO timestamp of mtime. */
  mtime: string;
  /** How it was produced. */
  source: "write_file" | "apply_patch" | "office" | "shell" | "script" | "unknown";
  /** Physical probe verification. */
  verified: boolean;
  sha256?: string;
}

export interface ArtifactsPayload {
  /** Mounted on assistant message. */
  artifacts: ArtifactItem[];
  /** Optional human summary (probe report). */
  summary?: string;
}

const EXT_KIND: Record<string, ArtifactKind> = {
  xlsx: "xlsx",
  xls: "xlsx",
  docx: "docx",
  doc: "docx",
  pptx: "pptx",
  ppt: "pptx",
  pdf: "pdf",
  csv: "csv",
  txt: "txt",
  json: "json",
  html: "html",
  htm: "html",
  svg: "svg",
  js: "script",
  mjs: "script",
  cjs: "script",
  ts: "script",
  py: "script",
  ps1: "script",
  sh: "script",
  bat: "script",
};

export function kindFromName(name: string): ArtifactKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_KIND[ext] ?? "other";
}

export function artifactIconLabel(kind: ArtifactKind): string {
  switch (kind) {
    case "xlsx":
    case "csv":
      return "XLS";
    case "docx":
      return "DOC";
    case "pptx":
      return "PPT";
    case "pdf":
      return "PDF";
    case "txt":
      return "TXT";
    case "json":
      return "JSON";
    case "script":
      return "DEV";
    case "html":
    case "svg":
      return "WEB";
    default:
      return "FILE";
  }
}

export function buildArtifactItem(input: {
  absPath: string;
  name?: string;
  size: number;
  mtime: Date | string;
  source?: ArtifactItem["source"];
  verified?: boolean;
  sha256?: string;
  relPath?: string;
}): ArtifactItem {
  const name = input.name ?? input.absPath.split(/[\\/]/).pop() ?? input.absPath;
  const mtime =
    typeof input.mtime === "string" ? input.mtime : input.mtime.toISOString();
  return {
    id: `art_${hashPath(input.absPath)}`,
    name,
    absPath: input.absPath,
    relPath: input.relPath,
    kind: kindFromName(name),
    size: input.size,
    mtime,
    source: input.source ?? "unknown",
    verified: input.verified ?? true,
    sha256: input.sha256,
  };
}

function hashPath(p: string): string {
  let h = 0;
  for (let i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Collect from verifier results — merge unique by absPath. */
export function mergeArtifacts(...lists: ArtifactItem[][]): ArtifactItem[] {
  const map = new Map<string, ArtifactItem>();
  for (const list of lists) {
    for (const a of list) map.set(a.absPath, a);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}
