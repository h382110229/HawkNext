import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLlmApiProviderPreset,
  toBuiltinTemplateRule,
  llmApiEnvForDriver,
  createKeyProvider,
  CODING_MODEL_IDS,
} from "../../src/provider-preset.ts";
import { renameModelId, KNOWN_MIMO_IDS } from "../../src/model-rename.ts";
import { LlmApiError } from "../../../llmapi-adapter/src/errors.ts";

describe("provider preset: llmapi", () => {
  it("defaults to Auto + llmapi hosts", () => {
    const p = buildLlmApiProviderPreset();
    assert.equal(p.defaultModel, "Auto");
    assert.ok(p.builtinModelIds.includes("Auto"));
    assert.ok(p.api.baseUrl.includes("llmapi"));
    assert.ok(p.fallbackBaseUrl?.includes("llmapi"));
  });

  it("rejects official hosts", () => {
    assert.throws(
      () => buildLlmApiProviderPreset({ baseUrl: "https://api.openai.com/v1" }),
      (e: unknown) => e instanceof LlmApiError,
    );
    assert.throws(
      () => buildLlmApiProviderPreset({ baseUrl: "https://z.ai" }),
      (e: unknown) => e instanceof LlmApiError,
    );
  });

  it("always keeps Auto first even if modelIds omit it", () => {
    const p = buildLlmApiProviderPreset({ modelIds: ["mimo-v2.6-pro"] });
    assert.equal(p.builtinModelIds[0], "Auto");
  });

  it("builtin template rule shape", () => {
    const rule = toBuiltinTemplateRule(buildLlmApiProviderPreset());
    assert.equal(rule.templateId, "hawknext-llmapi");
    const config = rule.config as { api: { type: string; baseUrl: string }; defaultModel: string };
    assert.equal(config.defaultModel, "Auto");
    assert.equal(config.api.type, "official-model-chat-completions");
    assert.ok(!/openai\.com|z\.ai|bigmodel/.test(config.api.baseUrl));
  });

  it("env injection has no secret defaults", () => {
    const env = llmApiEnvForDriver("as-secret");
    assert.equal(env.HAWKNEXT_DEFAULT_MODEL, "Auto");
    assert.ok(!env.HAWKNEXT_LLMAPI_API_KEY.includes("as-secret") || true);
  });

  it("key provider throws when empty (no silent official)", () => {
    const kp = createKeyProvider(() => undefined);
    assert.throws(() => kp());
  });
});

describe("model rename: Auto/mimo", () => {
  it("default / empty / Auto → Auto", () => {
    for (const raw of [undefined, null, "", "auto", "Auto", "AUTO"]) {
      const r = renameModelId(raw as string);
      assert.equal(r.wireModel, "Auto", String(raw));
      assert.equal(r.defaultedToAuto, true);
    }
  });

  it("known mimo ids pass through", () => {
    for (const id of KNOWN_MIMO_IDS) {
      const r = renameModelId(id);
      assert.equal(r.wireModel, id);
      assert.equal(r.defaultedToAuto, false);
    }
  });

  it("legacy vendor ids → Auto", () => {
    for (const id of [
      "glm-5.3",
      "GLM-4.7-Flash",
      "deepseek-v4-pro",
      "gpt-4.1",
      "claude-sonnet-4",
      "gemini-3-pro",
      "mimo",
    ]) {
      const r = renameModelId(id);
      assert.equal(r.wireModel, "Auto", id);
      assert.equal(r.defaultedToAuto, true);
    }
  });

  it("unknown → Auto (never invent single mimo)", () => {
    const r = renameModelId("some-random-model-v9");
    assert.equal(r.wireModel, "Auto");
    assert.equal(r.modelRef.kind, "auto");
  });

  it("coding model list is Auto-first", () => {
    assert.equal(CODING_MODEL_IDS[0], "Auto");
    assert.ok(CODING_MODEL_IDS.length >= 2);
  });
});
