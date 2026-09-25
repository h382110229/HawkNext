import { CLOUD_CN_PROVIDER_ID, CLOUD_INTL_PROVIDER_ID, type ApiClient } from "@hawknext/shared";
import type { OAuthRuntimeConfig } from "../runtimeConfig.js";
import { CloudCNProviderAdapter } from "./cloud-cnProviderAdapter.js";
import type { OAuthProviderAdapter } from "./providerAdapter.js";
import { ZaiProviderAdapter } from "./zaiProviderAdapter.js";

/** 根据运行时配置创建可用 provider adapter */
export function createOAuthProviderAdapters(
  config: OAuthRuntimeConfig,
  options: { apiClient?: ApiClient } = {},
): OAuthProviderAdapter[] {
  const adapters: OAuthProviderAdapter[] = [];
  const apiClient = options.apiClient;
  if (!apiClient) {
    throw new Error(
      "ApiClient 注入缺失：OAuth provider adapters 必须通过 Providers 传入 apiClient",
    );
  }

  for (const providerConfig of config.providers) {
    switch (providerConfig.id) {
      case CLOUD_CN_PROVIDER_ID:
        adapters.push(new CloudCNProviderAdapter(providerConfig, apiClient));
        break;
      case CLOUD_INTL_PROVIDER_ID:
        adapters.push(new ZaiProviderAdapter(providerConfig, apiClient));
        break;
      default:
        // 未知 provider 直接忽略，避免单个配置错误拖垮全部登录能力。
        break;
    }
  }

  return adapters;
}

export type { OAuthProviderAdapter, OAuthProviderContext } from "./providerAdapter.js";
