/**
 * codex driver tool specs + Office run helper over llmapi-adapter.
 * Responses path preferred (design §5); never silent official endpoints.
 */
import {
  createLlmApiAdapter,
  type LlmApiAdapter,
  type NormalizedResult,
  type ToolCall,
  type ToolDef,
  type ApiKeyProvider,
  type FetchLike,
} from "../../llmapi-adapter/src/index.ts";
import {
  extractPatch,
  evaluatePatchPolicy,
  toolsForPolicy,
  type PatchMode,
  type PatchPolicy,
  type FileMap,
  applyPatchText,
  ApplyPatchError,
} from "./apply-patch/index.ts";

export const APPLY_PATCH_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "apply_patch",
    description:
      "Edit files with codex apply_patch freeform text (*** Begin Patch ... *** End Patch). Prefer this for multi-file edits.",
    parameters: {
      type: "object",
      properties: {
        patch: {
          type: "string",
          description: "Full apply_patch body including Begin/End markers.",
        },
      },
      required: ["patch"],
    },
  },
};

export const WRITE_FILE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "write_file",
    description: "Write a file (deterministic fallback).",
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

export const WRITE_MEMO_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "write_memo",
    description: "Write office memo (structured Office deliverable).",
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

export function toolsForMode(mode: PatchMode): ToolDef[] {
  const names = toolsForPolicy(mode);
  const all: Record<string, ToolDef> = {
    apply_patch: APPLY_PATCH_TOOL,
    write_file: WRITE_FILE_TOOL,
    write_memo: WRITE_MEMO_TOOL,
  };
  return names.map((n) => all[n]!);
}

export interface CodexDriverOptions {
  apiKey: ApiKeyProvider;
  primary?: string;
  fallback?: string;
  fetchImpl?: FetchLike;
  patchPolicy?: PatchPolicy;
}

export interface OfficeToolOutcome {
  ok: boolean;
  kind: "apply_patch" | "write_file" | "write_memo" | "none";
  files: FileMap;
  detail: string;
  toolCall?: ToolCall;
  result: NormalizedResult;
  /** Set when apply_patch failed and we should switch to deterministic_only. */
  suggestDisablePatch?: boolean;
}

export function createCodexDriver(options: CodexDriverOptions) {
  const adapter: LlmApiAdapter = createLlmApiAdapter({
    apiKey: options.apiKey,
    primary: options.primary,
    fallback: options.fallback,
    fetchImpl: options.fetchImpl,
  });

  let policy: PatchPolicy =
    options.patchPolicy ??
    evaluatePatchPolicy({ total: 0, passed: 0, failed: 0, failures: [] }, undefined);

  function getPolicy(): PatchPolicy {
    return policy;
  }

  function setPolicy(p: PatchPolicy): void {
    policy = p;
  }

  /**
   * Execute a model tool call against a workspace FileMap.
   * On apply_patch parse/apply failure: if write_file args exist as fallback guidance, mark suggestDisablePatch.
   */
  function executeToolCall(call: ToolCall, files: FileMap): OfficeToolOutcome {
    // placeholder result filled by caller after model call; we only mutate files here
    const emptyResult: NormalizedResult = {
      model: "",
      text: "",
      thought: "",
      toolCalls: [call],
      finishReason: null,
      baseUrl: "",
      raw: null,
    };

    if (call.name === "apply_patch") {
      if (policy.mode === "deterministic_only") {
        return {
          ok: false,
          kind: "none",
          files,
          detail: "apply_patch disabled — use write_file",
          toolCall: call,
          result: emptyResult,
        };
      }
      let args: { patch?: string } = {};
      try {
        args = JSON.parse(call.arguments || "{}") as { patch?: string };
      } catch {
        // freeform: arguments is the patch body itself
        args = { patch: call.arguments };
      }
      const rawPatch = args.patch ?? call.arguments;
      const ex = extractPatch(String(rawPatch ?? ""));
      if (!ex.ok || !ex.patch) {
        policy = evaluatePatchPolicy(
          { total: 1, passed: 0, failed: 1, failures: [{ name: call.name, reason: ex.error ?? "extract failed" }] },
          policy.lastRegression,
        );
        return {
          ok: false,
          kind: "apply_patch",
          files,
          detail: ex.error ?? "extract failed",
          toolCall: call,
          result: emptyResult,
          suggestDisablePatch: true,
        };
      }
      try {
        const applied = applyPatchText(ex.patch, files, "preserve");
        return {
          ok: true,
          kind: "apply_patch",
          files: applied.files,
          detail: applied.log.join("; "),
          toolCall: call,
          result: emptyResult,
        };
      } catch (e) {
        const msg = e instanceof ApplyPatchError || e instanceof Error ? e.message : String(e);
        policy = evaluatePatchPolicy(
          { total: 1, passed: 0, failed: 1, failures: [{ name: call.name, reason: msg }] },
          policy.lastRegression,
        );
        return {
          ok: false,
          kind: "apply_patch",
          files,
          detail: msg,
          toolCall: call,
          result: emptyResult,
          suggestDisablePatch: true,
        };
      }
    }

    if (call.name === "write_file") {
      try {
        const args = JSON.parse(call.arguments || "{}") as { path?: string; content?: string };
        if (!args.path) throw new Error("write_file missing path");
        const next = { ...files, [args.path]: args.content ?? "" };
        return {
          ok: true,
          kind: "write_file",
          files: next,
          detail: `wrote ${args.path}`,
          toolCall: call,
          result: emptyResult,
        };
      } catch (e) {
        return {
          ok: false,
          kind: "write_file",
          files,
          detail: e instanceof Error ? e.message : String(e),
          toolCall: call,
          result: emptyResult,
        };
      }
    }

    if (call.name === "write_memo") {
      return {
        ok: true,
        kind: "write_memo",
        files,
        detail: "memo captured",
        toolCall: call,
        result: emptyResult,
      };
    }

    return {
      ok: false,
      kind: "none",
      files,
      detail: `unknown tool ${call.name}`,
      toolCall: call,
      result: emptyResult,
    };
  }

  /**
   * Office structured turn via /v1/responses (codex main path).
   * Model: Auto by default.
   */
  async function officeTurn(
    prompt: string,
    files: FileMap = {},
    signal?: AbortSignal,
  ): Promise<OfficeToolOutcome[]> {
    const tools = toolsForMode(policy.mode);
    const result = await adapter.responses({
      model: { kind: "auto" },
      input: prompt,
      tools,
      max_output_tokens: 1200,
    }, signal);

    const outcomes: OfficeToolOutcome[] = [];
    if (result.toolCalls.length === 0) {
      outcomes.push({
        ok: result.text.length > 0,
        kind: "none",
        files,
        detail: result.text || result.thought || "no tool call",
        result,
      });
      return outcomes;
    }

    let current = files;
    for (const call of result.toolCalls) {
      const out = executeToolCall(call, current);
      out.result = result;
      current = out.files;
      outcomes.push(out);
      if (out.suggestDisablePatch) {
        policy = evaluatePatchPolicy(
          { total: 1, passed: 0, failed: 1, failures: [{ name: call.name, reason: out.detail }] },
          policy.lastRegression,
        );
      }
    }
    return outcomes;
  }

  return {
    adapter,
    getPolicy,
    setPolicy,
    executeToolCall,
    officeTurn,
  };
}

export type CodexDriver = ReturnType<typeof createCodexDriver>;
