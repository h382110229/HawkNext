import { createLlmApiAdapter } from "../src/index.ts";

const key = process.env.HAWKNEXT_LLMAPI_FALLBACK_KEY || process.env.HAWKNEXT_LLMAPI_API_KEY;
const a = createLlmApiAdapter({
  apiKey: () => key,
  primary: process.env.HAWKNEXT_LLMAPI_FALLBACK || "https://llmapi.ashawk.online",
});
const models = await a.listModels();
const r = await a.chat({
  model: { kind: "auto" },
  messages: [{ role: "user", content: "reply with pong only" }],
});
console.log(
  "ashawk models=",
  models.length,
  "routed=",
  r.model,
  "text=",
  JSON.stringify(r.text).slice(0, 60),
);
console.log("ASHAWK_OK");
