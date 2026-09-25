import type { HawkNextEnv } from "./env.js";

export const DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN = "https://llmapi.hawkren.online";
export const DEFAULT_CLOUD_CN_API_ORIGIN = "https://llmapi.hawkren.online";
export const DEFAULT_CLOUD_INTL_OAUTH_ORIGIN = "https://llmapi.hawkren.online";
export const DEFAULT_CLOUD_INTL_BUSINESS_BASE_URL = "https://llmapi.hawkren.online";
export const DEFAULT_CLOUD_INTL_OAUTH_CLIENT_ID = "hawknext-local";

// 构建仅注入公开链接；Node 调用方仍可显式传 env，避免读取另一进程的配置。
declare const __HAWKNEXT_ENDPOINT_ENV__: Record<string, string | undefined> | undefined;
export function pickProductEndpointEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const keys = [
    "HAWKNEXT_BASE_URL",
    "HAWKNEXT_ENDPOINT_ORIGIN",
    "CLOUD_CN_API_BASE_URL",
    "CLOUD_INTL_OAUTH_ORIGIN",
    "CLOUD_INTL_BUSINESS_BASE_URL",
    "CLOUD_INTL_OAUTH_CLIENT_ID",
    "ZAI_OAUTH_APP_ID",
  ];
  return Object.fromEntries(
    keys.flatMap((key) => (env[key]?.trim() ? [[key, env[key]!.trim()]] : [])),
  );
}
export function readProductEndpointEnv(): Record<string, string | undefined> {
  return {
    ...(typeof __HAWKNEXT_ENDPOINT_ENV__ === "undefined" ? {} : __HAWKNEXT_ENDPOINT_ENV__),
    ...pickProductEndpointEnv(typeof process === "undefined" ? {} : process.env),
  };
}

export interface HawkNextEndpointUrls {
  origin: string;
  apiBaseUrl: string;
  webShareCallbackUrl: string;
  hawknextPlanOpenAiBaseUrl: string;
  hawknextPlanAnthropicBaseUrl: string;
  hawknextPlanBillingCurrentUrl: string;
  hawknextPlanBillingBalanceUrl: string;
}

export interface RuntimeHawkNextEndpointEnv {
  [key: string]: string | undefined;
  HAWKNEXT_ENV?: string;
  HAWKNEXT_BASE_URL?: string;
  HAWKNEXT_ENDPOINT_ORIGIN?: string;
}

export interface RuntimeCloudCNApiEnv {
  [key: string]: string | undefined;
  HAWKNEXT_ENV?: string;
  CLOUD_CN_API_BASE_URL?: string;
}

export interface RuntimeZaiEndpointEnv {
  [key: string]: string | undefined;
  HAWKNEXT_ENV?: string;
  CLOUD_INTL_OAUTH_ORIGIN?: string;
  CLOUD_INTL_BUSINESS_BASE_URL?: string;
  CLOUD_INTL_OAUTH_CLIENT_ID?: string;
  ZAI_OAUTH_APP_ID?: string;
}

export interface RuntimeProductEndpointEnv
  extends RuntimeHawkNextEndpointEnv, RuntimeCloudCNApiEnv, RuntimeZaiEndpointEnv {}

export interface RuntimeProductEndpointConfig {
  hawknextEnv: HawkNextEnv;
  hawknextEndpointOrigin: string;
  hawknextEndpointUrls: HawkNextEndpointUrls;
  cloudOAuthOrigin: string;
  zaiBusinessBaseUrl: string;
  cloudOAuthClientId: string;
  cloudCnApiOrigin: string;
}

function readRuntimeEnvValue(
  env: Record<string, string | undefined>,
  key: string,
): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

export function normalizeHawkNextEndpointOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("HawkNext endpoint origin is empty");
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("HawkNext endpoint origin must use http or https");
  }
  return parsed.origin;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isTrustedCodingPlanWebviewOrigin(
  value: string | null | undefined,
  options?: {
    e2eStoreBridgeEnabled?: boolean;
  },
): boolean {
  if (!value) return false;
  try {
    const origin = normalizeHawkNextEndpointOrigin(value);
    if (
      origin === DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN ||
      origin === resolveRuntimeHawkNextEndpointOrigin()
    ) {
      return true;
    }
    const parsed = new URL(origin);
    return options?.e2eStoreBridgeEnabled === true && isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveHawkNextEndpointOrigin(options?: {
  env?: HawkNextEnv;
  envBaseOrigin?: string | null;
  overrideOrigin?: string | null;
}): string {
  const origin = options?.overrideOrigin?.trim() || options?.envBaseOrigin?.trim();
  return origin ? normalizeHawkNextEndpointOrigin(origin) : DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN;
}

export function resolveRuntimeHawkNextEnv(
  env: RuntimeHawkNextEndpointEnv = readProductEndpointEnv(),
): HawkNextEnv {
  // 产品身份仅用于既有展示与安装标识，不参与地址解析。
  return env.HAWKNEXT_ENV?.trim().toLowerCase() === "test" ? "test" : "production";
}

export function resolveRuntimeHawkNextEndpointOrigin(
  env: RuntimeHawkNextEndpointEnv = readProductEndpointEnv(),
  options?: { overrideOrigin?: string | null },
): string {
  return resolveHawkNextEndpointOrigin({
    envBaseOrigin:
      readRuntimeEnvValue(env, "HAWKNEXT_BASE_URL") ??
      readRuntimeEnvValue(env, "HAWKNEXT_ENDPOINT_ORIGIN"),
    overrideOrigin: options?.overrideOrigin,
  });
}

export function buildRuntimeHawkNextEndpointUrls(
  env: RuntimeHawkNextEndpointEnv = readProductEndpointEnv(),
): HawkNextEndpointUrls {
  return buildHawkNextEndpointUrls(resolveRuntimeHawkNextEndpointOrigin(env));
}

export function buildRuntimeHawkNextApiUrl(
  env: RuntimeHawkNextEndpointEnv = readProductEndpointEnv(),
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveRuntimeHawkNextEndpointOrigin(env)}${normalizedPath}`;
}

export function resolveCloudCNApiOrigin(
  env: RuntimeCloudCNApiEnv = readProductEndpointEnv(),
): string {
  return normalizeHawkNextEndpointOrigin(
    readRuntimeEnvValue(env, "CLOUD_CN_API_BASE_URL") ?? DEFAULT_CLOUD_CN_API_ORIGIN,
  );
}

export function buildCloudCNApiUrl(
  env: RuntimeCloudCNApiEnv = readProductEndpointEnv(),
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveCloudCNApiOrigin(env)}${normalizedPath}`;
}

export function buildCloudCNCodingPlanPersonalManageUrl(
  env: RuntimeCloudCNApiEnv = readProductEndpointEnv(),
): string {
  // 管理页与业务 API 共用显式 origin，避免把已登录账号带到另一个部署。
  return buildCloudCNApiUrl(env, "/coding-plan/personal/overview");
}

export function buildCloudCNCodingPlanTeamManageUrl(
  env: RuntimeCloudCNApiEnv = readProductEndpointEnv(),
): string {
  return buildCloudCNApiUrl(env, "/coding-plan/team/plans");
}

export function resolveCloudOAuthOrigin(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
): string {
  return normalizeHawkNextEndpointOrigin(
    readRuntimeEnvValue(env, "CLOUD_INTL_OAUTH_ORIGIN") ?? DEFAULT_CLOUD_INTL_OAUTH_ORIGIN,
  );
}

export function resolveZaiBusinessBaseUrl(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
): string {
  return normalizeHawkNextEndpointOrigin(
    readRuntimeEnvValue(env, "CLOUD_INTL_BUSINESS_BASE_URL") ?? DEFAULT_CLOUD_INTL_BUSINESS_BASE_URL,
  );
}

export function resolveCloudOAuthClientId(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
): string {
  return (
    readRuntimeEnvValue(env, "CLOUD_INTL_OAUTH_CLIENT_ID") ??
    readRuntimeEnvValue(env, "ZAI_OAUTH_APP_ID") ??
    DEFAULT_CLOUD_INTL_OAUTH_CLIENT_ID
  );
}

export function buildCloudOAuthUrl(origin: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeHawkNextEndpointOrigin(origin)}${normalizedPath}`;
}

export function buildRuntimeCloudOAuthUrl(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
  path: string,
): string {
  return buildCloudOAuthUrl(resolveCloudOAuthOrigin(env), path);
}

export function buildRuntimeZaiBusinessUrl(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveZaiBusinessBaseUrl(env)}${normalizedPath}`;
}

export function resolveRuntimeProductEndpointConfig(
  env: RuntimeProductEndpointEnv = readProductEndpointEnv(),
): RuntimeProductEndpointConfig {
  const hawknextEnv = resolveRuntimeHawkNextEnv(env);
  const hawknextEndpointOrigin = resolveRuntimeHawkNextEndpointOrigin(env);

  return {
    hawknextEnv,
    hawknextEndpointOrigin,
    hawknextEndpointUrls: buildHawkNextEndpointUrls(hawknextEndpointOrigin),
    cloudOAuthOrigin: resolveCloudOAuthOrigin(env),
    zaiBusinessBaseUrl: resolveZaiBusinessBaseUrl(env),
    cloudOAuthClientId: resolveCloudOAuthClientId(env),
    cloudCnApiOrigin: resolveCloudCNApiOrigin(env),
  };
}

export function buildHawkNextEndpointUrls(origin: string): HawkNextEndpointUrls {
  const normalizedOrigin = normalizeHawkNextEndpointOrigin(origin);
  return {
    origin: normalizedOrigin,
    apiBaseUrl: `${normalizedOrigin}/api/v1`,
    webShareCallbackUrl: `${normalizedOrigin}/cn/share/callback`,
    hawknextPlanOpenAiBaseUrl: `${normalizedOrigin}/api/v1/hawknext-plan`,
    hawknextPlanAnthropicBaseUrl: `${normalizedOrigin}/api/v1/hawknext-plan/anthropic`,
    hawknextPlanBillingCurrentUrl: `${normalizedOrigin}/api/v1/hawknext-plan/billing/current`,
    hawknextPlanBillingBalanceUrl: `${normalizedOrigin}/api/v1/hawknext-plan/billing/balance`,
  };
}

export function rewriteHawkNextEndpointUrl(input: string | URL, endpointOrigin: string): string | URL {
  const originalUrl = typeof input === "string" ? input : input.toString();
  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return input;
  }
  const sourceOrigin = DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN;
  if (parsed.origin !== sourceOrigin) {
    return input;
  }

  const targetOrigin = normalizeHawkNextEndpointOrigin(endpointOrigin);
  if (targetOrigin === sourceOrigin) {
    return input;
  }

  const target = new URL(targetOrigin);
  target.pathname = parsed.pathname;
  target.search = parsed.search;
  target.hash = parsed.hash;
  return target.toString();
}
