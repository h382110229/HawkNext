#!/usr/bin/env node
/**
 * HawkNext Windows 安装包 Authenticode 实签 + 自检。
 *
 * 用法：
 *   node scripts/sign-win-installer.mjs <setup.exe> [--pfx <path>] [--pass <password>] [--dry-run]
 *
 * 凭据来源（优先级）：
 *   1. --pfx / --pass
 *   2. env WIN_CSC_LINK + WIN_CSC_KEY_PASSWORD（或 CSC_LINK / CSC_KEY_PASSWORD）
 *   3. 证书库 Subject（env HAWKNEXT_CERT_SUBJECT）
 *
 * 签名后：
 *   - Get-AuthenticodeSignature 验证
 *   - 可选：对照 runtime-bundle hash lockfile
 *
 * 铁律：密码不落盘、不写仓库；失败 exit 1。
 */
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultSignTool = resolve(repoRoot, "runtime/signing/signtool.exe");

function parseArgs(argv) {
  const out = { target: null, pfx: null, pass: null, dryRun: false, subject: null, signTool: null, timestamp: "http://timestamp.digicert.com" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pfx") out.pfx = argv[++i];
    else if (a === "--pass") out.pass = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--subject") out.subject = argv[++i];
    else if (a === "--signtool") out.signTool = argv[++i];
    else if (a === "--timestamp") out.timestamp = argv[++i];
    else if (!a.startsWith("--") && !out.target) out.target = a;
    else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

function requireFile(path, label) {
  if (!path || !existsSync(path)) {
    console.error(`[sign] missing ${label}: ${path ?? "(none)"}`);
    process.exit(1);
  }
  return resolve(path);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", encoding: "utf8", ...opts });
  if (r.status !== 0) {
    console.error(`[sign] command failed (${r.status}): ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
  return r;
}

function resolveCredentials(args) {
  const pfx = args.pfx || process.env.WIN_CSC_LINK || process.env.CSC_LINK || null;
  const pass = args.pass ?? process.env.WIN_CSC_KEY_PASSWORD ?? process.env.CSC_KEY_PASSWORD ?? null;
  const subject = args.subject || process.env.HAWKNEXT_CERT_SUBJECT || null;
  return { pfx, pass, subject };
}

function verifyAuthenticode(targetPath) {
  const ps = [
    "-NoProfile",
    "-Command",
    `$s = Get-AuthenticodeSignature -FilePath '${targetPath.replace(/'/g, "''")}';`,
    `Write-Host ('STATUS=' + $s.Status);`,
    `if ($s.SignerCertificate) { Write-Host ('SUBJECT=' + $s.SignerCertificate.Subject); Write-Host ('THUMB=' + $s.SignerCertificate.Thumbprint) };`,
    `if ($s.Status -ne 'Valid') { exit 1 }`,
  ].join(" ");
  const r = spawnSync("powershell.exe", ["-NoProfile", "-Command", ps], { encoding: "utf8", stdio: "inherit" });
  return r.status === 0;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.target) {
    console.error("usage: node scripts/sign-win-installer.mjs <setup.exe> [--pfx cert.pfx] [--pass ****]");
    process.exit(2);
  }

  const target = requireFile(args.target, "installer exe");
  const sizeMb = (statSync(target).size / (1024 * 1024)).toFixed(1);
  console.log(`[sign] target: ${target} (${sizeMb} MB)`);

  const signTool = requireFile(args.signTool || defaultSignTool, "signtool");
  const { pfx, pass, subject } = resolveCredentials(args);

  if (!pfx && !subject) {
    console.error("[sign] 未提供代码签名证书。");
    console.error("  需要 OV/EV Authenticode 证书（SmartScreen 姿态）。");
    console.error("  方式 A: --pfx cert.pfx --pass ****  或 env WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD");
    console.error("  方式 B: --subject 'CN=Your Org'  （证书已装入证书库）");
    console.error("  详见 docs/p0-installer-signing.md");
    process.exit(1);
  }

  const signArgs = [
    "sign",
    "/fd", "SHA256",
    "/td", "SHA256",
    "/tr", args.timestamp,
  ];

  if (pfx) {
    const pfxPath = requireFile(pfx, "pfx");
    signArgs.push("/f", pfxPath);
    if (pass) signArgs.push("/p", pass);
  } else {
    signArgs.push("/n", subject);
  }

  signArgs.push(target);

  if (args.dryRun) {
    console.log("[sign] dry-run:", signTool, signArgs.map((a) => (a === pass ? "***" : a)).join(" "));
    process.exit(0);
  }

  if (!pfx && !existsSync(signTool)) {
    // 证书库签名可走系统 signtool
    console.log("[sign] using bundled signtool");
  }

  console.log("[sign] Authenticode signing…");
  run(signTool, signArgs);

  console.log("[sign] verify Get-AuthenticodeSignature…");
  const ok = verifyAuthenticode(target);
  if (!ok) {
    console.error("[sign] signature verify FAILED");
    process.exit(1);
  }

  console.log(`[sign] OK  ${basename(target)}`);
  console.log("[sign] SmartScreen: OV 需积累信誉；EV 可缩短提示。发布前建议再跑 runtime-bundle self-check。");
}

main();
