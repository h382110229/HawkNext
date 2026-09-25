import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/packages/desktop/src/main/aboutWindow.ts";
let t = readFileSync(p, "utf8");
const re =
  /\s*<path\s+fill="currentColor"\s+d="M134\.4 0\.130152[\s\S]*?d="M121\.601 217\.732[\s\S]*?\/>/;
const hPaths = `
              {/* HawkNext H monogram */}
              <path fill="currentColor" d="M28 18h42v68h78V18h42v182h-42v-72H70v72H28V18z" />
              <path fill="currentColor" opacity="0.35" d="M28 18h42v28H28V18zm120 138h42v44h-42v-44z" />`;
if (t.includes("M28 18h42")) {
  console.log("already");
} else if (re.test(t)) {
  t = t.replace(re, hPaths);
  writeFileSync(p, t);
  console.log("aboutWindow logo replaced");
} else {
  console.log("no match");
}
