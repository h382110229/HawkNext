// HawkNext P1 smoke — key NEVER committed. Use env only.
// $env:HAWKNEXT_LLMAPI_API_KEY = "as-..."  then: node research/p1-smoke.mjs
const BASE = process.env.HAWKNEXT_LLMAPI_PRIMARY || "https://llmapi.hawkren.online";
const KEY = process.env.HAWKNEXT_LLMAPI_API_KEY || process.env.LLMAPI_API_KEY || "";
if (!KEY) {
  console.error("missing HAWKNEXT_LLMAPI_API_KEY (refuse to run without key)");
  process.exit(1);
}
const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function call(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: H, body: JSON.stringify(body) });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch {}
  return { status: r.status, j, text };
}

function summarize(label, res) {
  console.log(`\n===== ${label} =====`);
  if (!res.j) { console.log("status", res.status, res.text.slice(0, 400)); return; }
  if (res.j.choices) {
    const c = res.j.choices[0];
    console.log("model=", res.j.model, "finish=", c.finish_reason);
    console.log("content=", JSON.stringify(c.message?.content ?? null).slice(0, 200));
    console.log("tool_calls=", JSON.stringify(c.message?.tool_calls ?? null).slice(0, 800));
  } else if (res.j.output) {
    console.log("status=", res.j.status, "model=", res.j.model);
    console.log("output_types=", (res.j.output || []).map((x) => x.type).join(","));
    console.log("output_text=", JSON.stringify(res.j.output_text ?? null).slice(0, 200));
    console.log("raw=", JSON.stringify(res.j).slice(0, 900));
  } else {
    console.log("status", res.status, JSON.stringify(res.j).slice(0, 500));
  }
}

const writeTool = {
  type: "function",
  function: {
    name: "write_file",
    description: "Write a file",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    },
  },
};
const memoTool = {
  type: "function",
  function: {
    name: "write_memo",
    description: "Write office memo",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        points: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
      required: ["title", "points", "summary"],
    },
  },
};
const patchTool = {
  type: "function",
  function: {
    name: "apply_patch",
    description: "Apply a patch",
    parameters: { type: "object", properties: { patch: { type: "string" } }, required: ["patch"] },
  },
};

(async () => {
  summarize(
    "P1-A Office structured",
    await call("/v1/chat/completions", {
      model: "Auto",
      messages: [
        { role: "system", content: "Office assistant. Always call write_memo." },
        { role: "user", content: "写一份3点变更方案备忘录，主题：接入交换机迁移。用 write_memo 提交。" },
      ],
      tools: [memoTool],
      stream: false,
    })
  );

  summarize(
    "P1-B Coding apply_patch",
    await call("/v1/chat/completions", {
      model: "Auto",
      messages: [
        { role: "system", content: "Coding agent. Use tools. Prefer apply_patch or write_file." },
        { role: "user", content: 'Create hello.js with console.log("HAWK"). Use tools.' },
      ],
      tools: [patchTool, writeTool],
      stream: false,
    })
  );

  summarize(
    "P1-C Responses + tools (codex path)",
    await call("/v1/responses", {
      model: "Auto",
      input: "Call write_file path=a.txt content=HAWK using tools.",
      tools: [
        {
          type: "function",
          name: "write_file",
          description: "Write a file",
          parameters: {
            type: "object",
            properties: { path: { type: "string" }, content: { type: "string" } },
            required: ["path", "content"],
          },
        },
      ],
      max_output_tokens: 500,
    })
  );

  const t1 = await call("/v1/chat/completions", {
    model: "Auto",
    messages: [
      { role: "system", content: "Coding agent. Use write_file only." },
      { role: "user", content: "Write add.js with function add(a,b){return a+b}. Use write_file." },
    ],
    tools: [writeTool],
    stream: false,
  });
  summarize("P1-D1 multiturn tool call", t1);
  const tc = t1.j?.choices?.[0]?.message?.tool_calls?.[0];
  if (tc) {
    const t2 = await call("/v1/chat/completions", {
      model: "Auto",
      messages: [
        { role: "system", content: "Coding agent. Use write_file only." },
        { role: "user", content: "Write add.js with function add(a,b){return a+b}. Use write_file." },
        { role: "assistant", tool_calls: [tc] },
        { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: true }) },
        { role: "user", content: "Now write add.test.js one-liner via write_file." },
      ],
      tools: [writeTool],
      stream: false,
    });
    summarize("P1-D2 after tool result", t2);
  }
})();
