#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const me =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/model-execution.ts";
let m = readFileSync(me, "utf8");
if (m.includes("HAWK_AUTO_MODEL")) {
  console.log("already");
  process.exit(0);
}
const old = "model: factory(snapshot.modelId.toString()),";
if (!m.includes(old)) {
  console.error("factory call missing");
  const i = m.indexOf("factory(snapshot.modelId");
  console.log(JSON.stringify(m.slice(i - 20, i + 80)));
  process.exit(1);
}
m = m.replace(
  old,
  `// HAWK_AUTO_MODEL: unknown/legacy ids collapse to Auto router (keep explicit mimo pins)
      model: factory(normalizeWireModelId(snapshot.modelId.toString())),`,
);
writeFileSync(me, m, "utf8");
console.log("auto model wired");
