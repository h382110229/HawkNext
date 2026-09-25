import { readFileSync, writeFileSync } from "node:fs";

const p = "D:/AIProject/HawkNext/vendor/zcode/NOTICE.md";
let t = readFileSync(p, "utf8");
const before = t;

t = t.replaceAll("ZCode 相关功能说明与第三方组件声明", "HawkNext 相关功能说明与第三方组件声明");
t = t.replaceAll("ZCode", "HawkNext");
t = t.replaceAll("ZCODE_BASE_URL", "HAWKNEXT_BASE_URL");
t = t.replaceAll("ZCODE_ENDPOINT_ORIGIN", "HAWKNEXT_ENDPOINT_ORIGIN");
t = t.replaceAll("ZCODE_UPDATE_FEED_URL", "HAWKNEXT_UPDATE_FEED_URL");
t = t.replaceAll("--zcode-update-feed-url", "--hawknext-update-feed-url");
t = t.replaceAll("apps/zcode-cli", "apps/hawknext-cli");
t = t.replaceAll("packages/zcode-cua", "packages/hawknext-cua");
t = t.replaceAll("packages/zcode-server-cli", "packages/hawknext-server-cli");
t = t.replaceAll("zcode 命令行版", "HawkNext 命令行版");
t = t.replaceAll("ZCode 命令行版", "HawkNext 命令行版");
t = t.replaceAll("~/.zcode/", "~/.hawknext/");
t = t.replaceAll("通过 ZCode 启动", "通过 HawkNext 启动");

if (t !== before) {
  writeFileSync(p, t);
  console.log("NOTICE.md brand strings updated");
} else {
  console.log("NOTICE.md unchanged");
}

const rest = t.match(/zcode|ZCode|Z Code/gi);
console.log("remaining matches:", rest ? rest.length : 0, rest ? [...new Set(rest)] : []);
