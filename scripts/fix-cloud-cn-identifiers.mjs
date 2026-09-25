#!/usr/bin/env node
/**
 * Repair rebrand damage: bare `bigmodel` → `cloud-cn` produced invalid JS identifiers.
 * Rename identifier-position `cloud-cn` → `cloudCn` ONLY outside string/template/comment.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.argv[2] || "D:/AIProject/HawkNext/vendor/zcode";
const SKIP = new Set([".git", "node_modules", "dist", "out", "coverage", ".turbo", "build", "release", ".tmp"]);
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && EXT.has(extname(e.name))) out.push(p);
  }
  return out;
}

/**
 * Scan JS/TS source and rewrite identifier-position `cloud-cn` → `cloudCn`.
 * Strings (' " `), comments (// /* *\/), and regex literals are left alone.
 * Inside templates, `${...}` expressions are rewritten.
 */
function fixFile(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  let mode = "code"; // code | line | block | single | double | template
  let templateExprDepth = 0; // >0 means we're in ${} of a template

  const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (mode === "code" || templateExprDepth > 0) {
      // comments
      if (c === "/" && c2 === "/") {
        mode = "line";
        out.push(c, c2);
        i += 2;
        continue;
      }
      if (c === "/" && c2 === "*") {
        mode = "block";
        out.push(c, c2);
        i += 2;
        continue;
      }
      // strings
      if (c === "'") {
        mode = "single";
        out.push(c);
        i++;
        continue;
      }
      if (c === '"') {
        mode = "double";
        out.push(c);
        i++;
        continue;
      }
      if (c === "`") {
        mode = "template";
        out.push(c);
        i++;
        continue;
      }
      // identifier rewrite: cloud-cn (not part of a longer ident start before)
      if (
        c === "c" &&
        src.startsWith("cloud-cn", i) &&
        !isIdentChar(src[i - 1] ?? "") &&
        // don't touch if inside a longer word after: cloud-cnFoo is still identifier (rewrite), cloud-cn-foo?
        true
      ) {
        const after = src[i + 8] ?? "";
        // Always rewrite `cloud-cn` when it appears as an identifier token:
        // - end of ident (after is not ident char) → cloudCn
        // - followed by uppercase (camel compound) → cloudCn + upper
        // - followed by more lowercase/hyphen would be weird; still rewrite hyphen-free form
        if (!isIdentChar(after) || (after >= "A" && after <= "Z")) {
          out.push("cloudCn");
          i += 8;
          continue;
        }
        // cloud-cnxxx (lowercase continuation) — still an invalid ident; rewrite to cloudCnxxx
        out.push("cloudCn");
        i += 8;
        continue;
      }
      out.push(c);
      i++;
      continue;
    }

    if (mode === "line") {
      out.push(c);
      if (c === "\n") mode = templateExprDepth > 0 ? "code" : "code";
      i++;
      continue;
    }
    if (mode === "block") {
      out.push(c);
      if (c === "*" && c2 === "/") {
        out.push(c2);
        i += 2;
        mode = "code";
        continue;
      }
      i++;
      continue;
    }
    if (mode === "single") {
      out.push(c);
      if (c === "\\") {
        out.push(c2 ?? "");
        i += 2;
        continue;
      }
      if (c === "'") mode = "code";
      i++;
      continue;
    }
    if (mode === "double") {
      out.push(c);
      if (c === "\\") {
        out.push(c2 ?? "");
        i += 2;
        continue;
      }
      if (c === '"') mode = "code";
      i++;
      continue;
    }
    if (mode === "template") {
      out.push(c);
      if (c === "\\") {
        out.push(c2 ?? "");
        i += 2;
        continue;
      }
      if (c === "`") {
        mode = "code";
        i++;
        continue;
      }
      if (c === "$" && c2 === "{") {
        out.push(c2);
        i += 2;
        templateExprDepth++;
        mode = "code"; // parse expression in code mode
        continue;
      }
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

// Track templateExprDepth exit: when we see `}` in code mode and depth>0, decrement.
// The loop above doesn't handle `}` closing ${}. Wrap fixFile with a proper closer.

function fixFileWithTemplateExpr(src) {
  // Simpler: two-pass — only rewrite outside quotes using a line-based heuristic is fragile.
  // Use a stack for template expressions.
  const out = [];
  let i = 0;
  const n = src.length;
  let mode = "code";
  const stack = []; // "template" entries to know we're in template body vs expr

  const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);

  function push(s) {
    out.push(s);
  }

  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];

    if (mode === "code") {
      if (c === "/" && c2 === "/") {
        push(c + c2);
        i += 2;
        mode = "line";
        continue;
      }
      if (c === "/" && c2 === "*") {
        push(c + c2);
        i += 2;
        mode = "block";
        continue;
      }
      if (c === "'") {
        push(c);
        i++;
        mode = "single";
        continue;
      }
      if (c === '"') {
        push(c);
        i++;
        mode = "double";
        continue;
      }
      if (c === "`") {
        push(c);
        i++;
        stack.push("template");
        mode = "template";
        continue;
      }
      if (c === "{" && stack[stack.length - 1] === "expr") {
        stack.push("expr");
        push(c);
        i++;
        continue;
      }
      if (c === "}" && stack.length && stack[stack.length - 1] === "expr") {
        stack.pop();
        push(c);
        i++;
        if (stack[stack.length - 1] === "template") mode = "template";
        continue;
      }
      // identifier cloud-cn
      if (c === "c" && src.startsWith("cloud-cn", i) && !isIdentChar(src[i - 1] ?? "")) {
        push("cloudCn");
        i += 8;
        continue;
      }
      push(c);
      i++;
      continue;
    }

    if (mode === "line") {
      push(c);
      if (c === "\n") mode = "code";
      i++;
      continue;
    }
    if (mode === "block") {
      if (c === "*" && c2 === "/") {
        push(c + c2);
        i += 2;
        mode = "code";
        continue;
      }
      push(c);
      i++;
      continue;
    }
    if (mode === "single" || mode === "double") {
      const q = mode === "single" ? "'" : '"';
      if (c === "\\") {
        push(c + (c2 ?? ""));
        i += 2;
        continue;
      }
      push(c);
      if (c === q) mode = "code";
      i++;
      continue;
    }
    if (mode === "template") {
      if (c === "\\") {
        push(c + (c2 ?? ""));
        i += 2;
        continue;
      }
      if (c === "`") {
        push(c);
        i++;
        stack.pop();
        mode = "code";
        continue;
      }
      if (c === "$" && c2 === "{") {
        push("${");
        i += 2;
        stack.push("expr");
        mode = "code";
        continue;
      }
      push(c);
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

let changed = 0;
let scanned = 0;
const changedFiles = [];
for (const f of walk(ROOT)) {
  scanned++;
  const before = readFileSync(f, "utf8");
  if (!before.includes("cloud-cn")) continue;
  const after = fixFileWithTemplateExpr(before);
  if (after !== before) {
    writeFileSync(f, after, "utf8");
    changed++;
    changedFiles.push(f);
  }
}
console.log(`fix-cloud-cn-identifiers: scanned=${scanned} changed=${changed}`);
for (const f of changedFiles.slice(0, 30)) console.log(" ", f);
if (changedFiles.length > 30) console.log(`  … +${changedFiles.length - 30} more`);
