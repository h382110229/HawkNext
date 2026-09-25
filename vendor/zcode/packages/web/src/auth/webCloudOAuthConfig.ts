import type { WebCloudOAuthProviderConfig } from "./cloudWebOAuthProvider.js";
import {
  buildHawkNextEndpointUrls,
  DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN,
  resolveCloudCNApiOrigin,
} from "@hawknext/shared";

interface WebImportMetaEnv {
  VITE_DEV_ORIGIN?: string;
  VITE_CLOUD_INTL_OAUTH_CLIENT_ID?: string;
  VITE_CLOUD_INTL_OAUTH_ORIGIN?: string;
  VITE_CLOUD_CN_OAUTH_ORIGIN?: string;
  VITE_CLOUD_CN_OAUTH_APP_ID?: string;
  VITE_HAWKNEXT_BASE_URL?: string;
  VITE_HAWKNEXT_ENDPOINT_ORIGIN?: string;
  VITE_WEB_REMOTE_ALLOW_DEV_RETURN_TO?: string;
}

export interface WebCloudOAuthConfig extends WebCloudOAuthProviderConfig {
  devOrigin?: string;
  shareRedirectUri: string;
  allowDevReturnToRedirect: boolean;
}

function normalizeCloudOAuthOrigin(value: string): string {
  return new URL(value.trim()).origin;
}

function buildCloudOAuthAuthorizeUrl(origin: string | undefined): string {
  return `${normalizeCloudOAuthOrigin(origin?.trim() || "")}/api/oauth/authorize`;
}

/**
 * CloudCN 的授权入口。
 *
 * 必须跟随环境：测试环境写死  会把测试账号带到生产授权页。构建期由
 * vite.config 用 resolveCloudCNApiOrigin 注入 VITE_CLOUD_CN_OAUTH_ORIGIN；这里的
 * resolveCloudCNApiOrigin({}) 只是最后兜底（等价于生产 origin）。
 */
function buildCloudCNAuthorizeUrl(origin: string | undefined): string {
  const trimmed = origin?.trim();
  return `${trimmed ? new URL(trimmed).origin : resolveCloudCNApiOrigin({})}/login`;
}

function createWebCloudOAuthConfig(env: WebImportMetaEnv = {}): WebCloudOAuthConfig {
  const devOrigin = env.VITE_DEV_ORIGIN?.trim().replace(/\/$/, "");
  const hawknextEndpointUrls = buildHawkNextEndpointUrls(
    env.VITE_HAWKNEXT_BASE_URL?.trim() ||
      env.VITE_HAWKNEXT_ENDPOINT_ORIGIN?.trim() ||
      DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN,
  );

  return {
    // ZAI 当前 OAuth 授权入口使用 /api/oauth 前缀，继续走 /auth/oauth 会打开旧入口。
    authorizeUrl: buildCloudOAuthAuthorizeUrl(env.VITE_CLOUD_INTL_OAUTH_ORIGIN),
    tokenUrl: "/api/v1/oauth/token",
    // client_id 会出现在授权 URL 中，属于公开配置；这里允许 VITE_ 注入，但不能放 secret/token。
    clientId: env.VITE_CLOUD_INTL_OAUTH_CLIENT_ID?.trim() || "",
    cloudCnAuthorizeUrl: buildCloudCNAuthorizeUrl(env.VITE_CLOUD_CN_OAUTH_ORIGIN),
    // CloudCN 用 appId 而不是 client_id，且默认值就是桌面端在用的 "hawknext"。
    cloudCnAppId: env.VITE_CLOUD_CN_OAUTH_APP_ID?.trim() || "hawknext",
    redirectUri: hawknextEndpointUrls.webShareCallbackUrl,
    shareRedirectUri: hawknextEndpointUrls.webShareCallbackUrl,
    ...(devOrigin ? { devOrigin } : {}),
    allowDevReturnToRedirect: env.VITE_WEB_REMOTE_ALLOW_DEV_RETURN_TO === "true",
  };
}

const env = ((import.meta as ImportMeta & { env?: WebImportMetaEnv }).env ??
  {}) as WebImportMetaEnv;

export const WEB_ZAI_OAUTH_CONFIG: WebCloudOAuthConfig = createWebCloudOAuthConfig(env);

export function resolveWebAuthDevReturnTo(config: WebCloudOAuthConfig): string | undefined {
  return config.devOrigin ? `${config.devOrigin}/share/callback` : undefined;
}
