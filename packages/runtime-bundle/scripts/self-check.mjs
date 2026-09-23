#!/usr/bin/env node
// Runtime doctor: resolve tools + signature self-check + print installer plan.
import { resolveRuntime, evaluateClosedLoop } from "../src/resolve.ts";
import { DEFAULT_MANIFEST } from "../src/manifest.ts";
import { signatureSelfCheck } from "../src/signature.ts";
import { buildInstallerPlan, formatInstallerPlan } from "../src/installer.ts";

const bundleRoot = process.argv[2] || process.cwd();
const resolutions = resolveRuntime(DEFAULT_MANIFEST, {
  bundleRoot,
  allowPathFallback: process.env.HAWKNEXT_ALLOW_PATH === "1" || true,
});
const closed = evaluateClosedLoop(resolutions, process.env.HAWKNEXT_RELEASE === "1", {
  allowPathFallback: process.env.HAWKNEXT_ALLOW_PATH === "1",
});

console.log("=== HawkNext runtime doctor ===");
for (const r of closed.resolved) {
  const mark = r.ok ? (r.source === "path" ? "~" : "OK") : "XX";
  console.log(`${mark} ${r.id.padEnd(12)} ${r.source.padEnd(8)} ${r.path ?? r.detail}`);
}
console.log(
  `closed-loop: ${closed.ok ? "OK" : "GAP"}  fullyBundled=${closed.fullyBundled}  missingRequired=${closed.missingRequired.length}`,
);

const sig = signatureSelfCheck({
  bundleRoot,
  platform: process.platform,
  signToolPath: resolutions.find((r) => r.id === "signtool")?.path ?? null,
});
console.log("=== signature self-check ===");
for (const i of sig.items) {
  console.log(`${i.status.padEnd(4)} ${i.id}: ${i.detail}`);
}
console.log(`signature: ${sig.ok ? "OK" : "FAIL"}`);

const plan = buildInstallerPlan(process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux");
console.log("=== installer plan ===");
console.log(formatInstallerPlan(plan));

if (process.env.HAWKNEXT_RELEASE === "1" && (!closed.ok || !sig.ok)) {
  process.exit(1);
}
