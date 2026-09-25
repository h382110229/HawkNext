/**
 * FS probe hits → published artifact summaries for workflow terminal notification.
 * Fills the gap: shell/script landings are physical files but not `artifact.*` publications.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

export interface FsProbeHit {
  absPath: string;
  relPath?: string;
  size?: number;
  name?: string;
  contentType?: string;
  /** Mark as run primary deliverable. */
  primary?: true;
}

export interface PublishedArtifactSummaryLike {
  id: string;
  kind: string;
  version: number;
  title?: string;
  contentType?: string;
  bytes?: number;
  itemCount?: number;
  primary?: true;
  description?: string;
}

function kindFromName(name: string): string {
  if (/\.(md|markdown)$/i.test(name)) return "markdown";
  return "file";
}

function contentTypeFromName(name: string): string | undefined {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    pdf: "application/pdf",
    csv: "text/csv",
    txt: "text/plain",
    json: "application/json",
    html: "text/html",
    svg: "image/svg+xml",
    md: "text/markdown",
    ps1: "text/plain",
    sh: "text/plain",
    js: "text/javascript",
    ts: "text/plain",
    py: "text/x-python",
  };
  return map[ext ?? ""];
}

/** Stable id from absPath (≤64 chars for manifest zod). */
export function fsProbeArtifactId(absPath: string): string {
  let h = 2166136261;
  for (let i = 0; i < absPath.length; i++) {
    h ^= absPath.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fs${(h >>> 0).toString(36)}`.slice(0, 64);
}

export function fsProbeToPublishedSummaries(
  hits: readonly FsProbeHit[],
  opts?: { max?: number },
): PublishedArtifactSummaryLike[] {
  const max = opts?.max ?? 8;
  const out: PublishedArtifactSummaryLike[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (!hit.absPath || out.length >= max) continue;
    const name = hit.name ?? hit.absPath.split(/[\\/]/).pop() ?? hit.absPath;
    const id = fsProbeArtifactId(hit.absPath);
    if (seen.has(id)) continue;
    seen.add(id);
    const ct = hit.contentType ?? contentTypeFromName(name);
    out.push({
      id,
      kind: kindFromName(name),
      version: 1,
      title: name.length > 120 ? name.slice(0, 117) + "…" : name,
      ...(ct === undefined ? {} : { contentType: ct }),
      ...(hit.size === undefined ? {} : { bytes: hit.size }),
      ...(hit.primary === true
        ? ({ primary: true, description: `on disk: ${hit.relPath ?? hit.absPath}` } as const)
        : {}),
    });
  }
  return out;
}

/**
 * Merge probe summaries into snapshot-published list (by id).
 * Existing `artifact.*` entries win; probe fills gaps only.
 */
export function mergePublishedWithFsProbe(
  published: readonly PublishedArtifactSummaryLike[] | undefined,
  probe: readonly FsProbeHit[] | undefined,
  opts?: { max?: number },
): PublishedArtifactSummaryLike[] | undefined {
  const base = published ? [...published] : [];
  const have = new Set(base.map((a) => a.id));
  const extra = fsProbeToPublishedSummaries(probe ?? [], opts).filter((a) => !have.has(a.id));
  const merged = [...base, ...extra];
  return merged.length === 0 ? undefined : merged;
}

const DELIVERABLE_EXT = new Set([
  "xlsx",
  "xls",
  "docx",
  "doc",
  "pptx",
  "ppt",
  "pdf",
  "csv",
  "txt",
  "json",
  "html",
  "htm",
  "svg",
  "md",
  "markdown",
  "ps1",
  "sh",
  "py",
  "js",
  "ts",
  "yml",
  "yaml",
  "zip",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "coverage",
  ".turbo",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
]);

export interface CollectFsProbeOptions {
  /** Max files to collect (default 16). */
  max?: number;
  /** Only consider files with these extensions (default deliverable set). */
  extensions?: ReadonlySet<string>;
  /** Ignore absolute paths matching these substrings. */
  ignoreSubstrings?: readonly string[];
  /** Recursion depth (default 4). */
  depth?: number;
}

/**
 * Physical probe scan: walk workspace for deliverable files (xlsx/txt/json/…).
 * Intended call site: after shell/script turn, before terminal notification.
 */
export function collectFsProbeHits(
  rootDir: string,
  opts: CollectFsProbeOptions = {},
): FsProbeHit[] {
  const max = opts.max ?? 16;
  const exts = opts.extensions ?? DELIVERABLE_EXT;
  const ignore = opts.ignoreSubstrings ?? [];
  const maxDepth = opts.depth ?? 4;
  const hits: FsProbeHit[] = [];
  if (!rootDir || !existsSync(rootDir)) return hits;

  const walk = (dir: string, depth: number): void => {
    if (depth > maxDepth || hits.length >= max) return;
    let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    try {
      entries = readdirSync(dir, { withFileTypes: true }) as unknown as typeof entries;
    } catch {
      return;
    }
    for (const e of entries) {
      if (hits.length >= max) return;
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        if (ignore.some((s) => abs.includes(s))) continue;
        walk(abs, depth + 1);
        continue;
      }
      if (!e.isFile()) continue;
      const ext = e.name.split(".").pop()?.toLowerCase() ?? "";
      if (!exts.has(ext)) continue;
      if (ignore.some((s) => abs.includes(s))) continue;
      try {
        const st = statSync(abs);
        if (st.size <= 0 || st.size > 80 * 1024 * 1024) continue;
        hits.push({
          absPath: abs,
          relPath: relative(rootDir, abs),
          name: e.name,
          size: st.size,
          contentType: contentTypeFromName(e.name),
        });
      } catch {
        /* skip unreadable */
      }
    }
  };

  walk(rootDir, 0);
  return hits;
}
