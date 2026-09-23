#!/usr/bin/env node
// Insert/refresh hawknext-llmapi template rule at the front of vendor builtin config.
// Idempotent. Does not git commit.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] || "D:/AIProject/HawkNext";
const path = join(root, "vendor/zcode/config/provider/hawknext-builtin.json");
const raw = readFileSync(path, "utf8");
const json = JSON.parse(raw);

const PRIMARY = "https://llmapi.hawkren.online";
const FALLBACK = "https://llmapi.ashawk.online";

const rule = {
  templateId: "hawknext-llmapi",
  templateNameMap: {
    "zh-CN": "HawkNext LLMAPI",
    "en-US": "HawkNext LLMAPI",
  },
  config: {
    access: {
      type: "api-key",
      apiKeyManagementUrl: "",
    },
    api: {
      type: "official-model-chat-completions",
      baseUrl: PRIMARY,
    },
    fallbackBaseUrl: FALLBACK,
    builtinModelIds: ["Auto", "mimo-v2.5-pro", "mimo-v2.6-flash", "mimo-v2.6-pro"],
    defaultModel: "Auto",
  },
};

const rules = json.config.providerConfigRules.templateRules;
const idx = rules.findIndex((r) => r.templateId === "hawknext-llmapi");
if (idx >= 0) rules[idx] = rule;
else rules.unshift(rule);

json.config.defaultModel = "Auto";
json.config.defaultTemplateId = "hawknext-llmapi";

writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
console.log("patched", path, "rules[0]=" + rules[0].templateId, "defaultModel=Auto");
