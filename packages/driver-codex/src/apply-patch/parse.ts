/**
 * apply-patch parser — port of codex-rs/apply-patch (lenient mode).
 * Grammar: core/assets/tools/apply_patch.lark
 * Lenient extras (gpt-4.1 / mimo freeform shapes): heredoc wrap, marker whitespace.
 */

export type ParseError =
  | { kind: "invalid_patch"; message: string }
  | { kind: "invalid_hunk"; message: string; lineNumber: number };

export class ApplyPatchParseError extends Error {
  readonly detail: ParseError;
  constructor(detail: ParseError) {
    super(detail.kind === "invalid_patch" ? detail.message : `line ${detail.lineNumber}: ${detail.message}`);
    this.name = "ApplyPatchParseError";
    this.detail = detail;
  }
}

export interface UpdateFileChunk {
  changeContext: string | null;
  oldLines: string[];
  newLines: string[];
  contextLineIndices: Array<[number, number]>;
  isEndOfFile: boolean;
}

export type Hunk =
  | { type: "add"; path: string; contents: string }
  | { type: "delete"; path: string }
  | { type: "update"; path: string; movePath: string | null; chunks: UpdateFileChunk[] };

export interface ParsedPatch {
  hunks: Hunk[];
  environmentId: string | null;
  /** Text between Begin/End markers (after lenient unwrap). */
  patch: string;
}

const BEGIN = "*** Begin Patch";
const END = "*** End Patch";
const ADD = "*** Add File: ";
const DEL = "*** Delete File: ";
const UPD = "*** Update File: ";
const MOVE = "*** Move to: ";
const EOF_M = "*** End of File";
const CTX = "@@ ";
const CTX_EMPTY = "@@";

function emptyChunk(): UpdateFileChunk {
  return {
    changeContext: null,
    oldLines: [],
    newLines: [],
    contextLineIndices: [],
    isEndOfFile: false,
  };
}

/** Strip BOM and normalize newlines for parsing. */
function toLines(text: string): string[] {
  let s = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // trailing final newline produces empty last element after split — keep as-is for now
  return s.split("\n");
}

function checkBoundariesStrict(lines: string[]): string[] {
  const first = lines[0]?.trim();
  const last = lines[lines.length - 1]?.trim();
  if (first === BEGIN && last === END) return lines;
  if (first !== BEGIN) {
    throw new ApplyPatchParseError({
      kind: "invalid_patch",
      message: "The first line of the patch must be '*** Begin Patch'",
    });
  }
  throw new ApplyPatchParseError({
    kind: "invalid_patch",
    message: "The last line of the patch must be '*** End Patch'",
  });
}

/** gpt-4.1 / mimo freeform: `<<'EOF' ... EOF` wrap around the patch. */
function checkBoundariesLenient(original: string[]): string[] {
  try {
    return checkBoundariesStrict(original);
  } catch (originalErr) {
    if (original.length >= 4) {
      const first = original[0]!.trim();
      const last = original[original.length - 1]!.trim();
      const heredocStart =
        first === "<<EOF" || first === "<<'EOF'" || first === '<<"EOF"' || first === "<<'eof'";
      if (heredocStart && last.endsWith("EOF")) {
        return checkBoundariesStrict(original.slice(1, -1));
      }
    }
    throw originalErr;
  }
}

function parseHunks(inner: string[], startLine: number): { hunks: Hunk[]; environmentId: string | null } {
  const hunks: Hunk[] = [];
  let environmentId: string | null = null;
  let i = 0;

  while (i < inner.length) {
    const raw = inner[i]!;
    const line = raw.trim();
    const lineNo = startLine + i;
    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith("*** Environment ID: ")) {
      environmentId = line.slice("*** Environment ID: ".length).trim();
      i++;
      continue;
    }

    if (line === END) break;

    if (line.startsWith(ADD.trim()) || line.startsWith("*** Add File:")) {
      const path = line.slice(line.indexOf("File:") + 5).trim();
      i++;
      const contentLines: string[] = [];
      while (i < inner.length) {
        const l = inner[i]!;
        const t = l.trim();
        if (t === END || t.startsWith("*** ")) break;
        // add_line: "+" content
        if (l.startsWith("+") || t.startsWith("+")) {
          // preserve leading spaces after '+'
          const plus = l.indexOf("+");
          contentLines.push(l.slice(plus + 1));
          i++;
        } else if (!t) {
          break;
        } else {
          // whitespace-padded marker start of next hunk
          if (t.startsWith("***")) break;
          contentLines.push(l.startsWith("+") ? l.slice(1) : l);
          i++;
        }
      }
      hunks.push({ type: "add", path, contents: contentLines.join("\n") + (contentLines.length ? "\n" : "") });
      continue;
    }

    if (line.startsWith("*** Delete File:") || line.startsWith(DEL.trim())) {
      const path = line.slice(line.indexOf("File:") + 5).trim();
      hunks.push({ type: "delete", path });
      i++;
      continue;
    }

    if (line.startsWith("*** Update File:") || line.startsWith(UPD.trim())) {
      const path = line.slice(line.indexOf("File:") + 5).trim();
      i++;
      let movePath: string | null = null;
      const chunks: UpdateFileChunk[] = [];
      let cur: UpdateFileChunk | null = null;

      const ensureChunk = () => {
        if (!cur) {
          cur = emptyChunk();
          chunks.push(cur);
        }
        return cur;
      };

      while (i < inner.length) {
        const l = inner[i]!;
        const t = l.trim();
        const curLineNo = startLine + i;

        if (t === END) break;
        if (t.startsWith("*** Add File:") || t.startsWith("*** Delete File:") || t.startsWith("*** Update File:")) {
          break;
        }
        if (t.startsWith("*** Move to:") || t.startsWith(MOVE.trim())) {
          movePath = t.slice(t.indexOf("Move to:") + 8).trim();
          i++;
          continue;
        }
        if (t === EOF_M || t === "*** End of File") {
          ensureChunk().isEndOfFile = true;
          i++;
          continue;
        }
        if (t === CTX_EMPTY || t.startsWith("@@")) {
          // new chunk (or first)
          cur = emptyChunk();
          chunks.push(cur);
          const after = t.slice(2).trim();
          if (after) cur.changeContext = after;
          i++;
          continue;
        }

        // change_line: ("+" | "-" | " ") content  — marker is FIRST char only
        // (content may contain its own indent). Lenient: strip pure indent before +/-.
        let work = l;
        let m = work[0];
        if (m !== "+" && m !== "-" && m !== " ") {
          // indented "+foo" / "-foo" (model indent) — first +/- is marker
          const plusMinus = work.search(/[+-]/);
          if (plusMinus > 0 && work.slice(0, plusMinus).trim() === "") {
            work = work.slice(plusMinus);
            m = work[0];
          }
        }
        if (m === "+" || m === "-" || m === " ") {
          const ch = ensureChunk();
          const rest = work.slice(1);
          if (m === "+") {
            ch.newLines.push(rest);
          } else if (m === "-") {
            ch.oldLines.push(rest);
          } else {
            const oldIdx = ch.oldLines.length;
            const newIdx = ch.newLines.length;
            ch.oldLines.push(rest);
            ch.newLines.push(rest);
            ch.contextLineIndices.push([oldIdx, newIdx]);
          }
          i++;
          continue;
        }

        // blank or unknown inside update — treat blank as end of update section noise
        if (!t) {
          i++;
          continue;
        }

        throw new ApplyPatchParseError({
          kind: "invalid_hunk",
          message: `'${raw}' is not a valid change line in update hunk`,
          lineNumber: curLineNo,
        });
      }

      if (chunks.length === 0) {
        // empty update (no change lines) — codex rejects
        throw new ApplyPatchParseError({
          kind: "invalid_hunk",
          message: `Update file hunk for path '${path}' is empty`,
          lineNumber: lineNo,
        });
      }
      // reject chunks that are entirely empty (no old and no new) except eof-only is allowed with newLines
      for (const ch of chunks) {
        if (ch.oldLines.length === 0 && ch.newLines.length === 0 && !ch.isEndOfFile) {
          throw new ApplyPatchParseError({
            kind: "invalid_hunk",
            message: `Update file hunk for path '${path}' is empty`,
            lineNumber: lineNo,
          });
        }
      }
      hunks.push({ type: "update", path, movePath, chunks });
      continue;
    }

    if (line.startsWith("***")) {
      throw new ApplyPatchParseError({
        kind: "invalid_hunk",
        message: `'${raw.trim()}' is not a valid hunk header. Valid hunk headers: '*** Add File: {path}', '*** Delete File: {path}', '*** Update File: {path}'`,
        lineNumber: lineNo,
      });
    }

    i++;
  }

  return { hunks, environmentId };
}

/**
 * Parse apply-patch text (lenient: heredoc + marker whitespace + BOM).
 * Empty patch with only Begin/End yields zero hunks (codex allows this at parse;
 * apply may still error).
 */
export function parsePatch(patch: string): ParsedPatch {
  const original = toLines(patch.trim());
  // drop trailing empty from final newline
  if (original.length && original[original.length - 1] === "") original.pop();

  const inner = checkBoundariesLenient(original);
  const body = inner.slice(1, inner.length - 1); // drop Begin/End
  // If last remaining is empty, drop
  while (body.length && body[body.length - 1] === "") body.pop();

  const { hunks, environmentId } = parseHunks(body, 2);
  return { hunks, environmentId, patch: inner.join("\n") };
}

export function formatParseError(e: unknown): string {
  if (e instanceof ApplyPatchParseError) {
    if (e.detail.kind === "invalid_patch") return `Invalid patch: ${e.detail.message}`;
    return `Invalid patch hunk on line ${e.detail.lineNumber}: ${e.detail.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}
