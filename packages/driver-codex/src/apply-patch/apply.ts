/**
 * apply hunks to a virtual FS (in-memory or node:fs via adapter).
 * Mode: preserve line endings when source has CR/CRLF (codex scenario default).
 */
import { seekSequence, type LineEndMode } from "./seek.ts";
import { parsePatch, type Hunk, type UpdateFileChunk } from "./parse.ts";

export interface FileMap {
  /** path (posix-ish relative) → file bytes/text */
  [path: string]: string;
}

export interface ApplyResult {
  files: FileMap;
  added: string[];
  modified: string[];
  deleted: string[];
  log: string[];
}

export class ApplyPatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyPatchError";
  }
}

function splitLinesKeepEol(content: string): { text: string; eol: string }[] {
  if (content === "") return [];
  const out: { text: string; eol: string }[] = [];
  const re = /\r\n|\n|\r/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    out.push({ text: content.slice(last, m.index), eol: m[0] });
    last = m.index + m[0].length;
  }
  if (last < content.length) {
    out.push({ text: content.slice(last), eol: "" });
  }
  return out;
}

function joinLinesKeepEol(lines: { text: string; eol: string }[]): string {
  return lines.map((l) => l.text + l.eol).join("");
}

function toTextLines(content: string, mode: LineEndMode): string[] {
  if (mode === "normalize-lf") {
    const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines;
  }
  return splitLinesKeepEol(content).map((l) => l.text);
}

/** Rebuild file preserving per-line EOL where possible (scenario 023). */
function applyPreserveWithEol(
  original: string,
  chunks: UpdateFileChunk[],
  path: string,
): string {
  const parts = splitLinesKeepEol(original);
  const texts = parts.map((p) => p.text);
  const replacements = computeReplacements(texts, path, chunks, "preserve");
  // parallel array of {text, eol}
  let lines = parts.map((p) => ({ ...p }));
  const dominant = original.includes("\r\n")
    ? "\r\n"
    : original.includes("\r") && !original.includes("\n")
      ? "\r"
      : "\n";

  for (const r of [...replacements].reverse()) {
    const removed = lines.splice(r.start, r.oldLen);
    const inserted = r.newLines.map((text, i) => {
      // Context-preserving semantics (codex SourceFile):
      // - kept 1:1 from old (same text as removed[i]) → keep that line's exact eol
      // - new/changed content → dominant file EOL (scenario 024: THREE gets \r\n)
      const donor = removed[i];
      const isKept =
        donor !== undefined && donor.text === text && donor.eol !== "";
      const eol = isKept ? donor.eol : dominant;
      return { text, eol };
    });
    if (removed.length === 0 && inserted.length) {
      // pure insert: dominant eol
      for (const s of inserted) s.eol = dominant;
    }
    lines.splice(r.start, 0, ...inserted);
  }
  // if original had no trailing eol on last line, drop empty eol
  return joinLinesKeepEol(lines);
}

function fromTextLines(lines: string[], sample: string, mode: LineEndMode): string {
  if (mode === "normalize-lf") {
    return lines.length ? lines.join("\n") + "\n" : "";
  }
  const eol = sample.includes("\r\n") ? "\r\n" : sample.includes("\r") && !sample.includes("\n") ? "\r" : "\n";
  const parts = splitLinesKeepEol(sample);
  const hadTrailingEol = parts.length ? parts[parts.length - 1]!.eol !== "" : sample.includes("\n");
  if (!lines.length) return hadTrailingEol ? eol : "";
  if (!hadTrailingEol) return lines.join(eol);
  return lines.join(eol) + eol;
}

function computeReplacements(
  originalLines: string[],
  path: string,
  chunks: UpdateFileChunk[],
  mode: LineEndMode,
): Array<{ start: number; oldLen: number; newLines: string[] }> {
  const replacements: Array<{ start: number; oldLen: number; newLines: string[] }> = [];
  let lineIndex = 0;

  for (const chunk of chunks) {
    if (chunk.changeContext !== null) {
      const idx = seekSequence(originalLines, [chunk.changeContext], lineIndex, false, mode);
      if (idx === null) {
        throw new ApplyPatchError(
          `Failed to find context '${chunk.changeContext}' in ${path}`,
        );
      }
      lineIndex = idx + 1;
    }

    if (chunk.oldLines.length === 0) {
      let insertionIdx = originalLines.length;
      if (mode === "normalize-lf" && originalLines.length && originalLines[originalLines.length - 1] === "") {
        insertionIdx = originalLines.length - 1;
      }
      replacements.push({ start: insertionIdx, oldLen: 0, newLines: [...chunk.newLines] });
      continue;
    }

    let pattern = chunk.oldLines;
    let newSlice = chunk.newLines;
    let found = seekSequence(originalLines, pattern, lineIndex, chunk.isEndOfFile, mode);

    if (found === null && pattern.length && pattern[pattern.length - 1] === "") {
      pattern = pattern.slice(0, -1);
      if (newSlice.length && newSlice[newSlice.length - 1] === "") {
        newSlice = newSlice.slice(0, -1);
      }
      found = seekSequence(originalLines, pattern, lineIndex, chunk.isEndOfFile, mode);
    }

    if (found === null) {
      throw new ApplyPatchError(
        `Failed to find expected lines in ${path}: ${pattern.slice(0, 3).join(" / ")}`,
      );
    }

    // Context-preserving split for preserve mode (keep original eol on context lines)
    replacements.push({ start: found, oldLen: pattern.length, newLines: [...newSlice] });
  }

  return replacements;
}

function applyReplacements(
  lines: string[],
  replacements: Array<{ start: number; oldLen: number; newLines: string[] }>,
): string[] {
  const out = [...lines];
  for (const r of [...replacements].reverse()) {
    out.splice(r.start, r.oldLen, ...r.newLines);
  }
  return out;
}

function updateFileContent(
  original: string,
  chunks: UpdateFileChunk[],
  path: string,
  mode: LineEndMode,
): string {
  if (mode === "preserve") {
    return applyPreserveWithEol(original, chunks, path);
  }
  const originalLines = toTextLines(original, mode);
  const replacements = computeReplacements(originalLines, path, chunks, mode);
  const newLines = applyReplacements(originalLines, replacements);
  return fromTextLines(newLines, original, mode);
}

/**
 * Apply hunks against an in-memory file map (cwd-relative paths).
 * Incremental: hunks that already applied remain (codex scenario 015).
 */
export function applyHunks(
  hunks: Hunk[],
  files: FileMap,
  mode: LineEndMode = "preserve",
): ApplyResult {
  let next: FileMap = { ...files };
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const log: string[] = [];

  for (const h of hunks) {
    try {
      if (h.type === "add") {
        next[h.path] = h.contents;
        if (!files[h.path]) added.push(h.path);
        else modified.push(h.path);
        log.push(`Add ${h.path}`);
        continue;
      }
      if (h.type === "delete") {
        if (!(h.path in next)) {
          throw new ApplyPatchError(`Failed to delete missing file: ${h.path}`);
        }
        delete next[h.path];
        deleted.push(h.path);
        log.push(`Delete ${h.path}`);
        continue;
      }
      if (!(h.path in next)) {
        throw new ApplyPatchError(`Failed to read file to update ${h.path} (missing)`);
      }
      const updated = updateFileContent(next[h.path]!, h.chunks, h.path, mode);
      if (h.movePath) {
        delete next[h.path];
        next[h.movePath] = updated;
        modified.push(h.movePath);
        log.push(`Move ${h.path} -> ${h.movePath}`);
      } else {
        next[h.path] = updated;
        modified.push(h.path);
        log.push(`Update ${h.path}`);
      }
    } catch (e) {
      // partial success stays in `next` (015)
      const err =
        e instanceof ApplyPatchError
          ? e
          : new ApplyPatchError(e instanceof Error ? e.message : String(e));
      (err as ApplyPatchError & { partialFiles?: FileMap }).partialFiles = next;
      (err as ApplyPatchError & { partialLog?: string[] }).partialLog = log;
      throw err;
    }
  }

  return { files: next, added, modified, deleted, log };
}

export function applyPatchText(
  patch: string,
  files: FileMap,
  mode: LineEndMode = "preserve",
): ApplyResult {
  const parsed = parsePatch(patch);
  try {
    return applyHunks(parsed.hunks, files, mode);
  } catch (e) {
    const pe = e as ApplyPatchError & { partialFiles?: FileMap; partialLog?: string[] };
    if (pe.partialFiles) {
      // surface partial state for scenario 015 via error.partialFiles
      throw pe;
    }
    throw e;
  }
}

/** Extract partial FS after a failed multi-hunk apply (scenario 015). */
export function partialFilesFromError(e: unknown, fallback: FileMap): FileMap {
  const pe = e as { partialFiles?: FileMap };
  return pe.partialFiles ?? fallback;
}
