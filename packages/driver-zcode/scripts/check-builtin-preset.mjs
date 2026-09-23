#!/usr/bin/env node
// Assert vendor builtin provider config has llmapi preset + default Auto.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] || "D:/AIProject/HawkNext";
const path = join(root, "vendor/zcode/config/provider/hawknext-builtin.json");
const raw = readFileSync(path, "utf8");
const json = JSON.parse(raw);
const rules = json?.config?.providerConfigRules?.templateRules ?? [];

const llm = rules.find((r) => r.templateId === "hawknext-llmapi");
if (!llm) {
  console.error("FAIL: missing templateId hawknext-llmapi");
  process.exit(1);
}

const baseUrl = llm?.config?.api?.baseUrl ?? "";
if (!/llmapi\.(hawkren|ashawk)\.online/.test(baseUrl)) {
  console.error("FAIL: hawknext-llmapi baseUrl not llmapi:", baseUrl);
  process.exit(1);
}

const models = llm?.config?.builtinModelIds ?? [];
if (!models.includes("Auto") && models[0] !== "Auto") {
  // allow defaultModel field
  if (llm?.config?.defaultModel !== "Auto" && json?.config?.defaultModel !== "Auto") {
    if (!models.includes("Auto")) {
      console.error("FAIL: Auto not in builtinModelIds and no defaultModel=Auto");
      process.exit(1);
    }
  }
}

const defaultModel = llm?.config?.defaultModel ?? json?.config?.defaultModel;
if (defaultModel && defaultModel !== "Auto") {
  console.error("FAIL: defaultModel must be Auto, got", defaultModel);
  process.exit(1);
}

// no official egress in llmapi entry
if (/openai\.com|z\.ai|bigmodel/.test(JSON.stringify(llm))) {
  console.error("FAIL: official host in llmapi preset");
  process.exit(1);
}

console.log("OK: hawknext-llmapi preset present, baseUrl=", baseUrl, "defaultModel=", defaultModel ?? "Auto");
