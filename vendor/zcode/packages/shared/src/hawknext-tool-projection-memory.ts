import type { HawkNextStreamingToolInputState } from "./streaming-tool-input-preview.js";

export interface HawkNextToolProjectionMemory {
  completeToolInputById?: Map<string, unknown>;
  streamingToolInputById?: Map<string, HawkNextStreamingToolInputState>;
  toolNameById?: Map<string, string>;
}

export interface HawkNextToolProjectionMetadata {
  hasInput: boolean;
  input?: unknown;
  toolName?: string;
}

export function createHawkNextToolProjectionMemory(): HawkNextToolProjectionMemory {
  return {
    completeToolInputById: new Map<string, unknown>(),
    streamingToolInputById: new Map<string, HawkNextStreamingToolInputState>(),
    toolNameById: new Map<string, string>(),
  };
}

export function ensureHawkNextToolProjectionMemory(
  memory: HawkNextToolProjectionMemory,
): HawkNextToolProjectionMemory {
  memory.completeToolInputById ??= new Map<string, unknown>();
  memory.streamingToolInputById ??= new Map<string, HawkNextStreamingToolInputState>();
  memory.toolNameById ??= new Map<string, string>();
  return memory;
}

export function resolveHawkNextToolProjectionMetadata(
  payload: Record<string, unknown>,
  toolId: string,
  memory: HawkNextToolProjectionMemory,
): HawkNextToolProjectionMetadata {
  const toolName = readNonEmptyString(payload.toolName) ?? memory.toolNameById?.get(toolId);
  if (toolName) {
    memory.toolNameById?.set(toolId, toolName);
  }

  if ("input" in payload) {
    return {
      hasInput: payload.input !== undefined,
      input: payload.input,
      toolName,
    };
  }

  if (memory.completeToolInputById?.has(toolId)) {
    return {
      hasInput: true,
      input: memory.completeToolInputById.get(toolId),
      toolName,
    };
  }

  return {
    hasInput: false,
    toolName,
  };
}

export function finalizeHawkNextToolProjectionInput(
  toolId: string,
  input: unknown,
  memory: HawkNextToolProjectionMemory,
): void {
  memory.completeToolInputById ??= new Map<string, unknown>();
  memory.completeToolInputById.set(toolId, input);
  const streamingState = memory.streamingToolInputById?.get(toolId);
  if (streamingState) {
    streamingState.lastPreviewRawInputLength = streamingState.rawInput.length;
    streamingState.rawInput = "";
  }
}

export function forgetHawkNextToolProjectionMetadata(
  toolId: string,
  memory: HawkNextToolProjectionMemory,
): void {
  memory.completeToolInputById?.delete(toolId);
  memory.streamingToolInputById?.delete(toolId);
  memory.toolNameById?.delete(toolId);
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
