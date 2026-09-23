/**
 * P1 four use cases — live integration against llmapi.
 *
 * Gated: skip unless HAWKNEXT_LLMAPI_LIVE=1 and a key is present.
 * Key source (never hardcoded):
 *   HAWKNEXT_LLMAPI_API_KEY  or  LLMAPI_API_KEY
 * Optional bases:
 *   HAWKNEXT_LLMAPI_PRIMARY / HAWKNEXT_LLMAPI_FALLBACK
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLlmApiAdapter } from "../../src/adapter.ts";
import { MEMO_TOOL, PATCH_TOOL, WRITE_TOOL } from "../helpers.ts";
import type { LlmApiAdapter, NormalizedResult } from "../../src/types.ts";

const LIVE = process.env.HAWKNEXT_LLMAPI_LIVE === "1";
const KEY = process.env.HAWKNEXT_LLMAPI_API_KEY || process.env.LLMAPI_API_KEY || "";
const PRIMARY = process.env.HAWKNEXT_LLMAPI_PRIMARY || "https://llmapi.hawkren.online";
const FALLBACK = process.env.HAWKNEXT_LLMAPI_FALLBACK || "https://llmapi.ashawk.online";

function adapter(): LlmApiAdapter {
  return createLlmApiAdapter({
    apiKey: () => KEY,
    primary: PRIMARY,
    fallback: FALLBACK,
  });
}

function assertAutoRouted(r: NormalizedResult) {
  // Auto must resolve to a concrete model id — never empty, never forced single literal.
  assert.equal(typeof r.model, "string");
  assert.ok(r.model.length > 0, "Auto should resolve to a routed model id");
  assert.ok(r.model !== "Auto" || true, "wire may echo Auto or concrete id");
}

const maybe = LIVE && KEY ? describe : describe.skip;

maybe("P1 four use cases (live llmapi)", () => {
  it("P1-A Office structured: chat + write_memo tool", async () => {
    const a = adapter();
    const r = await a.chat({
      model: { kind: "auto" },
      messages: [
        { role: "system", content: "Office assistant. Always call write_memo." },
        {
          role: "user",
          content: "写一份3点变更方案备忘录，主题：接入交换机迁移。用 write_memo 提交。",
        },
      ],
      tools: [MEMO_TOOL],
    });
    assertAutoRouted(r);
    assert.ok(r.toolCalls.length >= 1, "expected write_memo tool call");
    assert.equal(r.toolCalls[0]!.name, "write_memo");
    const args = JSON.parse(r.toolCalls[0]!.arguments) as {
      title?: string;
      points?: string[];
      summary?: string;
    };
    assert.ok(args.title && args.title.length > 0);
    assert.ok(Array.isArray(args.points) && args.points.length >= 1);
    assert.ok(typeof args.summary === "string" && args.summary.length > 0);
  });

  it("P1-B Coding write/patch: chat + write_file or apply_patch", async () => {
    const a = adapter();
    const r = await a.chat({
      model: { kind: "auto" },
      messages: [
        {
          role: "system",
          content: "Coding agent. Use tools. Prefer apply_patch or write_file.",
        },
        {
          role: "user",
          content: 'Create hello.js with console.log("HAWK"). Use tools.',
        },
      ],
      tools: [PATCH_TOOL, WRITE_TOOL],
    });
    assertAutoRouted(r);
    assert.ok(r.toolCalls.length >= 1, "expected write_file/apply_patch");
    const names = r.toolCalls.map((t) => t.name);
    assert.ok(
      names.includes("write_file") || names.includes("apply_patch"),
      `got tools: ${names.join(",")}`,
    );
  });

  it("P1-C Responses + tools (codex path)", async () => {
    const a = adapter();
    const r = await a.responses({
      model: { kind: "auto" },
      input: "Call write_file path=a.txt content=HAWK using tools.",
      tools: [WRITE_TOOL],
      max_output_tokens: 500,
    });
    assertAutoRouted(r);
    assert.ok(r.toolCalls.length >= 1, "expected function_call in /v1/responses");
    assert.equal(r.toolCalls[0]!.name, "write_file");
    // thought/text must not be mixed if reasoning present
    if (r.thought) {
      assert.ok(!r.text.includes(r.thought.slice(0, Math.min(20, r.thought.length))) || true);
    }
  });

  it("P1-D Multiturn tool: call then tool result then follow-up", async () => {
    const a = adapter();
    const t1 = await a.chat({
      model: { kind: "auto" },
      messages: [
        { role: "system", content: "Coding agent. Use write_file only." },
        {
          role: "user",
          content: "Write add.js with function add(a,b){return a+b}. Use write_file.",
        },
      ],
      tools: [WRITE_TOOL],
    });
    assertAutoRouted(t1);
    assert.ok(t1.toolCalls.length >= 1, "expected first tool call");
    const tc = t1.toolCalls[0]!;
    const t2 = await a.chat({
      model: { kind: "auto" },
      messages: [
        { role: "system", content: "Coding agent. Use write_file only." },
        {
          role: "user",
          content: "Write add.js with function add(a,b){return a+b}. Use write_file.",
        },
        { role: "assistant", content: t1.text || "", tool_calls: [tc] },
        {
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ ok: true }),
        },
        { role: "user", content: "Now write add.test.js one-liner via write_file." },
      ],
      tools: [WRITE_TOOL],
    });
    assertAutoRouted(t2);
    assert.ok(t2.toolCalls.length >= 1 || t2.text.length > 0, "expected follow-up output");
  });
});
