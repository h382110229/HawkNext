import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createLlmApiFailoverFetch,
  isLlmApiHost,
  isForbiddenModelHost,
  normalizeWireModelId,
  LLMAPI_PRIMARY,
  LLMAPI_FALLBACK,
} from "./llmapiFailover.ts";

function json(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("llmapiFailover", () => {
  it("detects llmapi and forbids official hosts", () => {
    assert.equal(isLlmApiHost("llmapi.hawkren.online"), true);
    assert.equal(isLlmApiHost("llmapi.ashawk.online"), true);
    assert.equal(isForbiddenModelHost("api.openai.com"), true);
    assert.equal(isForbiddenModelHost("z.ai"), true);
    assert.equal(isForbiddenModelHost("llmapi.hawkren.online"), false);
  });

  it("normalizeWireModelId defaults to Auto; keeps mimo pins", () => {
    assert.equal(normalizeWireModelId(undefined), "Auto");
    assert.equal(normalizeWireModelId("glm-5.3"), "Auto");
    assert.equal(normalizeWireModelId("mimo-v2.6-pro"), "mimo-v2.6-pro");
    assert.equal(normalizeWireModelId("Auto"), "Auto");
  });

  it("failover on 503 primary → fallback", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const u = String(input);
      calls.push(u);
      if (u.includes("hawkren")) return json(503, { error: "routing" });
      return json(200, { ok: true });
    };
    const f = createLlmApiFailoverFetch(fetchImpl);
    const res = await f(`${LLMAPI_PRIMARY}/v1/chat/completions`, {
      method: "POST",
      body: "{}",
    });
    assert.equal(res.status, 200);
    assert.equal(calls.length, 2);
    assert.ok(calls[0]!.includes("hawkren"));
    assert.ok(calls[1]!.includes("ashawk"));
  });

  it("throws on forbidden host", async () => {
    const f = createLlmApiFailoverFetch(async () => json(200));
    await assert.rejects(() => f("https://api.openai.com/v1/models"), /refuses silent official/);
  });

  it("passes non-llmapi URLs through", async () => {
    const f = createLlmApiFailoverFetch(async () => json(200, { via: "other" }));
    const res = await f("https://example.com/x");
    const j = await res.json();
    assert.equal((j as { via: string }).via, "other");
  });

  it("network error on primary falls back", async () => {
    let n = 0;
    const fetchImpl: typeof fetch = async () => {
      n++;
      if (n === 1) throw new Error("ECONNREFUSED");
      return json(200);
    };
    const f = createLlmApiFailoverFetch(fetchImpl);
    const res = await f(`${LLMAPI_PRIMARY}/v1/models`);
    assert.equal(res.status, 200);
    assert.equal(n, 2);
  });
});
