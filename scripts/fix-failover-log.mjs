import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/model-execution.ts";
let t = readFileSync(p, "utf8");
t = t.replace(
  'this.logger?.warn?.("llmapi failover", { from, to, status });',
  'this.logger?.warn?.("llmapi failover", { from, to, httpStatus: status });',
);
writeFileSync(p, t);
console.log("ok");
