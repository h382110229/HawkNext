#!/usr/bin/env node
/**
 * Fix rebrand-emptied URLs in hawknext-builtin.json so z.string().url() passes.
 * Relative paths get a non-official host prefix; empty-host https:/// becomes llmapi host.
 * Iron rule: never point at api.openai.com / z.ai / bigmodel.cn silently.
 */
import { readFileSync, writeFileSync } from "node:fs";

const path =
  process.argv[2] || "D:/AIProject/HawkNext/vendor/zcode/config/provider/hawknext-builtin.json";
const SAFE = "https://llmapi.hawkren.online";

function fixUrl(u) {
  if (typeof u !== "string") return u;
  if (u.startsWith("/") && !u.startsWith("//")) return SAFE + u;
  if (/^https?:\/\/\//.test(u)) {
    // https:///path → https://host/path
    return u.replace(/^(https?:\/\/)\/+/, `$1${new URL(SAFE).host}/`);
  }
  if (u === "" || u === "https://" || u === "http://") return SAFE;
  // already absolute with host
  try {
    // eslint-disable-next-line no-new
    new URL(u);
    return u;
  } catch {
    return SAFE;
  }
}

function walk(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(walk);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if ((k === "baseUrl" || k === "fallbackBaseUrl" || k === "apiKeyManagementUrl") && typeof v === "string") {
        obj[k] = fixUrl(v);
      } else {
        walk(v);
      }
    }
  }
}

const raw = readFileSync(path, "utf8");
const json = JSON.parse(raw);
walk(json);
writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
console.log("fixed urls in", path);
