/**
 * Extract apply-patch payload from freeform model output (mimo/Auto shapes).
 *
 * mimo (and gpt-4.1) often wrap the patch. We recover from:
 * - markdown ``` / ```diff / ```patch fences
 * - heredoc <<'EOF' ... EOF (codex lenient)
 * - JSON {"patch":"..."} or {"input":"..."}
 * - leading prose before *** Begin Patch
 * - BOM / CRLF / marker indent
 * - single-star typos (* Begin Patch → *** Begin Patch) — conservative only
 */
import { parsePatch, type ParsedPatch } from "./parse.ts";

export interface ExtractResult {
  ok: boolean;
  /** Recovered patch text with Begin/End markers (if any). */
  patch: string | null;
  parsed: ParsedPatch | null;
  /** How the payload was recovered. */
  via:
    | "raw"
    | "fence"
    | "heredoc"
    | "json"
    | "slice-markers"
    | "repaired-markers"
    | "none";
  error?: string;
}

const BEGIN = "*** Begin Patch";
const END = "*** End Patch";

function tryParse(text: string): ParsedPatch | null {
  try {
    return parsePatch(text);
  } catch {
    return null;
  }
}

function attempt(text: string, via: ExtractResult["via"]): ExtractResult {
  const parsed = tryParse(text);
  if (parsed) return { ok: true, patch: text, parsed, via };
  return { ok: false, patch: text, parsed: null, via, error: "parse failed" };
}

function sliceMarkers(text: string): string | null {
  const b = text.indexOf(BEGIN);
  const e = text.lastIndexOf(END);
  if (b < 0 || e < 0 || e < b) return null;
  return text.slice(b, e + END.length);
}

/** Recover patch from model freeform / tool argument text. */
export function extractPatch(modelText: string): ExtractResult {
  let text = modelText.replace(/^\uFEFF/, "").trim();

  // 1) direct
  let r = attempt(text, "raw");
  if (r.ok) return r;

  // 2) markdown fence(s)
  const fenceRe = /```(?:diff|patch|text|plaintext|json)?\s*\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(modelText))) {
    const body = m[1]!.replace(/^\uFEFF/, "").trim();
    r = attempt(body, "fence");
    if (r.ok) return r;
    const sliced = sliceMarkers(body);
    if (sliced) {
      r = attempt(sliced, "fence");
      if (r.ok) return r;
    }
  }

  // 3) JSON object with patch/input/argument string
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    try {
      const obj = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
      for (const key of ["patch", "input", "argument", "arguments", "command"]) {
        const v = obj[key];
        if (typeof v === "string" && v.includes("Begin Patch")) {
          r = attempt(v, "json");
          if (r.ok) return r;
          const sliced = sliceMarkers(v);
          if (sliced) {
            r = attempt(sliced, "json");
            if (r.ok) return r;
          }
        }
      }
    } catch {
      // not json
    }
  }

  // 4) heredoc
  const heredoc = text.match(/<<['"]?EOF['"]?\n([\s\S]*?)\nEOF\s*$/);
  if (heredoc) {
    r = attempt(heredoc[1]!.trim(), "heredoc");
    if (r.ok) return r;
    const sliced = sliceMarkers(heredoc[1]!);
    if (sliced) {
      r = attempt(sliced, "heredoc");
      if (r.ok) return r;
    }
  }

  // 5) slice Begin/End from prose
  const sliced = sliceMarkers(text);
  if (sliced) {
    r = attempt(sliced, "slice-markers");
    if (r.ok) return r;
  }

  // 6) repair common single-star / missing stars typos (mimo-shape)
  let repaired = text;
  repaired = repaired.replace(/^\s*\*\s*Begin Patch\s*$/m, BEGIN);
  repaired = repaired.replace(/^\s*\*\s*End Patch\s*$/m, END);
  repaired = repaired.replace(/^\s*\*\s*Add File:\s*/gm, "*** Add File: ");
  repaired = repaired.replace(/^\s*\*\s*Delete File:\s*/gm, "*** Delete File: ");
  repaired = repaired.replace(/^\s*\*\s*Update File:\s*/gm, "*** Update File: ");
  if (repaired.includes(BEGIN) && repaired.includes(END)) {
    const s2 = sliceMarkers(repaired) ?? repaired;
    r = attempt(s2, "repaired-markers");
    if (r.ok) return r;
  }

  return {
    ok: false,
    patch: sliced,
    parsed: null,
    via: "none",
    error: "could not extract a parseable apply-patch payload",
  };
}

/**
 * Classify model tool-call arguments into patch vs deterministic write.
 * Used by policy to decide whether to offer apply_patch to the model.
 */
export function isLikelyApplyPatchPayload(text: string): boolean {
  return (
    text.includes(BEGIN) ||
    text.includes("Add File:") ||
    text.includes("Update File:") ||
    /\*\s*Begin Patch/.test(text)
  );
}
