import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/handlers/index.ts";
let t = readFileSync(p, "utf8");
if (!t.includes("apply-patch.js")) {
  t = t.replace(
    'import { writeToolEntry } from "./write.js";',
    'import { writeToolEntry } from "./write.js";\nimport { applyPatchToolEntry } from "./apply-patch.js";',
  );
  writeFileSync(p, t);
  console.log("import added");
} else {
  console.log("already present");
}
