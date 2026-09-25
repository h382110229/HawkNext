import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const root = process.argv[2] || process.cwd();
const { decodeHawkNextBuiltinRelease } = await import(
  pathToFileURL(resolve(root, "packages/provider-node/src/hawknext-builtin-release.ts")).href
);
try {
  const content = JSON.parse(readFileSync(resolve(root, "config/provider/hawknext-builtin.json"), "utf8"));
  decodeHawkNextBuiltinRelease(content);
  console.log("OK");
} catch (e) {
  console.error("FAIL:", e?.message);
  if (e?.cause) console.error("CAUSE:", e.cause);
  if (e?.issues) console.error("ISSUES:", JSON.stringify(e.issues, null, 2).slice(0, 3000));
  console.error(e);
}
