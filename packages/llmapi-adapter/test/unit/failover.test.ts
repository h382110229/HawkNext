import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLlmApiAdapter } from "../../src/adapter.ts";
import { LlmApiError } from "../../src/errors.ts";
import { jsonResponse, mockFetch, TEST_KEY } from "../helpers.ts";

const PRIMARY = "https://llmapi.hawkren.online";
const FALLBACK = "https://llmapi.ashawk.online";

describe("adapter: failover + defaults", () => {
  it("defaults model to Auto on chat", async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse(200, {
        model: "mimo-v2.6-flash",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "hi" } }],
      }),
    );
    const a = createLlmApiAdapter({
      apiKey: () => TEST_KEY,
      fetchImpl,
    });
    const r = await a.chat({ messages: [{ role: "user", content: "x" }] });
    assert.equal((calls[0]!.body as { model: string }).model, "Auto");
    assert.equal(r.text, "hi");
    assert.equal(r.model, "mimo-v2.6-flash");
  });

  it("failover primary 503 → fallback", async () => {
    const events: unknown[] = [];
    const { fetchImpl, calls } = mockFetch((req) => {
      if (req.url.startsWith(PRIMARY)) {
        return jsonResponse(503, { error: { type: "routing_error", message: "Auto all down" } });
      }
      return jsonResponse(200, {
        model: "mimo-v2.6-pro",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "fb" } }],
      });
    });
    const a = createLlmApiAdapter({
      apiKey: () => TEST_KEY,
      fetchImpl,
      onEvent: (e) => events.push(e),
    });
    const r = await a.chat({ messages: [{ role: "user", content: "x" }] });
    assert.equal(calls.length, 2);
    assert.ok(calls[0]!.url.startsWith(PRIMARY));
    assert.ok(calls[1]!.url.startsWith(FALLBACK));
    assert.equal(r.text, "fb");
    assert.equal(r.baseUrl, FALLBACK);
    assert.ok(events.some((e) => (e as { kind: string }).kind === "failover"));
  });

  it("failover on network error", async () => {
    let n = 0;
    const { fetchImpl } = mockFetch(() => {
      n++;
      if (n === 1) throw new Error("ECONNREFUSED");
      return jsonResponse(200, {
        model: "m",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "ok" } }],
      });
    });
    const a = createLlmApiAdapter({ apiKey: () => TEST_KEY, fetchImpl });
    const r = await a.chat({ messages: [{ role: "user", content: "x" }] });
    assert.equal(r.text, "ok");
  });

  it("does not failover on 401 auth_error", async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse(401, { error: { type: "auth_error", message: "bad key" } }),
    );
    const a = createLlmApiAdapter({ apiKey: () => TEST_KEY, fetchImpl });
    await assert.rejects(
      () => a.chat({ messages: [{ role: "user", content: "x" }] }),
      (e: unknown) => e instanceof LlmApiError && e.code === "auth_error",
    );
    assert.equal(calls.length, 1);
  });

  it("rejects forbidden primary at construction", () => {
    assert.throws(
      () =>
        createLlmApiAdapter({
          apiKey: () => TEST_KEY,
          primary: "https://api.openai.com/v1",
        }),
      (e: unknown) => e instanceof LlmApiError && e.code === "config_error",
    );
  });

  it("never sets Authorization host to openai/zai", async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse(200, {
        model: "m",
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "x" } }],
      }),
    );
    const a = createLlmApiAdapter({ apiKey: () => TEST_KEY, fetchImpl });
    await a.chat({ messages: [{ role: "user", content: "x" }] });
    for (const c of calls) {
      assert.ok(!/openai\.com|z\.ai|bigmodel/.test(c.url));
      assert.ok(c.headers.Authorization?.startsWith("Bearer as-"));
    }
  });

  it("responses uses /v1/responses and Auto", async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse(200, {
        model: "mimo-v2.6-pro",
        status: "completed",
        output_text: "ok",
        output: [],
      }),
    );
    const a = createLlmApiAdapter({ apiKey: () => TEST_KEY, fetchImpl });
    await a.responses({ input: "hi", tools: [] });
    assert.ok(calls[0]!.url.endsWith("/v1/responses"));
    assert.equal((calls[0]!.body as { model: string }).model, "Auto");
  });

  it("listModels hits /v1/models", async () => {
    const { fetchImpl, calls } = mockFetch(() =>
      jsonResponse(200, { data: [{ id: "Auto" }, { id: "mimo-v2.6-flash" }] }),
    );
    const a = createLlmApiAdapter({ apiKey: () => TEST_KEY, fetchImpl });
    const models = await a.listModels();
    assert.deepEqual(models, ["Auto", "mimo-v2.6-flash"]);
    assert.ok(calls[0]!.url.endsWith("/v1/models"));
  });
});
