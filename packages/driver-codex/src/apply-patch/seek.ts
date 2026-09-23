/**
 * seek_sequence — port of codex-rs/apply-patch/src/seek_sequence.rs
 * Exact → rstrip → trim → unicode-normalized match; eof bias when requested.
 */

export type LineEndMode = "normalize-lf" | "preserve";

function normalise(s: string): string {
  return s
    .trim()
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[  -  　]/g, " ");
}

export function seekSequence(
  lines: string[],
  pattern: string[],
  start: number,
  eof: boolean,
  _mode: LineEndMode = "preserve",
): number | null {
  if (pattern.length === 0) return start;
  if (pattern.length > lines.length) return null;

  let searchStart = start;
  if (eof && lines.length >= pattern.length) {
    searchStart = Math.max(lines.length - pattern.length, 0);
  }

  const max = lines.length - pattern.length;
  const eq = (i: number, cmp: (a: string, b: string) => boolean) => {
    for (let p = 0; p < pattern.length; p++) {
      if (!cmp(lines[i + p]!, pattern[p]!)) return false;
    }
    return true;
  };

  for (let i = searchStart; i <= max; i++) {
    if (eq(i, (a, b) => a === b)) return i;
  }
  for (let i = searchStart; i <= max; i++) {
    if (eq(i, (a, b) => a.replace(/\s+$/, "") === b.replace(/\s+$/, ""))) return i;
  }
  for (let i = searchStart; i <= max; i++) {
    if (eq(i, (a, b) => a.trim() === b.trim())) return i;
  }
  for (let i = searchStart; i <= max; i++) {
    if (eq(i, (a, b) => normalise(a) === normalise(b))) return i;
  }
  return null;
}
