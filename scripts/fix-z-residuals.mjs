import { readFileSync, writeFileSync } from "node:fs";

const files = [
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/components/ui/HawkNextAboutLogo.tsx",
  "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/root/RootStartupLoading.tsx",
];

const hPaths = `      {/* HawkNext H monogram */}
      <path fill="currentColor" d="M28 18h42v68h78V18h42v182h-42v-72H70v72H28V18z" />
      <path fill="currentColor" opacity="0.35" d="M28 18h42v28H28V18zm120 138h42v44h-42v-44z" />`;

for (const p of files) {
  let t = readFileSync(p, "utf8");
  if (t.includes("M28 18h42")) {
    console.log("ok already", p);
    continue;
  }
  // Replace from first Z path through last of the three Z paths
  const re =
    /\s*<path\s+fill="currentColor"\s+d="M134\.4 0\.130152[\s\S]*?d="M121\.601 217\.732[\s\S]*?\/>/;
  if (!re.test(t)) {
    console.log("NO MATCH", p);
    continue;
  }
  t = t.replace(re, "\n" + hPaths);
  writeFileSync(p, t);
  console.log("replaced", p);
}

// Z Code string residuals
const header = "D:/AIProject/HawkNext/vendor/zcode/packages/shared/src/hawknext-source-headers.ts";
let ht = readFileSync(header, "utf8");
ht = ht.replaceAll('Z Code@electron', 'HawkNext@electron');
ht = ht.replaceAll('Z Code@${sourceTitle}', 'HawkNext@${sourceTitle}');
writeFileSync(header, ht);
console.log("headers fixed");

const mainIdx = "D:/AIProject/HawkNext/vendor/zcode/packages/desktop/src/main/index.ts";
let mi = readFileSync(mainIdx, "utf8");
mi = mi.replaceAll("确认退出 Z Code?", "确认退出 HawkNext?");
mi = mi.replaceAll("Quit Z Code?", "Quit HawkNext?");
writeFileSync(mainIdx, mi);
console.log("quit dialog fixed");
