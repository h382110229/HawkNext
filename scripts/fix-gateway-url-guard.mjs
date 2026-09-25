import { readFileSync, writeFileSync } from "node:fs";

const p =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/official-coding-plan-gateway.ts";
let t = readFileSync(p, "utf8");

if (t.includes("safeParseUrl")) {
  console.log("already patched");
  process.exit(0);
}

const helper = [
  "function safeParseUrl(value: string): URL | undefined {",
  "  try {",
  "    return new URL(value);",
  "  } catch {",
  "    return undefined;",
  "  }",
  "}",
  "",
  "",
].join("\n");

const fallback = 'new URL("https://invalid.local/")';
t = t.replace(
  "    endpointKey(new URL(route.providerEndpoint)),",
  `    endpointKey(safeParseUrl(route.providerEndpoint) ?? ${fallback}),`,
);
t = t.replace(
  "const GATEWAY_PATH_BY_PROVIDER_ENDPOINT",
  helper + "const GATEWAY_PATH_BY_PROVIDER_ENDPOINT",
);
writeFileSync(p, t);
console.log("patched");
