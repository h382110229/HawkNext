import { LlmApiError } from "./errors.ts";
import { assertSafeBaseUrl, joinUrl, redactBearer } from "./guard.ts";
import { modelRefToWire } from "./model.ts";
import {
  emptyAccumulator,
  foldChatDelta,
  messagesToWire,
  normalizeChatResponse,
  normalizeResponsesResponse,
  parseSseDataBlock,
  toolDefToWire,
  type WireChatMessage,
  type WireChatResponse,
  type WireResponsesResponse,
} from "./normalize.ts";
import {
  FALLBACK_BASE_URL,
  PRIMARY_BASE_URL,
  type AdapterRequest,
  type ApiKeyProvider,
  type EndpointConfig,
  type FetchLike,
  type LlmApiAdapter,
  type NormalizedChunk,
  type NormalizedResult,
  type ResponsesRequest,
  type ToolCall,
} from "./types.ts";

const DEFAULT_FAILOVER = [429, 500, 502, 503, 504];

interface ResolvedEndpoint {
  baseUrl: string;
  getKey: ApiKeyProvider;
  label: "primary" | "fallback";
}

export interface CreateAdapterOptions extends Partial<EndpointConfig> {
  /** Required unless `apiKey` provided. */
  apiKey?: ApiKeyProvider;
}

function resolveKey(provider: ApiKeyProvider, label: string): Promise<string> {
  return Promise.resolve(provider()).then((k) => {
    if (!k || typeof k !== "string") {
      throw new LlmApiError({
        code: "auth_error",
        message: `${label}: API key provider returned empty key`,
      });
    }
    return k;
  });
}

function parseErrorBody(status: number, body: string, baseUrl: string): LlmApiError {
  let code = status === 401 || status === 403 ? "auth_error" : "model_error";
  let type: string | undefined;
  let message = `HTTP ${status}`;
  try {
    const j = JSON.parse(body) as {
      error?: { code?: string; type?: string; message?: string };
      code?: string;
      message?: string;
      type?: string;
    };
    const err = j.error ?? j;
    code = err.type ?? err.code ?? code;
    type = err.type ?? err.code;
    message = err.message ?? message;
  } catch {
    if (body) message = body.slice(0, 200);
  }
  if (status === 429) code = code === "model_error" ? "rate_limit_error" : code;
  if (status === 503) code = code === "model_error" ? "routing_error" : code;
  return new LlmApiError({ code, message, status, type, baseUrl });
}

export function createLlmApiAdapter(options: CreateAdapterOptions): LlmApiAdapter {
  const primaryBase = options.primary ?? PRIMARY_BASE_URL;
  const fallbackBase = options.fallback ?? FALLBACK_BASE_URL;
  const apiKey = options.apiKey;
  if (!apiKey) {
    throw new LlmApiError({
      code: "config_error",
      message: "apiKey provider is required (use safeStorage / env; never hardcode)",
    });
  }

  assertSafeBaseUrl(primaryBase, "primary");
  if (fallbackBase) assertSafeBaseUrl(fallbackBase, "fallback");

  const fetchImpl: FetchLike = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const failoverStatuses = new Set(options.failoverStatuses ?? DEFAULT_FAILOVER);
  const onEvent = options.onEvent;

  const endpoints: ResolvedEndpoint[] = [
    {
      baseUrl: primaryBase,
      getKey: options.primaryKey ?? apiKey,
      label: "primary",
    },
  ];
  if (fallbackBase && fallbackBase !== primaryBase) {
    endpoints.push({
      baseUrl: fallbackBase,
      getKey: options.fallbackKey ?? apiKey,
      label: "fallback",
    });
  }

  function shouldFailover(status: number): boolean {
    return failoverStatuses.has(status);
  }

  async function requestOnce(
    ep: ResolvedEndpoint,
    path: string,
    init: {
      method: string;
      body?: unknown;
      signal?: AbortSignal;
      accept?: string;
    },
  ): Promise<Response> {
    const key = await resolveKey(ep.getKey, ep.label);
    const url = joinUrl(ep.baseUrl, path);
    // final safety: never emit to forbidden host even if config raced
    assertSafeBaseUrl(ep.baseUrl, ep.label);
    onEvent?.({ kind: "request", baseUrl: ep.baseUrl, path, model: "" });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    };
    if (init.accept) headers.Accept = init.accept;
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: init.method,
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: init.signal,
      });
    } catch (e) {
      if (init.signal?.aborted) throw e;
      throw new LlmApiError({
        code: "proxy_error",
        message: e instanceof Error ? e.message : "network error",
        baseUrl: ep.baseUrl,
      });
    }
    onEvent?.({
      kind: "response",
      baseUrl: ep.baseUrl,
      path,
      status: res.status,
    });
    // never leak Authorization in error logs
    void redactBearer(headers.Authorization);
    return res;
  }

  /**
   * POST JSON with primary→fallback failover on 429/5xx/network.
   * Returns raw Response on first 2xx (or non-failover status).
   */
  async function postJsonWithFailover(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<{ res: Response; baseUrl: string }> {
    let lastErr: unknown;
    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i]!;
      try {
        const res = await requestOnce(ep, path, { method: "POST", body, signal });
        if (res.ok) return { res, baseUrl: ep.baseUrl };
        const text = await res.text();
        const err = parseErrorBody(res.status, text, ep.baseUrl);
        const next = endpoints[i + 1];
        if (next && shouldFailover(res.status)) {
          onEvent?.({
            kind: "failover",
            from: ep.baseUrl,
            to: next.baseUrl,
            reason: err.code + (err.status ? ` ${err.status}` : ""),
          });
          lastErr = err;
          continue;
        }
        throw err;
      } catch (e) {
        if (e instanceof LlmApiError && e.code === "config_error") throw e;
        if (signal?.aborted) throw e;
        const next = endpoints[i + 1];
        const netFail = e instanceof LlmApiError && e.code === "proxy_error";
        if (next && netFail) {
          onEvent?.({
            kind: "failover",
            from: ep.baseUrl,
            to: next.baseUrl,
            reason: "proxy_error",
          });
          lastErr = e;
          continue;
        }
        if (e instanceof LlmApiError) throw e;
        throw new LlmApiError({
          code: "proxy_error",
          message: e instanceof Error ? e.message : "request failed",
          baseUrl: ep.baseUrl,
        });
      }
    }
    if (lastErr instanceof LlmApiError) throw lastErr;
    throw new LlmApiError({
      code: "routing_error",
      message: "all endpoints failed",
    });
  }

  async function getJsonWithFailover(
    path: string,
    signal?: AbortSignal,
  ): Promise<{ json: unknown; baseUrl: string }> {
    let lastErr: unknown;
    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i]!;
      try {
        const res = await requestOnce(ep, path, { method: "GET", signal });
        if (res.ok) {
          const json = await res.json();
          return { json, baseUrl: ep.baseUrl };
        }
        const text = await res.text();
        const err = parseErrorBody(res.status, text, ep.baseUrl);
        const next = endpoints[i + 1];
        if (next && shouldFailover(res.status)) {
          onEvent?.({
            kind: "failover",
            from: ep.baseUrl,
            to: next.baseUrl,
            reason: err.code,
          });
          lastErr = err;
          continue;
        }
        throw err;
      } catch (e) {
        if (signal?.aborted) throw e;
        const next = endpoints[i + 1];
        const netFail = e instanceof LlmApiError && e.code === "proxy_error";
        if (next && netFail) {
          onEvent?.({
            kind: "failover",
            from: ep.baseUrl,
            to: next.baseUrl,
            reason: "proxy_error",
          });
          lastErr = e;
          continue;
        }
        if (e instanceof LlmApiError) throw e;
        throw new LlmApiError({
          code: "proxy_error",
          message: e instanceof Error ? e.message : "request failed",
          baseUrl: ep.baseUrl,
        });
      }
    }
    if (lastErr instanceof LlmApiError) throw lastErr;
    throw new LlmApiError({ code: "routing_error", message: "all endpoints failed" });
  }

  function chatBody(req: AdapterRequest, stream: boolean): Record<string, unknown> {
    const model = modelRefToWire(req.model);
    return {
      model,
      messages: messagesToWire(req.messages),
      ...(req.tools?.length ? { tools: toolDefToWire(req.tools) } : {}),
      stream,
      ...(req.extra ?? {}),
    };
  }

  function responsesBody(req: ResponsesRequest): Record<string, unknown> {
    const model = modelRefToWire(req.model);
    const input = typeof req.input === "string" ? req.input : req.input;
    return {
      model,
      input,
      ...(req.tools?.length ? { tools: toolDefToWire(req.tools) } : {}),
      ...(req.max_output_tokens !== undefined
        ? { max_output_tokens: req.max_output_tokens }
        : {}),
      ...(req.extra ?? {}),
    };
  }

  async function chat(req: AdapterRequest, signal?: AbortSignal): Promise<NormalizedResult> {
    const body = chatBody(req, false);
    const { res, baseUrl } = await postJsonWithFailover("/v1/chat/completions", body, signal);
    const json = (await res.json()) as WireChatResponse;
    const acc = normalizeChatResponse(json, baseUrl);
    if (json.model) acc.model = json.model;
    return acc;
  }

  async function* chatStream(
    req: AdapterRequest,
    signal?: AbortSignal,
  ): AsyncIterable<NormalizedChunk> {
    const body = chatBody(req, true);
    const { res, baseUrl } = await postJsonWithFailover("/v1/chat/completions", body, signal);
    if (!res.body) {
      yield { type: "error", error: { code: "proxy_error", message: "empty stream body" } };
      return;
    }
    const acc = emptyAccumulator("", baseUrl);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawThought = false;
    let sawText = false;
    const emittedTools = new Set<string>();

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE events separated by blank lines; also handle inline data: lines
        const blocks = buffer.split(/\n\n|\r\n\r\n/);
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          for (const payload of parseSseDataBlock(block)) {
            const chunk = payload as WireChatResponse;
            if (chunk.model) acc.model = chunk.model;
            const choice = chunk.choices?.[0];
            const beforeThought = acc.thought.length;
            const beforeText = acc.text.length;
            foldChatDelta(acc, choice?.delta as WireChatMessage | undefined);
            if (choice?.finish_reason) acc.finishReason = choice.finish_reason;
            if (acc.thought.length > beforeThought && !sawThought) {
              sawThought = true;
            }
            if (acc.text.length > beforeText && !sawText) {
              sawText = true;
            }
            // emit incremental thought/text
            if (acc.thought.length > beforeThought) {
              yield {
                type: "thought",
                text: acc.thought.slice(beforeThought),
                model: acc.model || undefined,
              };
            }
            if (acc.text.length > beforeText) {
              yield {
                type: "text",
                text: acc.text.slice(beforeText),
                model: acc.model || undefined,
              };
            }
            for (let ti = 0; ti < acc.toolCalls.length; ti++) {
              const tc = acc.toolCalls[ti]!;
              if (!emittedTools.has(tc.id)) {
                emittedTools.add(tc.id);
                yield { type: "tool_call", toolCall: tc, model: acc.model || undefined };
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    // flush leftover
    if (buffer.trim()) {
      for (const payload of parseSseDataBlock(buffer)) {
        const chunk = payload as WireChatResponse;
        if (chunk.model) acc.model = chunk.model;
        foldChatDelta(acc, chunk.choices?.[0]?.delta as WireChatMessage | undefined);
      }
      for (const tc of acc.toolCalls) {
        if (!emittedTools.has(tc.id)) {
          emittedTools.add(tc.id);
          yield { type: "tool_call", toolCall: tc, model: acc.model || undefined };
        }
      }
    }
    yield {
      type: "done",
      model: acc.model || undefined,
      raw: { finishReason: acc.finishReason },
    };
  }

  async function responses(
    req: ResponsesRequest,
    signal?: AbortSignal,
  ): Promise<NormalizedResult> {
    const body = responsesBody(req);
    const { res, baseUrl } = await postJsonWithFailover("/v1/responses", body, signal);
    const json = (await res.json()) as WireResponsesResponse;
    const acc = normalizeResponsesResponse(json, baseUrl);
    if (json.model) acc.model = json.model;
    return acc;
  }

  async function listModels(signal?: AbortSignal): Promise<string[]> {
    const { json } = await getJsonWithFailover("/v1/models", signal);
    const data = (json as { data?: Array<{ id?: string }> }).data ?? [];
    return data.map((m) => m.id ?? "").filter(Boolean);
  }

  return { chat, chatStream, responses, listModels };
}

export type { ToolCall };
