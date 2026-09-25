import { readFileSync, writeFileSync } from "node:fs";

// 1) HawkNextAboutLogo — same Z paths as RootStartupLoading
const about = "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/components/ui/HawkNextAboutLogo.tsx";
let t = readFileSync(about, "utf8");
const zPaths = `      <path
        fill="currentColor"
        d="M134.4 0.130152L116.48 25.6022C113.665 29.5699 109.054 32.0019 104.064 32.0019H6.3999V0C6.3999 0.130149 134.4 0.130152 134.4 0.130152Z"
      />
      <path fill="currentColor" d="M256 0.130127L102.401 217.732H0L153.599 0.130127H256Z" />
      <path
        fill="currentColor"
        d="M121.601 217.732L139.65 192.134C142.465 188.166 147.076 185.734 152.067 185.734H249.604V217.736H121.601V217.732Z"
      />`;
const hPaths = `      {/* HawkNext H monogram */}
      <path fill="currentColor" d="M28 18h42v68h78V18h42v182h-42v-72H70v72H28V18z" />
      <path fill="currentColor" opacity="0.35" d="M28 18h42v28H28V18zm120 138h42v44h-42v-44z" />`;
if (t.includes("HawkNext H monogram")) {
  console.log("about logo already ok");
} else if (t.includes("M134.4 0.130152")) {
  t = t.replace(zPaths, hPaths);
  writeFileSync(about, t);
  console.log("about logo replaced");
} else {
  console.log("about logo pattern missing");
}

// 2) logo-zai.svg — replace Z mark with rounded H badge (used by Global OAuth button)
const zaiSvg = "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/assets/provider-icons/logo-zai.svg";
const newZai = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.5" y="0.5" width="17" height="17" rx="3.5" fill="#151718" stroke="#B7BCBF"/>
  <path d="M4.5 4h2.6v4.2h3.8V4h2.6v10h-2.6v-4.2H7.1V10H4.5V4z" fill="white"/>
</svg>
`;
writeFileSync(zaiSvg, newZai);
console.log("logo-zai.svg replaced with H badge");

// 3) i18n button labels with empty brand after rebrand
const zh = "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/i18n/locales/zh-CN.ts";
let zt = readFileSync(zh, "utf8");
zt = zt.replace(
  '"login.oauth.button.zai": "连接  继续使用",',
  '"login.oauth.button.zai": "连接 Global 继续使用",',
);
writeFileSync(zh, zt);
const en = "D:/AIProject/HawkNext/vendor/zcode/packages/ui/src/i18n/locales/en-US.ts";
let et = readFileSync(en, "utf8");
et = et.replace(
  '"login.oauth.button.zai": "Connect to ",',
  '"login.oauth.button.zai": "Connect to Global",',
);
writeFileSync(en, et);
console.log("i18n labels fixed");
