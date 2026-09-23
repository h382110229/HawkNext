#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tokensToCssBlock } from "../src/tokens.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, "..", "..", "..", "assets", "hawk-ui", "tokens.css");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, tokensToCssBlock() + "\n", "utf8");
console.log("wrote", out);
