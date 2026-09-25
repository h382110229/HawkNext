#!/usr/bin/env node
/**
 * Repair rebrand identifier damage for hyphenated names that are invalid JS identifiers:
 *   cloud-cn*  (from bigmodel→cloud-cn)
 *   official-model* / official-account*  (from openai/chatgpt)
 * Rewrite identifier-position tokens to camelCase. Leave quoted string literals alone.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.argv[2] || "D:/AIProject/HawkNext/vendor/zcode";
const SKIP = new Set([".git", "node_modules", "dist", "out", "coverage", ".turbo", "build", "release", ".tmp"]);
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// hyphenated source tokens → camel replacement (without trailing compound)
const TOKENS = ["cloud-cn", "official-model", "official-account"];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && EXT.has(extname(e.name))) out.push(p);
  }
  return out;
}

function camelFromHyphen(token) {
  return token.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function fixFile(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  let mode = "code";
  const stack = [];
  const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);
  const camelMap = new Map(TOKENS.map((t) => [t, camelFromHyphen(t)]));

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (mode === "code") {
      if (c === "/" && c2 === "/") {
        out.push(c + c2);
        i += 2;
        mode = "line";
        continue;
      }
      if (c === "/" && c2 === "*") {
        out.push(c + c2);
        i += 2;
        mode = "block";
        continue;
      }
      if (c === "'") {
        out.push(c);
        i++;
        mode = "single";
        continue;
      }
      if (c === '"') {
        out.push(c);
        i++;
        mode = "double";
        continue;
      }
      if (c === "`") {
        out.push(c);
        i++;
        stack.push("template");
        mode = "template";
        continue;
      }
      if (c === "{" && stack[stack.length - 1] === "expr") {
        stack.push("expr");
        out.push(c);
        i++;
        continue;
      }
      if (c === "}" && stack.length && stack[stack.length - 1] === "expr") {
        stack.pop();
        out.push(c);
        i++;
        if (stack[stack.length - 1] === "template") mode = "template";
        continue;
      }
      // identifier tokens
      if (!isIdentChar(src[i - 1] ?? "")) {
        let matched = false;
        for (const [tok, camel] of camelMap) {
          if (src.startsWith(tok, i)) {
            out.push(camel);
            i += tok.length;
            matched = true;
            break;
          }
        }
        if (matched) continue;
      }
      out.push(c);
      i++;
      continue;
    }

    if (mode === "line") {
      out.push(c);
      if (c === "\n") mode = "code";
      i++;
      continue;
    }
    if (mode === "block") {
      if (c === "*" && c2 === "/") {
        out.push(c + c2);
        i += 2;
        mode = "code";
        continue;
      }
      out.push(c);
      i++;
      continue;
    }
    if (mode === "single" || mode === "double") {
      const q = mode === "single" ? "'" : '"';
      if (c === "\\") {
        out.push(c + (c2 ?? ""));
        i += 2;
        continue;
      }
      out.push(c);
      if (c === q) mode = "code";
      i++;
      continue;
    }
    if (mode === "template") {
      if (c === "\\") {
        out.push(c + (c2 ?? ""));
        i += 2;
        continue;
      }
      if (c === "`") {
        out.push(c);
        i++;
        stack.pop();
        mode = "code";
        continue;
      }
      if (c === "$" && c2 === "{") {
        out.push("${");
        i += 2;
        stack.push("expr");
        mode = "code";
        continue;
      }
      out.push(c);
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

let scanned = 0;
let changed = 0;
const changedFiles = [];
for (const f of walk(ROOT)) {
  scanned++;
  const before = readFileSync(f, "utf8");
  if (!/cloud-cn|official-model|official-account/.test(before)) continue;
  const after = fixFile(before);
  if (after !== before) {
    writeFileSync(f, after, "utf8");
    changed++;
    changedFiles.push(f);
  }
}
console.log(`fix-hyphen-identifiers: scanned=${scanned} changed=${changed}`);
for (const f of changedFiles.slice(0, 40)) console.log(" ", f);
if (changedFiles.length > 40) console.log(`  … +${changedFiles.length - 40} more`);
