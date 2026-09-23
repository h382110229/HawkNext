/**
 * Shared test helpers: mock fetch, fixtures. No real keys here.
 */
import type { FetchLike } from "../src/types.ts";

export function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
  });
}

export function sseResponse(lines: string[]): Response {
  const body = lines.join("\n") + "\n";
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

export interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export function mockFetch(
  handler: (req: RecordedRequest, n: number) => Response | Promise<Response>,
): { fetchImpl: FetchLike; calls: RecordedRequest[] } {
  const calls: RecordedRequest[] = [];
  let n = 0;
  const fetchImpl: FetchLike = async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const headers: Record<string, string> = {};
    const h = init?.headers;
    if (h) {
      if (h instanceof Headers) h.forEach((v, k) => (headers[k] = v));
      else if (Array.isArray(h)) for (const [k, v] of h) headers[k] = v;
      else Object.assign(headers, h);
    }
    let body: unknown = undefined;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const rec: RecordedRequest = {
      url,
      method: init?.method ?? "GET",
      headers,
      body,
    };
    calls.push(rec);
    return handler(rec, n++);
  };
  return { fetchImpl, calls };
}

export const TEST_KEY = "as-test-key-not-real-00000000000000000000000000000000000000000000000000";

export const MEMO_TOOL = {
  type: "function" as const,
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

export const WRITE_TOOL = {
  type: "function" as const,
  function: {
    name: "write_file",
    description: "Write a file",
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

export const PATCH_TOOL = {
  type: "function" as const,
  function: {
    name: "apply_patch",
    description: "Apply a patch",
    parameters: {
      type: "object",
      properties: { patch: { type: "string" } },
      required: ["patch"],
    },
  },
};
