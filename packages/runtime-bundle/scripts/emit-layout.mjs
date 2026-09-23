#!/usr/bin/env node
// Emit runtime/manifest.json + installer plan text for packaging.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MANIFEST } from "../src/manifest.ts";
import { buildInstallerPlan, formatInstallerPlan } from "../src/installer.ts";

const outDir = process.argv[2] || join(process.cwd(), "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "manifest.json"), JSON.stringify(DEFAULT_MANIFEST, null, 2) + "\n");
for (const os of ["win32", "darwin", "linux"]) {
  const plan = buildInstallerPlan(os);
  writeFileSync(join(outDir, `installer-plan-${os}.txt`), formatInstallerPlan(plan) + "\n");
}
console.log("wrote", outDir);
