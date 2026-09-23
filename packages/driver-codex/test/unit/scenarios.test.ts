/**
 * Portable apply-patch scenarios — codex-rs/apply-patch/tests/fixtures/scenarios
 * Spec: final filesystem state only (README).
 */
import assert from "node:assert/strict";
import { readdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";
import { applyPatchText, type FileMap } from "../../src/apply-patch/apply.ts";

const SCENARIOS = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "research",
  "codex",
  "codex-rs",
  "apply-patch",
  "tests",
  "fixtures",
  "scenarios",
);

function walkFiles(root: string, base = root, out: FileMap = {}): FileMap {
  if (!existsSync(root)) return out;
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    const st = statSync(p);
    const rel = relative(base, p).split(sep).join("/");
    if (st.isDirectory()) walkFiles(p, base, out);
    else if (st.isFile()) out[rel] = readFileSync(p, "utf8");
  }
  return out;
}

function snapshotEqual(a: FileMap, b: FileMap): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    // binary-ish compare via utf8; fixtures are text
    if (a[ka[i]!] !== b[kb[i]!]) return false;
  }
  return true;
}

const available = existsSync(SCENARIOS);

describe("codex apply-patch scenarios (portable)", { skip: !available && "fixtures not found" }, () => {
  const dirs = available
    ? readdirSync(SCENARIOS, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

  for (const name of dirs) {
    it(name, () => {
      const dir = join(SCENARIOS, name);
      const input = walkFiles(join(dir, "input"));
      const expected = walkFiles(join(dir, "expected"));
      const patch = readFileSync(join(dir, "patch.txt"), "utf8");
      let actual: FileMap = { ...input };
      try {
        actual = applyPatchText(patch, input, "preserve").files;
      } catch (e) {
        // 015: partial success must remain in the FS
        const pe = e as { partialFiles?: FileMap };
        if (pe.partialFiles) actual = pe.partialFiles;
      }
      assert.ok(
        snapshotEqual(actual, expected),
        `${name}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
      );
    });
  }
});
