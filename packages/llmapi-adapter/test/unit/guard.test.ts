import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSafeBaseUrl, isForbiddenHost, joinUrl, redactBearer } from "../../src/guard.ts";
import { LlmApiError } from "../../src/errors.ts";

describe("guard: forbidden hosts", () => {
  it("blocks official endpoints", () => {
    for (const h of [
      "api.openai.com",
      "auth.openai.com",
      "chatgpt.com",
      "releases.openai.com",
      "z.ai",
      "chat.z.ai",
      "api.z.ai",
      "cdn-zcode.z.ai",
      "zcode.z.ai",
      "open.bigmodel.cn",
      "bigmodel.cn",
    ]) {
      assert.equal(isForbiddenHost(h), true, h);
    }
  });

  it("allows llmapi hosts", () => {
    for (const h of [
      "llmapi.hawkren.online",
      "llmapi.ashawk.online",
      "localhost",
      "127.0.0.1",
    ]) {
      assert.equal(isForbiddenHost(h), false, h);
    }
  });

  it("assertSafeBaseUrl throws on forbidden", () => {
    assert.throws(
      () => assertSafeBaseUrl("https://api.openai.com/v1"),
      (e: unknown) => e instanceof LlmApiError && e.code === "config_error",
    );
    assert.throws(
      () => assertSafeBaseUrl("https://chat.z.ai"),
      (e: unknown) => e instanceof LlmApiError && e.code === "config_error",
    );
  });

  it("assertSafeBaseUrl accepts llmapi", () => {
    const u = assertSafeBaseUrl("https://llmapi.hawkren.online");
    assert.equal(u.hostname, "llmapi.hawkren.online");
  });

  it("joinUrl avoids double slash", () => {
    assert.equal(joinUrl("https://x.y/", "/v1/chat"), "https://x.y/v1/chat");
    assert.equal(joinUrl("https://x.y", "v1/chat"), "https://x.y/v1/chat");
  });

  it("redactBearer never returns full key", () => {
    const key = "as-abcdefghijklmnopqrstuvwxyz0123456789";
    const r = redactBearer(`Bearer ${key}`);
    assert.ok(!r.includes(key));
    assert.ok(r.includes("…"));
  });
});
