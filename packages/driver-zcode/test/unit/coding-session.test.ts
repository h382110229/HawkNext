import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCodingSession } from "../../src/coding-session.ts";
import type { FetchLike, NormalizedChunk } from "../../../llmapi-adapter/src/index.ts";

const KEY = "as-test-key-not-real";

function mockChatFetch(capture: { body?: unknown }): FetchLike {
  return async (input, init) => {
    const url = String(input);
    if (url.includes("/v1/chat/completions")) {
      const body = JSON.parse(String(init?.body));
      capture.body = body;
      return new Response(
        JSON.stringify({
          model: "mimo-v2.6-flash",
          choices: [
            {
              finish_reason: "tool_calls",
              message: {
                role: "assistant",
                content: "",
                reasoning_content: "plan",
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "write_file",
                      arguments: JSON.stringify({ path: "hello.js", content: 'console.log("HAWK");\n' }),
                    },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("not found", { status: 404 });
  };
}

function mockSseFetch(): FetchLike {
  return async (input) => {
    const url = String(input);
    if (!url.includes("/v1/chat/completions")) return new Response("", { status: 404 });
    const sse = [
      'data: {"model":"mimo-v2.6-pro","choices":[{"delta":{"reasoning_content":"th"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"he"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"llo"}}]}',
      "",
      'data: {"choices":[{"delta":{"tool_calls":[{"id":"c1","function":{"name":"write_file","arguments":"{\\"path\\":\\"a.txt\\",\\"content\\":\\"x\\"}"}}]}}]}',
      "",
      'data: {"choices":[{"finish_reason":"tool_calls"}]}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    return new Response(sse, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  };
}

describe("coding session: chat + tools + SSE", () => {
  it("non-stream turn defaults model to Auto and executes write_file", async () => {
    const capture: { body?: unknown } = {};
    const statuses: string[] = [];
    const session = createCodingSession({
      apiKey: () => KEY,
      fetchImpl: mockChatFetch(capture),
      onToolStatus: (ev) => statuses.push(ev.phase),
    });
    const turn = await session.runTurn("create hello.js", [], {});
    const body = capture.body as { model: string };
    assert.equal(body.model, "Auto");
    assert.equal(turn.defaultedToAuto, true);
    assert.equal(turn.files["hello.js"], 'console.log("HAWK");\n');
    assert.equal(turn.routedModel, "mimo-v2.6-flash");
    assert.ok(statuses.includes("start") && statuses.includes("ok"));
  });

  it("legacy model id renames to Auto", async () => {
    const capture: { body?: unknown } = {};
    const session = createCodingSession({
      apiKey: () => KEY,
      fetchImpl: mockChatFetch(capture),
    });
    await session.runTurn("x", [], {}, { requestedModel: "glm-5.3" });
    assert.equal((capture.body as { model: string }).model, "Auto");
  });

  it("explicit mimo id is not forced to Auto", async () => {
    const capture: { body?: unknown } = {};
    const session = createCodingSession({
      apiKey: () => KEY,
      fetchImpl: mockChatFetch(capture),
    });
    await session.runTurn("x", [], {}, { requestedModel: "mimo-v2.6-pro" });
    assert.equal((capture.body as { model: string }).model, "mimo-v2.6-pro");
  });

  it("SSE stream yields thought/text/tool_call and writes file", async () => {
    const chunks: NormalizedChunk[] = [];
    const session = createCodingSession({
      apiKey: () => KEY,
      fetchImpl: mockSseFetch(),
      onChunk: (c) => chunks.push(c),
    });
    const turn = await session.runTurn("hi", [], {}, { stream: true });
    assert.ok(chunks.some((c) => c.type === "thought"));
    assert.ok(chunks.some((c) => c.type === "text"));
    assert.ok(chunks.some((c) => c.type === "tool_call"));
    assert.equal(turn.files["a.txt"], "x");
    assert.equal(turn.result.thought, "th");
    assert.equal(turn.result.text, "hello");
  });

  it("interrupt handle aborts turn", async () => {
    const session = createCodingSession({
      apiKey: () => KEY,
      fetchImpl: ((_input: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(new Error("aborted"));
            return;
          }
          signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });
      }) as FetchLike,
    });
    const handle = session.createInterrupt();
    const p = session.runTurn("x", [], {}, { handle });
    // allow the fetch to register abort listener
    await new Promise((r) => setTimeout(r, 5));
    handle.abort();
    await assert.rejects(() => p);
  });
});
