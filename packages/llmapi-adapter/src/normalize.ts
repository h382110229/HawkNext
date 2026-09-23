import type {
  ChatMessage,
  NormalizedChunk,
  NormalizedResult,
  ToolCall,
  ToolDef,
} from "./types.ts";

/* ---------- wire shapes (OpenAI-compatible + llmapi nonstandard) ---------- */

export interface WireToolCall {
  id?: string;
  type?: string;
  index?: number;
  function?: { name?: string; arguments?: string };
  name?: string;
  arguments?: string;
}

export interface WireChatMessage {
  role?: string;
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: WireToolCall[] | null;
  tool_call_id?: string | null;
}

export interface WireChatChoice {
  index?: number;
  message?: WireChatMessage;
  delta?: WireChatMessage;
  finish_reason?: string | null;
}

export interface WireChatResponse {
  model?: string;
  choices?: WireChatChoice[];
  [k: string]: unknown;
}

export interface WireResponsesOutputItem {
  type?: string;
  id?: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  content?: Array<{ type?: string; text?: string }> | string;
  text?: string;
  summary?: Array<{ type?: string; text?: string }>;
}

export interface WireResponsesResponse {
  model?: string;
  status?: string;
  output?: WireResponsesOutputItem[];
  output_text?: string | null;
  reasoning?: unknown;
  reasoning_text?: string | null;
  [k: string]: unknown;
}

/* ---------- converters ---------- */

export function toolDefToWire(tools: ToolDef[] | undefined): unknown[] | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.function.name,
      description: t.function.description ?? "",
      parameters: t.function.parameters ?? { type: "object", properties: {} },
    },
  }));
}

export function messagesToWire(messages: ChatMessage[]): WireChatMessage[] {
  return messages.map((m) => {
    const wire: WireChatMessage = { role: m.role, content: m.content };
    if (m.tool_calls?.length) {
      wire.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.name, arguments: tc.arguments },
      }));
    }
    if (m.tool_call_id) wire.tool_call_id = m.tool_call_id;
    return wire;
  });
}

export function normalizeToolCall(raw: WireToolCall | undefined, index = 0): ToolCall | null {
  if (!raw) return null;
  const fn = raw.function;
  const name = fn?.name ?? raw.name ?? "";
  if (!name && !fn && !raw.arguments && !raw.arguments) return null;
  return {
    id: raw.id ?? `call_${index}_${name || "tool"}`,
    name: name || "unknown",
    arguments: fn?.arguments ?? raw.arguments ?? "{}",
  };
}

function pushToolCall(acc: NormalizedResult, raw: WireToolCall | undefined, index: number) {
  const tc = normalizeToolCall(raw, index);
  if (tc) acc.toolCalls.push(tc);
}

/**
 * Normalize a non-stream chat completion.
 * thought ← reasoning_content; text ← content; toolCalls ← tool_calls.
 */
export function normalizeChatResponse(raw: WireChatResponse, baseUrl = ""): NormalizedResult {
  const acc: NormalizedResult = {
    model: raw.model ?? "",
    text: "",
    thought: "",
    toolCalls: [],
    finishReason: null,
    baseUrl,
    raw,
  };
  const choice = raw.choices?.[0];
  if (!choice) return acc;
  acc.finishReason = choice.finish_reason ?? null;
  const msg = choice.message ?? {};
  if (typeof msg.reasoning_content === "string" && msg.reasoning_content) {
    acc.thought += msg.reasoning_content;
  }
  if (typeof msg.content === "string" && msg.content) {
    acc.text += msg.content;
  }
  (msg.tool_calls ?? []).forEach((tc, i) => pushToolCall(acc, tc, i));
  return acc;
}

function itemText(item: WireResponsesOutputItem): string {
  if (typeof item.text === "string") return item.text;
  if (typeof item.content === "string") return item.content;
  if (Array.isArray(item.content)) {
    return item.content.map((c) => c.text ?? "").join("");
  }
  if (Array.isArray(item.summary)) {
    return item.summary.map((c) => c.text ?? "").join("");
  }
  return "";
}

/**
 * Normalize /v1/responses payload.
 * thought ← reasoning / reasoning_text; text ← output_text or message items;
 * function_call items → toolCalls.
 */
export function normalizeResponsesResponse(
  raw: WireResponsesResponse,
  baseUrl = "",
): NormalizedResult {
  const acc: NormalizedResult = {
    model: raw.model ?? "",
    text: "",
    thought: "",
    toolCalls: [],
    finishReason: typeof raw.status === "string" ? raw.status : null,
    baseUrl,
    raw,
  };

  if (typeof raw.reasoning_text === "string" && raw.reasoning_text) {
    acc.thought += raw.reasoning_text;
  }
  if (typeof raw.reasoning === "string" && raw.reasoning) {
    acc.thought += raw.reasoning;
  } else if (raw.reasoning && typeof raw.reasoning === "object") {
    const r = raw.reasoning as { summary?: unknown; content?: unknown };
    const parts: string[] = [];
    if (typeof r.summary === "string") parts.push(r.summary);
    if (Array.isArray(r.summary)) {
      for (const s of r.summary as Array<{ text?: string }>) {
        if (s?.text) parts.push(s.text);
      }
    }
    if (typeof r.content === "string") parts.push(r.content);
    if (parts.length) acc.thought += parts.join("\n");
  }

  if (typeof raw.output_text === "string" && raw.output_text) {
    acc.text += raw.output_text;
  }

  let toolIdx = 0;
  for (const item of raw.output ?? []) {
    const type = item.type ?? "";
    if (type === "reasoning") {
      const t = itemText(item);
      if (t) acc.thought += (acc.thought ? "\n" : "") + t;
      continue;
    }
    if (type === "function_call" || type === "tool_call") {
      pushToolCall(
        acc,
        {
          id: item.call_id ?? item.id,
          name: item.name,
          arguments: item.arguments ?? "{}",
        },
        toolIdx++,
      );
      continue;
    }
    if (type === "message" || type === "output_text" || type === "text") {
      const t = itemText(item);
      if (t) acc.text += (acc.text ? "\n" : "") + t;
    }
  }
  return acc;
}

/** Fold one SSE chat delta into an accumulator. */
export function foldChatDelta(acc: NormalizedResult, delta: WireChatMessage | undefined): void {
  if (!delta) return;
  if (typeof delta.reasoning_content === "string" && delta.reasoning_content) {
    acc.thought += delta.reasoning_content;
  }
  if (typeof delta.content === "string" && delta.content) {
    acc.text += delta.content;
  }
  if (delta.tool_calls?.length) {
    // OpenAI stream: tool_calls fragments share `index` (or id); merge name + append arguments.
    for (const raw of delta.tool_calls) {
      const name = raw.function?.name ?? raw.name ?? "";
      const argsPart = raw.function?.arguments ?? raw.arguments ?? "";
      let idx: number;
      if (typeof raw.index === "number") {
        idx = raw.index;
      } else if (raw.id) {
        idx = acc.toolCalls.findIndex((t) => t.id === raw.id);
        if (idx < 0) idx = acc.toolCalls.length;
      } else {
        idx = acc.toolCalls.length > 0 ? acc.toolCalls.length - 1 : 0;
        // if last is complete-ish and this has a new name, start a new slot
        if (acc.toolCalls[idx] && name && acc.toolCalls[idx]!.name !== "unknown" && acc.toolCalls[idx]!.name !== name) {
          idx = acc.toolCalls.length;
        }
      }
      let existing = acc.toolCalls[idx];
      if (!existing) {
        existing = {
          id: raw.id ?? `call_${idx}_${name || "tool"}`,
          name: name || "unknown",
          arguments: "",
        };
        acc.toolCalls[idx] = existing;
      } else if (raw.id && existing.id !== raw.id && existing.name === "unknown") {
        existing.id = raw.id;
      }
      if (name && name !== "unknown") existing.name = name;
      if (argsPart) existing.arguments += argsPart;
    }
  }
  if (typeof delta.reasoning === "string" && delta.reasoning) {
    acc.thought += delta.reasoning;
  }
}

export function emptyAccumulator(model = "", baseUrl = ""): NormalizedResult {
  return {
    model,
    text: "",
    thought: "",
    toolCalls: [],
    finishReason: null,
    baseUrl,
    raw: null,
  };
}

export function accToChunk(acc: NormalizedResult, type: NormalizedChunk["type"]): NormalizedChunk {
  return {
    type,
    text: type === "thought" ? acc.thought : type === "text" ? acc.text : undefined,
    model: acc.model || undefined,
  };
}

/** Parse SSE body lines into JSON payloads (skips [DONE]). */
export function parseSseDataBlock(block: string): unknown[] {
  const out: unknown[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      out.push(JSON.parse(data));
    } catch {
      // ignore malformed partial
    }
  }
  return out;
}
