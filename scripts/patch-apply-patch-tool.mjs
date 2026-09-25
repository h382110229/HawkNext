#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/handlers/index.ts";
let s = readFileSync(p, "utf8");

if (s.includes("applyPatchToolEntry")) {
  // just ensure not commented
  s = s.replace(/\s*\/\/ applyPatchToolEntry,/, "\n  applyPatchToolEntry,");
  writeFileSync(p, s, "utf8");
  console.log("uncommented");
  process.exit(0);
}

s = s.replace(
  'import { writeToolEntry } from "./write.js";',
  'import { writeToolEntry } from "./write.js";\nimport { applyPatchToolEntry } from "./apply-patch.js"; // HAWK_APPLY_PATCH_TOOL',
);
s = s.replace("  // applyPatchToolEntry,", "\n  applyPatchToolEntry,");
writeFileSync(p, s, "utf8");
console.log("registered");
