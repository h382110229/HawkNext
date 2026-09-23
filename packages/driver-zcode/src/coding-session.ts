/**
 * Coding workbench session over llmapi-adapter (chat + tools + SSE).
 * Tool status / interrupt hooks preserved as callbacks (UI binds later).
 */
import {
  createLlmApiAdapter,
  type AdapterRequest,
  type ApiKeyProvider,
  type ChatMessage,
  type FetchLike,
  type LlmApiAdapter,
  type NormalizedChunk,
  type NormalizedResult,
  type ToolCall,
  type ToolDef,
} from "../../llmapi-adapter/src/index.ts";
import { renameModelId } from "./model-rename.ts";
import { buildLlmApiProviderPreset, type ZcodeProviderPreset } from "./provider-preset.ts";

export const WRITE_FILE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "write_file",
    description: "Write a file in the workspace (deterministic).",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
      required: ["path", "content"],
    },
  },
};

export const READ_FILE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "read_file",
    description: "Read a file from the workspace.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
};

export const RUN_SHELL_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "run_shell",
    description: "Run a shell command in the workspace (requires approval).",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string" },
      },
      required: ["command"],
    },
  },
};

export const DEFAULT_CODING_TOOLS: ToolDef[] = [WRITE_FILE_TOOL, READ_FILE_TOOL, RUN_SHELL_TOOL];

export type ToolPhase = "start" | "ok" | "error" | "cancelled";

export interface ToolStatusEvent {
  phase: ToolPhase;
  toolCall: ToolCall;
  detail?: string;
}

export interface InterruptHandle {
  abort(): void;
  readonly signal: AbortSignal;
}

export interface CodingSessionOptions {
  apiKey: ApiKeyProvider;
  baseUrl?: string;
  fallbackBaseUrl?: string;
  fetchImpl?: FetchLike;
  tools?: ToolDef[];
  systemPrompt?: string;
  onToolStatus?: (ev: ToolStatusEvent) => void;
  onChunk?: (chunk: NormalizedChunk) => void;
}

export type FileMap = Record<string, string>;

export interface CodingTurnResult {
  result: NormalizedResult;
  toolCalls: ToolCall[];
  files: FileMap;
  /** Actual routed model (Auto resolution). */
  routedModel: string;
  /** Rename audit. */
  requestedModel: string;
  defaultedToAuto: boolean;
}

export function createCodingSession(opts: CodingSessionOptions) {
  const preset: ZcodeProviderPreset = buildLlmApiProviderPreset({
    baseUrl: opts.baseUrl,
    fallbackBaseUrl: opts.fallbackBaseUrl,
  });

  const adapter: LlmApiAdapter = createLlmApiAdapter({
    apiKey: opts.apiKey,
    primary: preset.api.baseUrl,
    fallback: preset.fallbackBaseUrl,
    fetchImpl: opts.fetchImpl,
  });

  const tools = opts.tools ?? DEFAULT_CODING_TOOLS;
  const systemPrompt =
    opts.systemPrompt ??
    "You are a coding agent in HawkNext. Prefer write_file for edits. Use tools.";

  let interrupt: AbortController | null = null;

  function createInterrupt(): InterruptHandle {
    interrupt?.abort();
    interrupt = new AbortController();
    const signal = interrupt.signal;
    return {
      abort: () => interrupt?.abort(),
      signal,
    };
  }

  function executeTool(call: ToolCall, files: FileMap): { files: FileMap; detail: string; ok: boolean } {
    opts.onToolStatus?.({ phase: "start", toolCall: call });
    try {
      if (call.name === "write_file") {
        const args = JSON.parse(call.arguments || "{}") as { path?: string; content?: string };
        if (!args.path) throw new Error("write_file missing path");
        const next = { ...files, [args.path]: args.content ?? "" };
        opts.onToolStatus?.({ phase: "ok", toolCall: call, detail: args.path });
        return { files: next, detail: `wrote ${args.path}`, ok: true };
      }
      if (call.name === "read_file") {
        const args = JSON.parse(call.arguments || "{}") as { path?: string };
        const content = files[args.path ?? ""];
        if (content === undefined) throw new Error(`missing ${args.path}`);
        opts.onToolStatus?.({ phase: "ok", toolCall: call });
        return { files, detail: content, ok: true };
      }
      if (call.name === "run_shell") {
        // shell is approval-gated at UI; driver returns a stub result
        opts.onToolStatus?.({ phase: "ok", toolCall: call, detail: "approval-required" });
        return { files, detail: "awaiting approval", ok: true };
      }
      opts.onToolStatus?.({ phase: "error", toolCall: call, detail: `unknown ${call.name}` });
      return { files, detail: `unknown tool ${call.name}`, ok: false };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      opts.onToolStatus?.({ phase: "error", toolCall: call, detail });
      return { files, detail, ok: false };
    }
  }

  /**
   * One coding turn. `requestedModel` goes through rename table (default Auto).
   * Streaming: thought/text/tool_call chunks via onChunk.
   */
  async function runTurn(
    userMessage: string,
    history: ChatMessage[],
    files: FileMap = {},
    options?: { requestedModel?: string; stream?: boolean; handle?: InterruptHandle },
  ): Promise<CodingTurnResult> {
    const rename = renameModelId(options?.requestedModel);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userMessage },
    ];

    const req: AdapterRequest = {
      model: rename.modelRef,
      messages,
      tools,
      stream: options?.stream ?? false,
    };

    const signal = options?.handle?.signal;
    let result: NormalizedResult;

    if (options?.stream) {
      let text = "";
      let thought = "";
      let model = "";
      const collected: ToolCall[] = [];
      const seen = new Set<string>();
      for await (const chunk of adapter.chatStream(req, signal)) {
        opts.onChunk?.(chunk);
        if (chunk.type === "text" && chunk.text) text += chunk.text;
        if (chunk.type === "thought" && chunk.text) thought += chunk.text;
        if (chunk.type === "tool_call" && chunk.toolCall && !seen.has(chunk.toolCall.id)) {
          seen.add(chunk.toolCall.id);
          collected.push(chunk.toolCall);
        }
        if (chunk.model) model = chunk.model;
      }
      result = {
        model,
        text,
        thought,
        toolCalls: collected,
        finishReason: null,
        baseUrl: preset.api.baseUrl,
        raw: null,
      };
    } else {
      result = await adapter.chat(req, signal);
    }

    let current = files;
    for (const call of result.toolCalls) {
      current = executeTool(call, current).files;
    }

    return {
      result,
      toolCalls: result.toolCalls,
      files: current,
      routedModel: result.model || rename.wireModel,
      requestedModel: rename.wireModel,
      defaultedToAuto: rename.defaultedToAuto,
    };
  }

  return {
    adapter,
    preset,
    tools,
    runTurn,
    executeTool,
    createInterrupt,
  };
}

export type CodingSession = ReturnType<typeof createCodingSession>;
