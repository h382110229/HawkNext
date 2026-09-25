import { readFileSync } from "node:fs";
import { join } from "node:path";

const p = join(
  "D:\\AIProject\\HawkNext\\vendor\\zcode\\apps\\hawknext-cli\\packages\\adapters\\src\\exec\\execution-command.ts",
);
const s = readFileSync(p, "utf8");
// show the cmd dialect branch
const i = s.indexOf('if (provider.dialect === "cmd")');
console.log(s.slice(i, i + 600));
