/**
 * LLMAPI failover transport — sole official-free egress for HawkNext.
 * primary llmapi.hawkren.online → fallback llmapi.ashawk.online on 429/5xx/network.
 * Never silently redirects to api.openai.com / z.ai (iron rule).
 */

type FetchLike = typeof globalThis.fetch;

export const LLMAPI_PRIMARY = "https://llmapi.hawkren.online";
export const LLMAPI_FALLBACK = "https://llmapi.ashawk.online";

const FORBIDDEN_HOST_RE =
  /(^|\.)(api\.openai\.com|auth\.openai\.com|chatgpt\.com|releases\.openai\.com|z\.ai|chat\.z\.ai|api\.z\.ai|cdn-zcode\.z\.ai|zcode\.z\.ai|open\.bigmodel\.cn|bigmodel\.cn)$/i;

export function isLlmApiHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "llmapi.hawkren.online" || h === "llmapi.ashawk.online";
}

export function isForbiddenModelHost(hostname: string): boolean {
  return FORBIDDEN_HOST_RE.test(hostname.toLowerCase().replace(/\.$/, ""));
}

export interface LlmApiFailoverOptions {
  primary?: string;
  fallback?: string;
  failoverStatuses?: number[];
  onFailover?: (from: string, to: string, status: number) => void;
}

/**
 * Wrap fetch: only for llmapi hosts. On failover status (429/5xx), retry fallback.
 */
export function createLlmApiFailoverFetch(
  base: FetchLike | undefined,
  opts: LlmApiFailoverOptions = {},
): FetchLike {
  const fetchImpl: FetchLike = base ?? globalThis.fetch.bind(globalThis);
  const primary = opts.primary ?? LLMAPI_PRIMARY;
  const fallback = opts.fallback ?? LLMAPI_FALLBACK;
  const failover = new Set(opts.failoverStatuses ?? [429, 500, 502, 503, 504]);

  return async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return fetchImpl(input, init);
    }

    if (isForbiddenModelHost(parsed.hostname)) {
      throw new Error(
        `HawkNext refuses silent official egress: ${parsed.hostname} (use llmapi only)`,
      );
    }
    const isLlm =
      isLlmApiHost(parsed.hostname) ||
      url.startsWith(primary) ||
      url.startsWith(fallback);
    if (!isLlm) {
      return fetchImpl(input, init);
    }

    const attempt = async (target: string): Promise<Response> => {
      const targetHost = new URL(target).hostname;
      const swapped = url.replace(parsed.hostname, targetHost);
      return fetchImpl(swapped, init);
    };

    let res: Response;
    try {
      res = await attempt(primary);
    } catch {
      opts.onFailover?.(primary, fallback, 0);
      return attempt(fallback);
    }
    if (failover.has(res.status)) {
      opts.onFailover?.(primary, fallback, res.status);
      return attempt(fallback);
    }
    return res;
  };
}

/** Force wire model id to Auto when empty/unknown single-pin is not requested. */
export function normalizeWireModelId(modelId: string | undefined | null): string {
  const id = (modelId ?? "").trim();
  if (!id || id.toLowerCase() === "auto") return "Auto";
  if (/^mimo-v\d/i.test(id)) return id;
  return "Auto";
}
