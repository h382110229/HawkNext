#!/usr/bin/env node
// HawkNext Rebrand Wave 1 - docs/rebrand-checklist.md S1-S5
import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from "node:fs";
import { join, relative, dirname, basename } from "node:path";

const ROOT = process.argv[2] || "D:/AIProject/HawkNext/vendor/zcode";
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "out", "coverage", ".turbo", ".cache"]);
const SKIP_EXT = new Set([".png",".jpg",".jpeg",".gif",".webp",".ico",".icns",".pdf",".zip",".gz",".tgz",".woff",".woff2",".ttf",".otf",".eot",".mp3",".mp4",".wasm",".node",".map"]);
const EXEMPT_RE = /(^|\/)(LICENSE|NOTICE|THIRD-PARTY-NOTICES)(\.|$)/i;
const NUL = String.fromCharCode(0);

function isText(p) {
  const base = basename(p);
  const lower = base.toLowerCase();
  if (lower === "license" || lower.startsWith("license.")) return true;
  if (lower === "notice" || lower.startsWith("notice.")) return true;
  const named = ["Dockerfile","Makefile","README","README.md","README.en.md","AGENTS.md","CONTEXT.md","DESIGN.md","mise.toml",".env",".env.example",".env.development",".env.production",".npmrc",".nvmrc",".gitignore",".gitattributes",".prettierignore",".oxfmtrc.json",".oxlintrc.json",".dockerignore","pnpm-lock.yaml","package.json","knip.json","tsconfig.base.json","architecture-policy.yaml",".architecture-baseline.json",".release-it.mjs"];
  if (named.includes(base)) return true;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = base.slice(dot).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  return /\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|toml|txt|css|scss|html|svg|sh|bat|ps1|plist|desktop|xml|lock|env|example)$/i.test(base);
}

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function walkDirs(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { walkDirs(p, out); out.push(p); }
  }
  return out;
}

function renamePart(name) {
  return name.replaceAll("ZCODE","HAWKNEXT").replaceAll("ZCode","HawkNext").replaceAll("zCode","hawkNext").replaceAll("zcode","hawknext");
}

function phaseRename(root) {
  const files = walk(root).sort((a, b) => b.length - a.length);
  let n = 0;
  for (const f of files) {
    const nb = renamePart(basename(f));
    if (nb === basename(f)) continue;
    try { renameSync(f, join(dirname(f), nb)); n++; } catch (e) { console.error("file", f, e.message); }
  }
  const dirs = walkDirs(root).sort((a, b) => b.length - a.length);
  for (const d of dirs) {
    const nb = renamePart(basename(d));
    if (nb === basename(d)) continue;
    try { renameSync(d, join(dirname(d), nb)); n++; } catch (e) { console.error("dir", d, e.message); }
  }
  console.log("[phase1] renamed", n, "paths");
}

const R = [
  ["client_P8X5CMWmlaRO9gyO-KSqtg", ""],
  ["https://cdn-zcode.z.ai", ""],
  ["http://cdn-zcode.z.ai", ""],
  ["https://zcode.z.ai/cn/share", ""],
  ["https://zcode.z.ai", ""],
  ["http://zcode.z.ai", ""],
  ["https://chat.z.ai", ""],
  ["http://chat.z.ai", ""],
  ["https://api.z.ai", ""],
  ["http://api.z.ai", ""],
  ["https://open.bigmodel.cn", ""],
  ["https://bigmodel.cn", ""],
  ["http://bigmodel.cn", ""],
  ["https://releases.openai.com", ""],
  ["https://api.openai.com", ""],
  ["https://auth.openai.com", ""],
  ["https://chatgpt.com", ""],
  ["http://chatgpt.com", ""],
  ["api.openai.com", ""],
  ["auth.openai.com", ""],
  ["chatgpt.com", ""],
  ["releases.openai.com", ""],
  ["cdn-zcode.z.ai", ""],
  ["zcode.z.ai", ""],
  ["chat.z.ai", ""],
  ["api.z.ai", ""],
  ["bigmodel.cn", ""],
  ["z.ai", ""],
  ["Z.AI", ""],
  ["Z.ai", ""],
  ["ChatGPT", "OfficialAccount"],
  ["chatgpt", "official-account"],
  ["OpenAI", "OfficialModel"],
  ["openai", "official-model"],
  ["OPENAI_", "OFFICIAL_MODEL_"],
  ["BIGMODEL_PROVIDER_ID", "CLOUD_CN_PROVIDER_ID"],
  ["BIGMODEL_API_BASE_URL", "CLOUD_CN_API_BASE_URL"],
  ["BigModel", "CloudCN"],
  ["bigModel", "cloudCn"],
  ["BIGMODEL", "CLOUD_CN"],
  ["bigmodelCodingPlan", "cloudCnCodingPlan"],
  ["BigmodelCodingPlan", "CloudCnCodingPlan"],
  ["bigmodel", "cloud-cn"],
  ["isZaiCodingPlanProviderId", "isCloudCodingPlanProviderId"],
  ["ZAI_PROVIDER_ID", "CLOUD_INTL_PROVIDER_ID"],
  ["ZAI_OAUTH_ORIGIN", "CLOUD_INTL_OAUTH_ORIGIN"],
  ["ZAI_OAUTH_CLIENT_ID", "CLOUD_INTL_OAUTH_CLIENT_ID"],
  ["ZAI_BUSINESS_BASE_URL", "CLOUD_INTL_BUSINESS_BASE_URL"],
  ["ZAI_ACCESS_TOKEN_KEY", "CLOUD_INTL_ACCESS_TOKEN_KEY"],
  ["ZAI_USER_INFO_KEY", "CLOUD_INTL_USER_INFO_KEY"],
  ["WebZaiOAuth", "WebCloudOAuth"],
  ["webZaiOAuth", "webCloudOAuth"],
  ["ZaiOAuth", "CloudOAuth"],
  ["zaiOAuth", "cloudOAuth"],
  ["zaiWebOAuth", "cloudWebOAuth"],
  ["ZaiWebOAuth", "CloudWebOAuth"],
  ["normalizeZaiOAuthOrigin", "normalizeCloudOAuthOrigin"],
  ["ZaiCodingPlan", "CloudCodingPlan"],
  ["zaiCodingPlan", "cloudCodingPlan"],
  ["zaiAccessToken", "cloudAccessToken"],
  ["ZaiAccessToken", "CloudAccessToken"],
  ["oauth:zai:", "oauth:cloud-intl:"],
  ["oauth:bigmodel:", "oauth:cloud-cn:"],
  ["zcodejwttoken", "hawknext-jwt"],
  ["zaijwttoken", "hawknext-jwt"],
  ["apps/zcode-cli", "apps/hawknext-cli"],
  ["packages/zcode-server-cli", "packages/hawknext-server-cli"],
  ["zcode-protocol-v4", "hawknext-protocol-v4"],
  ["zcode-protocol", "hawknext-protocol"],
  ["zcode-distribution-smoke", "hawknext-distribution-smoke"],
  ["zcode-distribution", "hawknext-distribution"],
  ["build-zcode.mjs", "build-hawknext.mjs"],
  ["build-zcode", "build-hawknext"],
  ["@zcode/", "@hawknext/"],
  ["@zcode", "@hawknext"],
  ["ZCODE", "HAWKNEXT"],
  ["ZCode", "HawkNext"],
  ["zCode", "hawkNext"],
  ["zcode", "hawknext"],
];

function phaseContent(root) {
  const files = walk(root);
  let changed = 0;
  for (const f of files) {
    if (!isText(f)) continue;
    const exempt = EXEMPT_RE.test(f.replace(/\\/g, "/"));
    let raw;
    try { raw = readFileSync(f, "utf8"); } catch { continue; }
    if (raw.includes(NUL)) continue;
    let next = raw;
    const list = exempt
      ? R.filter(([from]) => from.includes("http") || from.includes("client_P8") || from.includes(".z.") || from.includes("bigmodel.cn") || from.includes("openai.com") || from.includes("chatgpt"))
      : R;
    for (const [from, to] of list) {
      if (from && next.includes(from)) next = next.split(from).join(to);
    }
    if (next !== raw) { writeFileSync(f, next, "utf8"); changed++; }
  }
  console.log("[phase2] content changed", changed, "files");
}

function patchFile(root, rel, fn) {
  const p = join(root, rel);
  if (!existsSync(p)) { console.warn("[phase3] missing", rel); return; }
  const raw = readFileSync(p, "utf8");
  const next = fn(raw);
  if (next !== raw) { writeFileSync(p, next, "utf8"); console.log("[phase3] patched", rel); }
  else console.log("[phase3] unchanged", rel);
}

const ARMS_STUB = [
  "// HAWK_NEXT_TELEMETRY_OFF",
  "const armsRum = {",
  "  init: async () => undefined,",
  "  setConfig: () => undefined,",
  "  sendCustom: () => undefined,",
  "  sendEvent: () => undefined,",
  "  getConfig: () => ({ env: 'local' }),",
  "  client: { useReporter: (r) => r },",
  "};",
].join("\n");

function phaseTargeted(root) {
  patchFile(root, "packages/shared/src/oauth.ts", (s) => {
    s = s.split('export const CLOUD_CN_PROVIDER_ID = "bigmodel" as const;').join('export const CLOUD_CN_PROVIDER_ID = "disabled-cloud-cn" as const;');
    s = s.split('export const CLOUD_CN_PROVIDER_ID = "cloud-cn" as const;').join('export const CLOUD_CN_PROVIDER_ID = "disabled-cloud-cn" as const;');
    s = s.split('export const CLOUD_INTL_PROVIDER_ID = "zai" as const;').join('export const CLOUD_INTL_PROVIDER_ID = "disabled-cloud-intl" as const;');
    s = s.split('export const CLOUD_INTL_PROVIDER_ID = "cloud-intl" as const;').join('export const CLOUD_INTL_PROVIDER_ID = "disabled-cloud-intl" as const;');
    return s;
  });

  for (const envFile of [".env.example", ".env.development", ".env.production", ".env"]) {
    patchFile(root, envFile, (s) => s.replace(/^(HAWKNEXT_BASE_URL|CLOUD_CN_API_BASE_URL|CLOUD_INTL_OAUTH_ORIGIN|CLOUD_INTL_BUSINESS_BASE_URL|CLOUD_INTL_OAUTH_CLIENT_ID|HAWKNEXT_CDN_BASE_URL|HAWKNEXT_CONVERSATION_SHARE_WEB_URL|HAWKNEXT_REMOTE_ASSET_CDN_BASE_URL)=.*$/gm, "$1="));
  }

  patchFile(root, "packages/desktop/src/main/desktopDeepLinkUrl.ts", (s) =>
    s.replace(/const DEEP_LINK_SCHEME = ".*";/, 'const DEEP_LINK_SCHEME = "hawknext";'));

  patchFile(root, "packages/desktop/src/main/desktopLinuxDeepLinkRegistration.ts", (s) =>
    s.replace(/params\.productName \?\? ".*"/, 'params.productName ?? "HawkNext"'));

  patchFile(root, "packages/web/src/share/ConversationShareLandingPage.tsx", (s) =>
    s.replace(/const (HAWKNEXT_)?DOWNLOAD_URL = ".*";/, 'const HAWKNEXT_DOWNLOAD_URL = "";'));

  patchFile(root, "packages/web/src/communityUrl.ts", (s) => {
    if (s.includes("HAWK_NEXT_COMMUNITY_CUT")) return s;
    return s.replace(/(export async function resolveWebCommunityUrl\b[^{]*\{\n)/, "$1  /* HAWK_NEXT_COMMUNITY_CUT */\n  return null;\n");
  });

  for (const rel of [
    "packages/desktop/src/main/index.ts",
    "packages/desktop/src/main/desktopZCodeDataSizeTelemetry.ts",
    "packages/desktop/src/main/desktopHawkNextDataSizeTelemetry.ts",
    "packages/desktop/src/main/desktopStabilityTelemetry.ts",
    "packages/desktop/src/main/desktopResourceTelemetry.ts",
    "packages/desktop/src/main/desktopNetworkTelemetry.ts",
    "packages/desktop/src/main/desktopMcpTelemetry.ts",
    "packages/desktop/src/main/desktopMainIpcRemote.ts",
    "packages/desktop/src/main/databaseStartupTelemetry.ts",
    "packages/desktop/src/main/appARMSBootstrap.ts",
  ]) {
    patchFile(root, rel, (s) => s.replace(/import armsRum from "@arms\/rum-electron";/, ARMS_STUB));
  }

  patchFile(root, "packages/desktop/src/main/appARMSBootstrap.ts", (s) => {
    if (s.includes("HAWK_NEXT_TELEMETRY_OFF_BOOT")) return s;
    return s.replace(/(export async function )/, "/* HAWK_NEXT_TELEMETRY_OFF_BOOT */\nexport async function telemetryDisabledBootstrap() {\n  return { ok: true, disabled: true };\n}\n\n$1");
  });

  patchFile(root, "packages/web/src/main.tsx", (s) => {
    if (s.includes("HAWK_NEXT_TELEMETRY_OFF")) return s;
    return s.replace(/reportTelemetryEvent: async \(\) => \{\},/, "reportTelemetryEvent: async () => {\n      /* HAWK_NEXT_TELEMETRY_OFF */\n    },");
  });

  patchFile(root, "packages/desktop/package.json", (s) =>
    s.replace(/"productName": ".*"/, '"productName": "HawkNext"'));

  console.log("[phase3] targeted cuts done");
}

function phaseScan(root) {
  const pattern = /zcode|z\.ai|chatgpt|openai\.com|cdn-zcode|bigmodel/i;
  const files = walk(root);
  const hits = [];
  for (const f of files) {
    if (!isText(f)) continue;
    const rel = relative(root, f).replace(/\\/g, "/");
    if (EXEMPT_RE.test(rel)) continue;
    let raw;
    try { raw = readFileSync(f, "utf8"); } catch { continue; }
    const lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) hits.push({ file: rel, line: i + 1, text: lines[i].trim().slice(0, 160) });
    }
  }
  console.log("[phase4] residual hits:", hits.length);
  const byFile = new Map();
  for (const h of hits) byFile.set(h.file, (byFile.get(h.file) || 0) + 1);
  const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);
  for (const [f, n] of top) console.log(" ", n, f);
  writeFileSync(join(root, "rebrand-wave1-residual.json"), JSON.stringify({ total: hits.length, hits: hits.slice(0, 3000) }, null, 2));
  return hits.length;
}

console.log("[rebrand-wave1] root =", ROOT);
phaseRename(ROOT);
phaseContent(ROOT);
phaseContent(ROOT);
phaseTargeted(ROOT);
const residual = phaseScan(ROOT);
console.log("[rebrand-wave1] DONE residual =", residual);
