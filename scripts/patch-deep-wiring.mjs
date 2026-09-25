#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

// 1) BUILTIN_PROVIDER_TEMPLATE_IDS += llmapi
const typesPath =
  "D:/AIProject/HawkNext/vendor/zcode/packages/shared/src/model-provider-types.ts";
let t = readFileSync(typesPath, "utf8");
if (!t.includes("HAWK_LLMAPI_TEMPLATE")) {
  t = t.replace(
    "export const BUILTIN_PROVIDER_TEMPLATE_IDS = {\n  zai: \"zai-api\",\n  cloud-cn: \"cloud-cn-api\",\n} as const;",
    `export const BUILTIN_PROVIDER_TEMPLATE_IDS = {
  zai: "zai-api",
  cloud-cn: "cloud-cn-api",
  // HAWK_LLMAPI_TEMPLATE: sole default egress (llmapi.hawkren.online / ashawk)
  llmapi: "hawknext-llmapi",
} as const;`,
  );
  if (!t.includes("HAWK_LLMAPI_TEMPLATE")) {
    // try without exact whitespace
    t = t.replace(
      /export const BUILTIN_PROVIDER_TEMPLATE_IDS = \{[\s\S]*?\} as const;/,
      `export const BUILTIN_PROVIDER_TEMPLATE_IDS = {
  zai: "zai-api",
  cloud-cn: "cloud-cn-api",
  // HAWK_LLMAPI_TEMPLATE: sole default egress (llmapi.hawkren.online / ashawk)
  llmapi: "hawknext-llmapi",
} as const;`,
    );
  }
  writeFileSync(typesPath, t, "utf8");
  console.log("template id wired");
} else {
  console.log("template already");
}

// 2) wire failover fetch into model-execution createFactory
const mePath =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/model-execution.ts";
let m = readFileSync(mePath, "utf8");
if (!m.includes("HAWK_LLMAPI_FAILOVER")) {
  if (!m.includes("llmapiFailover")) {
    m = m.replace(
      'import { mergeModelRequestHeaders } from "./model-request-headers.js";',
      'import { mergeModelRequestHeaders } from "./model-request-headers.js";\nimport { createLlmApiFailoverFetch, isLlmApiHost, normalizeWireModelId } from "./llmapiFailover.js"; // HAWK_LLMAPI_FAILOVER',
    );
  }
  // wrap optionFetch for llmapi hosts
  const re =
    /const optionFetch =\s*optionMaps && optionValues\s*\? createModelOptionMapFetch\(\{\s*capture: rawRequestBodyCapture,\s*fetch,\s*maps: optionMaps,\s*values: optionValues,\s*\}\)\s*: fetch;/;
  if (!re.test(m)) {
    console.error("optionFetch block missing");
    process.exit(1);
  }
  m = m.replace(
    re,
    `const rawOptionFetch =
      optionMaps && optionValues
        ? createModelOptionMapFetch({
            capture: rawRequestBodyCapture,
            fetch,
            maps: optionMaps,
            values: optionValues,
          })
        : fetch;
    // HAWK_LLMAPI_FAILOVER: llmapi primary→fallback; block official hosts
    const optionFetch = createLlmApiFailoverFetch(rawOptionFetch, {
      onFailover: (from, to, status) => {
        this.logger?.warn?.("llmapi failover", { from, to, status });
      },
    });`,
  );
  writeFileSync(mePath, m, "utf8");
  console.log("model-execution failover wired");
} else {
  console.log("model-execution already");
}

// 3) export from adapters model index
const idxPath =
  "D:/AIProject/HawkNext/vendor/zcode/apps/hawknext-cli/packages/adapters/src/model/index.ts";
let i = readFileSync(idxPath, "utf8");
if (!i.includes("llmapiFailover")) {
  i += `\nexport * from "./llmapiFailover.js"; // HAWK_LLMAPI_FAILOVER\n`;
  writeFileSync(idxPath, i, "utf8");
  console.log("index export");
}
