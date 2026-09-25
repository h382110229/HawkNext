import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/core/src/tool/handlers/apply-patch.ts";
let t = readFileSync(p, "utf8");
t = t.replace(
  "trace: { enabled: true },",
  `trace: {
    required: true,
    propagateToAdapters: true,
    recordInput: "summary",
    recordOutput: "summary",
  },`,
);
writeFileSync(p, t);
console.log("trace fixed");
