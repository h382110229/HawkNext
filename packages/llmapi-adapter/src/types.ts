/** Public types for HawkNext LLMAPI adapter. */

export type ModelRef = { kind: "auto" } | { kind: "id"; id: string };

export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ChatMessage {
  role: Role;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface AdapterRequest {
  model?: ModelRef;
  messages: ChatMessage[];
  tools?: ToolDef[];
  stream?: boolean;
  /** Extra upstream fields (temperature, max_tokens, …). Never used to change host. */
  extra?: Record<string, unknown>;
}

export interface ResponsesRequest {
  model?: ModelRef;
  input: string | ResponsesInputItem[];
  tools?: ToolDef[];
  max_output_tokens?: number;
  extra?: Record<string, unknown>;
}

export type ResponsesInputItem =
  | { type: "message"; role: Role; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

export type NormalizedChunkType = "thought" | "text" | "tool_call" | "done" | "error";

export interface NormalizedChunk {
  type: NormalizedChunkType;
  text?: string;
  toolCall?: ToolCall;
  /** Routed model id when known (Auto resolution). */
  model?: string;
  error?: LlmApiErrorShape;
  raw?: unknown;
}

export interface NormalizedResult {
  /** Actual routed model id (Auto resolves to concrete id). */
  model: string;
  /** Concatenated assistant body text. */
  text: string;
  /** Concatenated reasoning (thought) text; never mixed into `text`. */
  thought: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  /** Which endpoint served the call after failover. */
  baseUrl: string;
  raw: unknown;
}

export interface LlmApiErrorShape {
  code: string;
  message: string;
  status?: number;
  type?: string;
  baseUrl?: string;
}

export interface LlmApiAdapter {
  chat(req: AdapterRequest, signal?: AbortSignal): Promise<NormalizedResult>;
  chatStream(req: AdapterRequest, signal?: AbortSignal): AsyncIterable<NormalizedChunk>;
  responses(req: ResponsesRequest, signal?: AbortSignal): Promise<NormalizedResult>;
  listModels(signal?: AbortSignal): Promise<string[]>;
}

/** Resolve Bearer key (safeStorage / secure source). Must never log the key. */
export type ApiKeyProvider = () => string | Promise<string>;

export type FetchLike = typeof fetch;

export interface EndpointConfig {
  /** Primary base URL (hawkren). */
  primary: string;
  /** Fallback base URL (ashawk). */
  fallback?: string;
  /** Independent keys per endpoint; falls back to `apiKey`. */
  primaryKey?: ApiKeyProvider;
  fallbackKey?: ApiKeyProvider;
  apiKey: ApiKeyProvider;
  fetchImpl?: FetchLike;
  /** Failover on these HTTP statuses. Default: 429, 500, 502, 503, 504. */
  failoverStatuses?: number[];
  /** Log hook (never receives raw Bearer). */
  onEvent?: (event: LlmApiEvent) => void;
}

export type LlmApiEvent =
  | { kind: "failover"; from: string; to: string; reason: string }
  | { kind: "request"; baseUrl: string; path: string; model: string }
  | { kind: "response"; baseUrl: string; path: string; status: number; model?: string };

export const DEFAULT_MODEL: ModelRef = { kind: "auto" };
export const AUTO_MODEL_ID = "Auto";

export const PRIMARY_BASE_URL = "https://llmapi.hawkren.online";
export const FALLBACK_BASE_URL = "https://llmapi.ashawk.online";
