import { CLOUD_CN_PROVIDER_ID, buildCloudCNApiUrl } from "@hawknext/shared";
import type { OAuthProviderRuntimeConfig } from "../runtimeConfig.js";
import {
  buildDesktopOAuthRedirectUriFromEnv,
  buildHawkNextApiUrlFromEnv,
  readBoolean,
  readEnv,
} from "./configUtils.js";

const CLOUD_CN_USERINFO_PATH = "/api/biz/customer/getCustomerInfo";
const CLOUD_CN_AUTHORIZE_PATH = "/login";

const CLOUD_CN_OAUTH_PROVIDER_CONFIG: Omit<OAuthProviderRuntimeConfig, "appSecret"> = {
  id: CLOUD_CN_PROVIDER_ID,
  displayName: "CloudCN",
  enabled: true,
  order: 0,
  authorizeUrl: "/login",
  tokenUrl: "/api/v1/oauth/token",
  userinfoUrl: buildCloudCNApiUrl({ HAWKNEXT_ENV: "production" }, CLOUD_CN_USERINFO_PATH),
  appId: "hawknext",
  redirectUri: "hawknext://oauth/callback",
};

export function createCloudCNProviderRuntimeConfig(
  env: NodeJS.ProcessEnv,
): OAuthProviderRuntimeConfig {
  return {
    ...CLOUD_CN_OAUTH_PROVIDER_CONFIG,
    enabled: readBoolean(env, "CLOUD_CN_OAUTH_ENABLED", CLOUD_CN_OAUTH_PROVIDER_CONFIG.enabled),
    authorizeUrl:
      readEnv(env, "CLOUD_CN_OAUTH_AUTHORIZE_URL") ??
      buildCloudCNApiUrl(env, CLOUD_CN_AUTHORIZE_PATH),
    tokenUrl:
      readEnv(env, "CLOUD_CN_OAUTH_TOKEN_URL") ??
      buildHawkNextApiUrlFromEnv(env, "/api/v1/oauth/token"),
    userinfoUrl: resolveCloudCNUserinfoUrl(env),
    appId: readEnv(env, "CLOUD_CN_OAUTH_APP_ID") ?? CLOUD_CN_OAUTH_PROVIDER_CONFIG.appId,
    redirectUri: buildDesktopOAuthRedirectUriFromEnv(env),
    // 历史 fallback secret 已废弃，不能再把内置密钥打进运行时配置。
    // 当前 CloudCN callback 只消费 hawknext OAuth token 路由，显式 appSecret 仅保留给
    // 旧接口兼容场景，缺失时必须保持 undefined。
    appSecret: readEnv(env, "CLOUD_CN_OAUTH_APP_SECRET"),
  };
}

export function resolveCloudCNUserinfoUrl(env: NodeJS.ProcessEnv): string {
  return (
    readEnv(env, "CLOUD_CN_OAUTH_USERINFO_URL") ?? buildCloudCNApiUrl(env, CLOUD_CN_USERINFO_PATH)
  );
}
