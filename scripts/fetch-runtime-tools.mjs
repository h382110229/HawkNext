#!/usr/bin/env node
/**
 * Fetch portable runtime tools that are missing from the closed-loop bundle.
 * Targets: pandoc, fd, 7z (signing uses Windows SDK signtool / osslsigncode).
 * Downloads land under runtime/<family>/ per docs/runtime-bundle-design.md.
 *
 * Usage:
 *   node scripts/fetch-runtime-tools.mjs [--os win32|darwin|linux] [--arch x64|arm64]
 *   node scripts/fetch-runtime-tools.mjs --dry-run
 *
 * Never stores API keys. No git commit.
 */
import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const osArg = args.find((a) => a.startsWith("--os="))?.split("=")[1]
  ?? args[args.indexOf("--os") + 1]
  ?? process.platform;
const archArg = args.find((a) => a.startsWith("--arch="))?.split("=")[1]
  ?? args[args.indexOf("--arch") + 1]
  ?? process.arch;

const OS = osArg === "win32" || osArg === "win" ? "win32" : osArg === "darwin" || osArg === "mac" ? "darwin" : "linux";
const ARCH = archArg === "x64" || archArg === "amd64" ? "x64" : "arm64";

/** @type {Array<{id:string;family:string;url:string;dest:string;stripHint?:string}>} */
const TOOLS = [];

function addTool(id, family, url, dest) {
  TOOLS.push({ id, family, url, dest });
}

// --- portable URLs (pin versions; update deliberately) ---
if (OS === "win32") {
  addTool(
    "pandoc",
    "office",
    "https://github.com/jgm/pandoc/releases/download/3.6.4/pandoc-3.6.4-windows-x86_64.zip",
    "runtime/office/pandoc.zip",
  );
  addTool(
    "fd",
    "search",
    ARCH === "x64"
      ? "https://github.com/sharkdp/fd/releases/download/v10.2.0/fd-v10.2.0-x86_64-pc-windows-msvc.zip"
      : "https://github.com/sharkdp/fd/releases/download/v10.2.0/fd-v10.2.0-aarch64-pc-windows-msvc.zip",
    "runtime/search/fd.zip",
  );
  addTool(
    "7z-extra",
    "archive",
    "https://www.7-zip.org/a/7z2409-extra.7z",
    "runtime/archive/7z-extra.7z",
  );
  addTool(
    "7zr",
    "archive",
    "https://www.7-zip.org/a/7zr.exe",
    "runtime/archive/7zr.exe",
  );
} else if (OS === "darwin") {
  addTool(
    "pandoc",
    "office",
    ARCH === "arm64"
      ? "https://github.com/jgm/pandoc/releases/download/3.6.4/pandoc-3.6.4-arm64-macOS.zip"
      : "https://github.com/jgm/pandoc/releases/download/3.6.4/pandoc-3.6.4-x86_64-macOS.zip",
    "runtime/office/pandoc.zip",
  );
  addTool(
    "fd",
    "search",
    ARCH === "arm64"
      ? "https://github.com/sharkdp/fd/releases/download/v10.2.0/fd-v10.2.0-aarch64-apple-darwin.tar.gz"
      : "https://github.com/sharkdp/fd/releases/download/v10.2.0/fd-v10.2.0-x86_64-apple-darwin.tar.gz",
    "runtime/search/fd.tar.gz",
  );
  addTool(
    "7zz",
    "archive",
    "https://www.7-zip.org/a/7z2409-mac.tar.xz",
    "runtime/archive/7z-mac.tar.xz",
  );
} else {
  addTool(
    "pandoc",
    "office",
    "https://github.com/jgm/pandoc/releases/download/3.6.4/pandoc-3.6.4-linux-amd64.tar.gz",
    "runtime/office/pandoc.tar.gz",
  );
  addTool(
    "fd",
    "search",
    "https://github.com/sharkdp/fd/releases/download/v10.2.0/fd-v10.2.0-x86_64-unknown-linux-musl.tar.gz",
    "runtime/search/fd.tar.gz",
  );
  addTool(
    "7z",
    "archive",
    "https://www.7-zip.org/a/7z2409-linux-x64.tar.xz",
    "runtime/archive/7z-linux.tar.xz",
  );
}

// signing self-check stub (hash lockfile generator is local; Authenticode needs SDK)
const SIGN_STUB = join(ROOT, "runtime/signing/self-check.mjs");

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

async function download(url, dest) {
  ensureDir(dirname(dest));
  if (DRY) {
    console.log("[dry-run] GET", url, "->", dest);
    return;
  }
  console.log("GET", url);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log("  wrote", dest, `${(buf.length / 1e6).toFixed(2)}MB`);
}

async function main() {
  console.log(`fetch-runtime-tools os=${OS} arch=${ARCH} dry=${DRY}`);
  const lock = [];
  for (const t of TOOLS) {
    const dest = join(ROOT, t.dest);
    if (!DRY && existsSync(dest) && statSync(dest).size > 0) {
      console.log("skip (exists)", t.dest);
    } else {
      await download(t.url, dest);
    }
    lock.push({ id: t.id, family: t.family, url: t.url, dest: t.dest });
  }

  // local signing self-check entry (no network)
  ensureDir(dirname(SIGN_STUB));
  if (!existsSync(SIGN_STUB)) {
    const stub = `#!/usr/bin/env node
// HawkNext signing self-check entry (runtime/signing/self-check)
// Authenticode: use signtool (Windows SDK) or osslsigncode. Hash lockfile: packages/runtime-bundle.
import { signatureSelfCheck, buildHashLockfile } from "../../../packages/runtime-bundle/src/signature.ts";
const mode = process.argv[2] || "check";
if (mode === "hash") {
  console.log(JSON.stringify(buildHashLockfile(process.cwd(), process.argv.slice(3)), null, 2));
} else {
  const r = signatureSelfCheck({
    bundleRoot: process.cwd(),
    platform: process.platform,
    signToolPath: process.env.HAWKNEXT_SIGNTOOL || null,
    appEntry: process.env.HAWKNEXT_APP_ENTRY || undefined,
  });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}
`;
    if (!DRY) writeFileSync(SIGN_STUB, stub, { mode: 0o755 });
    console.log("[signing] wrote runtime/signing/self-check.mjs");
  }

  const manifest = {
    schemaVersion: 1,
    os: OS,
    arch: ARCH,
    fetchedAt: new Date().toISOString(),
    tools: lock,
    notes: [
      "signtool: install Windows SDK or set HAWKNEXT_SIGNTOOL; SmartScreen requires Authenticode before release",
      "extract archives into runtime/<family>/bin and re-run packages/runtime-bundle self-check",
    ],
  };
  const lockPath = join(ROOT, "runtime/manifests/fetch-lock.json");
  ensureDir(dirname(lockPath));
  if (!DRY) writeFileSync(lockPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("lockfile", lockPath);

  // optional extract helper note
  console.log("next: extract archives, then");
  console.log("  node packages/runtime-bundle/scripts/self-check.mjs .");
  if (process.env.HAWKNEXT_NO_7Z !== "1" && OS === "win32" && !DRY) {
    console.log("hint: 7zr.exe + 7z-extra.7z under runtime/archive for unpacking .7z");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
