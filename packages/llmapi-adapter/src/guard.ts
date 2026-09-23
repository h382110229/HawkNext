import { LlmApiError } from "./errors.ts";

/**
 * Forbidden egress hosts (iron rule: never silently call official endpoints).
 * Allow only explicitly configured llmapi / private bases.
 */
const FORBIDDEN_HOST_RE =
  /(^|\.)(api\.openai\.com|auth\.openai\.com|chatgpt\.com|releases\.openai\.com|z\.ai|chat\.z\.ai|api\.z\.ai|cdn-zcode\.z\.ai|zcode\.z\.ai|open\.bigmodel\.cn|bigmodel\.cn)$/i;

export function isForbiddenHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return FORBIDDEN_HOST_RE.test(h);
}

/** Validate and normalize a base URL. Throws on forbidden or non-http(s). */
export function assertSafeBaseUrl(baseUrl: string, label = "baseUrl"): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new LlmApiError({
      code: "config_error",
      message: `${label} is not a valid URL`,
    });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new LlmApiError({
      code: "config_error",
      message: `${label} must be http(s)`,
    });
  }
  if (isForbiddenHost(url.hostname)) {
    throw new LlmApiError({
      code: "config_error",
      message: `${label} host is forbidden (official endpoints are never default egress): ${url.hostname}`,
    });
  }
  return url;
}

/** Join base + path without double slashes. */
export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Redact a bearer for logs. */
export function redactBearer(headerValue: string | undefined | null): string {
  if (!headerValue) return "<missing>";
  const m = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  const raw = m ? m[1]! : headerValue;
  if (raw.length <= 8) return "***";
  return `${raw.slice(0, 4)}…${raw.slice(-4)} (len=${raw.length})`;
}
