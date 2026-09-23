import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { modelRefToWire, parseModelRef } from "../../src/model.ts";
import {
  foldChatDelta,
  normalizeChatResponse,
  normalizeResponsesResponse,
  parseSseDataBlock,
} from "../../src/normalize.ts";
import { emptyAccumulator } from "../../src/normalize.ts";

describe("model: default Auto", () => {
  it("defaults to Auto wire id", () => {
    assert.equal(modelRefToWire(undefined), "Auto");
    assert.equal(modelRefToWire({ kind: "auto" }), "Auto");
  });

  it("explicit id passes through (not forced single mimo)", () => {
    assert.equal(modelRefToWire({ kind: "id", id: "mimo-v2.6-pro" }), "mimo-v2.6-pro");
  });

  it("parseModelRef treats Auto as auto kind", () => {
    assert.deepEqual(parseModelRef("Auto"), { kind: "auto" });
    assert.deepEqual(parseModelRef("auto"), { kind: "auto" });
    assert.deepEqual(parseModelRef("mimo-v2.5-pro"), { kind: "id", id: "mimo-v2.5-pro" });
  });
});

describe("normalize: chat", () => {
  it("separates thought and text", () => {
    const r = normalizeChatResponse({
      model: "mimo-v2.6-flash",
      choices: [
        {
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: "hello",
            reasoning_content: "thinking…",
          },
        },
      ],
    });
    assert.equal(r.text, "hello");
    assert.equal(r.thought, "thinking…");
    assert.equal(r.model, "mimo-v2.6-flash");
  });

  it("extracts tool_calls", () => {
    const r = normalizeChatResponse({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "write_memo", arguments: '{"title":"t"}' },
              },
            ],
          },
        },
      ],
    });
    assert.equal(r.toolCalls.length, 1);
    assert.equal(r.toolCalls[0]!.name, "write_memo");
    assert.equal(r.toolCalls[0]!.arguments, '{"title":"t"}');
    assert.equal(r.text, "");
  });

  it("foldChatDelta accumulates SSE pieces", () => {
    const acc = emptyAccumulator("m");
    foldChatDelta(acc, { reasoning_content: "re" });
    foldChatDelta(acc, { content: "bo" });
    foldChatDelta(acc, { content: "dy" });
    foldChatDelta(acc, {
      tool_calls: [{ id: "c1", function: { name: "write_file", arguments: '{"path"' } }],
    });
    foldChatDelta(acc, {
      tool_calls: [{ id: "c1", function: { name: "write_file", arguments: ':"a"}' } }],
    });
    assert.equal(acc.thought, "re");
    assert.equal(acc.text, "body");
    assert.equal(acc.toolCalls.length, 1);
    assert.equal(acc.toolCalls[0]!.arguments, '{"path":"a"}');
  });

  it("parseSseDataBlock skips DONE", () => {
    const payloads = parseSseDataBlock('data: {"a":1}\n\ndata: [DONE]\n');
    assert.equal(payloads.length, 1);
  });
});

describe("normalize: responses", () => {
  it("maps reasoning_text to thought and function_call to tool", () => {
    const r = normalizeResponsesResponse({
      model: "mimo-v2.6-pro",
      status: "completed",
      reasoning_text: "plan",
      output_text: "done",
      output: [
        { type: "reasoning", text: "more" },
        {
          type: "function_call",
          call_id: "fc1",
          name: "write_file",
          arguments: '{"path":"a.txt","content":"HAWK"}',
        },
        { type: "message", content: [{ type: "output_text", text: "ok" }] },
      ],
    });
    assert.ok(r.thought.includes("plan"));
    assert.ok(r.thought.includes("more"));
    assert.ok(r.text.includes("done"));
    assert.ok(r.text.includes("ok"));
    assert.equal(r.toolCalls.length, 1);
    assert.equal(r.toolCalls[0]!.id, "fc1");
  });
});
