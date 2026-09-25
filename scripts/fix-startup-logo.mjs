import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/root/RootStartupLoading.tsx";
let t = readFileSync(p, "utf8");

// Replace ZCode Z-mark paths with a HawkNext "H" monogram.
const oldPaths = `      <path
        fill="currentColor"
        d="M134.4 0.130152L116.48 25.6022C113.665 29.5699 109.054 32.0019 104.064 32.0019H6.3999V0C6.3999 0.130149 134.4 0.130152 134.4 0.130152Z"
      />
      <path fill="currentColor" d="M256 0.130127L102.401 217.732H0L153.599 0.130127H256Z" />
      <path
        fill="currentColor"
        d="M121.601 217.732L139.65 192.134C142.465 188.166 147.076 185.734 152.067 185.734H249.604V217.736H121.601V217.732Z"
      />`;

const newPaths = `      {/* HawkNext H monogram (replaces residual Z mark) */}
      <path fill="currentColor" d="M28 18h42v68h78V18h42v182h-42v-72H70v72H28V18z" />
      <path fill="currentColor" opacity="0.35" d="M28 18h42v28H28V18zm120 138h42v44h-42v-44z" />`;

if (t.includes("HawkNext H monogram")) {
  console.log("logo already replaced");
} else if (t.includes("M134.4 0.130152")) {
  t = t.replace(oldPaths, newPaths);
  writeFileSync(p, t);
  console.log("logo replaced");
} else {
  console.log("PATTERN NOT FOUND");
  const i = t.indexOf("fill=\"currentColor\"");
  console.log(t.slice(Math.max(0, i - 80), i + 400));
}
