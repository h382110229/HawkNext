// ============================================================
// ApplyPatch Tool Handler (codex apply-patch format, mimo-tolerant)
// ============================================================
// 与 packages/driver-codex 的 parser 同语义：*** Begin Patch / Add|Update|Delete File。
// 解析失败时 recoverable，并提示改用 Write/Edit（确定性降级，Office 管道铁律）。

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type {
  ToolExecutionContext,
  ToolHandler,
  ToolHandlerFailure,
  ToolEntry,
} from "../types.ts";

function workspaceRoot(context: ToolExecutionContext): string {
  const anyCtx = context as { workingDirectory?: string; getWorkingDirectory?: () => string };
  return (
    anyCtx.getWorkingDirectory?.() ??
    anyCtx.workingDirectory ??
    process.cwd()
  );
}

const APPLY_PATCH_PROVIDER_DESCRIPTION = [
  "Apply a multi-file patch in codex apply_patch format.",
  "",
  "Wrap the patch as:",
  "*** Begin Patch",
  "*** Add File: path",
  "+line",
  "*** Update File: path",
  "@@",
  "-old",
  "+new",
  "*** Delete File: path",
  "*** End Patch",
  "",
  "Prefer this for multi-file edits. On parse failure the call fails recoverable — fall back to Write/Edit.",
].join("\n");

const PATCH_INPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    patch: {
      type: "string",
      description: "Full apply_patch body including *** Begin Patch / *** End Patch.",
    },
  },
  required: ["patch"],
  additionalProperties: false,
} as const;

const PATCH_OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["applied"] },
    paths: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
  required: ["type", "paths", "summary"],
  additionalProperties: false,
} as const;

type Hunk =
  | { type: "add"; path: string; contents: string }
  | { type: "delete"; path: string }
  | { type: "update"; path: string; movePath: string | null; chunks: UpdateChunk[] };

interface UpdateChunk {
  changeContext: string | null;
  oldLines: string[];
  newLines: string[];
  isEndOfFile: boolean;
}

function parsePatch(patch: string): Hunk[] {
  const lines = patch.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  const first = lines[0]?.trim();
  const last = lines[lines.length - 1]?.trim();
  if (first !== "*** Begin Patch" || last !== "*** End Patch") {
    throw new Error("The first/last line must be '*** Begin Patch' / '*** End Patch'");
  }
  const body = lines.slice(1, -1);
  const hunks: Hunk[] = [];
  let i = 0;
  while (i < body.length) {
    const raw = body[i]!;
    const line = raw.trim();
    if (!line) {
      i++;
      continue;
    }
    if (line.startsWith("*** Add File:")) {
      const path = line.slice(line.indexOf("File:") + 5).trim();
      i++;
      const content: string[] = [];
      while (i < body.length) {
        const l = body[i]!;
        const t = l.trim();
        if (t.startsWith("***")) break;
        if (l.startsWith("+") || (t.startsWith("+") && t !== "+")) content.push(l.slice(l.indexOf("+") + 1));
        else if (!t) break;
        else break;
        i++;
      }
      hunks.push({ type: "add", path, contents: content.join("\n") + (content.length ? "\n" : "") });
      continue;
    }
    if (line.startsWith("*** Delete File:")) {
      hunks.push({ type: "delete", path: line.slice(line.indexOf("File:") + 5).trim() });
      i++;
      continue;
    }
    if (line.startsWith("*** Update File:")) {
      const path = line.slice(line.indexOf("File:") + 5).trim();
      i++;
      let movePath: string | null = null;
      const chunks: UpdateChunk[] = [];
      let cur: UpdateChunk | null = null;
      const ensure = () => {
        if (!cur) {
          cur = { changeContext: null, oldLines: [], newLines: [], isEndOfFile: false };
          chunks.push(cur);
        }
        return cur;
      };
      while (i < body.length) {
        const l = body[i]!;
        const t = l.trim();
        if (t === "*** End Patch" || t.startsWith("*** Add File:") || t.startsWith("*** Delete File:") || t.startsWith("*** Update File:")) break;
        if (t.startsWith("*** Move to:")) {
          movePath = t.slice(t.indexOf("Move to:") + 8).trim();
          i++;
          continue;
        }
        if (t === "*** End of File") {
          ensure().isEndOfFile = true;
          i++;
          continue;
        }
        if (t === "@@" || t.startsWith("@@ ")) {
          cur = { changeContext: t.length > 2 ? t.slice(2).trim() || null : null, oldLines: [], newLines: [], isEndOfFile: false };
          chunks.push(cur);
          i++;
          continue;
        }
        const marker = l[0];
        if (marker === "+" || marker === "-" || marker === " ") {
          const ch = ensure();
          const rest = l.slice(1);
          if (marker === "+") ch.newLines.push(rest);
          else if (marker === "-") ch.oldLines.push(rest);
          else {
            ch.oldLines.push(rest);
            ch.newLines.push(rest);
          }
          i++;
          continue;
        }
        if (!t) {
          i++;
          continue;
        }
        throw new Error(`Invalid change line: ${raw}`);
      }
      if (chunks.length === 0) throw new Error(`Update file hunk for '${path}' is empty`);
      hunks.push({ type: "update", path, movePath, chunks });
      continue;
    }
    if (line.startsWith("***")) {
      throw new Error(`Invalid hunk header: ${raw.trim()}`);
    }
    i++;
  }
  return hunks;
}

function splitLines(content: string): string[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function applyUpdate(original: string, chunks: UpdateChunk[], filePath = "file"): string {
  const lines = splitLines(original);
  let idx = 0;
  for (const chunk of chunks) {
    if (chunk.changeContext !== null) {
      const at = lines.indexOf(chunk.changeContext, idx);
      if (at < 0) throw new Error(`Failed to find context '${chunk.changeContext}'`);
      idx = at + 1;
    }
    if (chunk.oldLines.length === 0) {
      lines.push(...chunk.newLines);
      continue;
    }
    const found = lines.findIndex((_, j) => j >= idx && chunk.oldLines.every((ol, k) => lines[j + k] === ol));
    if (found < 0) throw new Error(`Failed to find expected lines in ${filePath}`);
    lines.splice(found, chunk.oldLines.length, ...chunk.newLines);
    idx = found + chunk.newLines.length;
  }
  return lines.length ? lines.join("\n") + "\n" : "";
}

function formatApplyPatchModelContent(output: unknown): string {
  if (typeof output === "object" && output && "summary" in output) {
    return String((output as { summary: string }).summary);
  }
  return "Patch applied.";
}

const applyPatchHandler: ToolHandler = async (rawInput, context) => {
  const input = rawInput as { patch?: string };
  const patch = typeof input?.patch === "string" ? input.patch : "";
  if (!patch.trim()) {
    return {
      result: false,
      errorCode: 1,
      message: "ApplyPatch failed recoverable: empty patch. Use Write/Edit instead.",
    } satisfies ToolHandlerFailure;
  }
  let hunks: Hunk[];
  try {
    hunks = parsePatch(patch);
  } catch (e) {
    return {
      result: false,
      errorCode: 1,
      message: `ApplyPatch parse failed recoverable: ${e instanceof Error ? e.message : String(e)}. Fall back to Write/Edit.`,
    } satisfies ToolHandlerFailure;
  }

  const root = resolve(workspaceRoot(context), ".");
  const touched: string[] = [];
  const summaries: string[] = [];
  try {
    for (const h of hunks) {
      const abs = resolve(root, h.path);
      if (h.type === "add") {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, h.contents, "utf8");
        touched.push(h.path);
        summaries.push(`Add ${h.path}`);
        continue;
      }
      if (h.type === "delete") {
        if (!existsSync(abs)) throw new Error(`missing file: ${h.path}`);
        unlinkSync(abs);
        touched.push(h.path);
        summaries.push(`Delete ${h.path}`);
        continue;
      }
      if (!existsSync(abs)) throw new Error(`missing file: ${h.path}`);
      const next = applyUpdate(readFileSync(abs, "utf8"), h.chunks);
      if (h.movePath) {
        const dest = resolve(root, h.movePath);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, next, "utf8");
        unlinkSync(abs);
        touched.push(h.movePath);
        summaries.push(`Move ${h.path} -> ${h.movePath}`);
      } else {
        writeFileSync(abs, next, "utf8");
        touched.push(h.path);
        summaries.push(`Update ${h.path}`);
      }
    }
  } catch (e) {
    return {
      result: false,
      errorCode: 2,
      message: `ApplyPatch apply failed recoverable: ${e instanceof Error ? e.message : String(e)}. Partial edits kept; fall back to Write/Edit if needed.`,
    } satisfies ToolHandlerFailure;
  }

  return {
    type: "applied",
    paths: touched,
    summary: summaries.join("; "),
  };
};

export const applyPatchToolEntry: ToolEntry = {
  trace: {
    required: true,
    propagateToAdapters: true,
    recordInput: "summary",
    recordOutput: "summary",
  },
  capability: "Apply multi-file codex apply_patch edits",
  metadata: {
    name: "apply_patch",
    description: APPLY_PATCH_PROVIDER_DESCRIPTION,
    readOnly: false,
    destructive: false,
    concurrentSafe: false,
    timeoutMs: 60000,
    maxOutputBytes: 1_000_000,
    sideEffectScope: "workspace",
    riskLevel: "medium",
    needsApproval: true,
  },
  handler: applyPatchHandler,
  formatModelContent: formatApplyPatchModelContent,
  inputSchema: PATCH_INPUT_JSON_SCHEMA,
  outputSchema: PATCH_OUTPUT_JSON_SCHEMA,
  permission: {
    permission: "edit",
    reason: "apply_patch modifies workspace files",
    riskLevel: "medium",
    sideEffectScope: "workspace",
    needsApproval: true,
    patternSources: ["path"],
    alwaysAllowPatternSources: ["path"],
    denyPriority: "beforeAsk",
  },
  resultBudget: {
    maxInlineBytes: 1_000_000,
    maxModelBytes: 100_000,
    strategy: "truncate",
    preview: { maxBytes: 100_000, direction: "head" },
  },
  timeout: {
    defaultMs: 60000,
    maxMs: 120000,
    allowCallOverride: true,
  },
  cancellation: {
    supported: true,
    cleanup: "bestEffort",
    userVisibleMessage: "apply_patch cancelled",
  },
};
