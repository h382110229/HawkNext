import {
  BUILTIN_PROVIDER_TEMPLATE_IDS,
  type AppSettings,
  type Locale,
  type ProviderFamilyDomain,
} from "@hawknext/shared";
import type { ModelSelectionView } from "@hawknext/services";
import { encodeCustomModelValue } from "@/lib/hawknextCustomModelValue.js";

export type ApiKeyProviderChoice = "zai" | "cloud-cn";

export function resolveLoginApiKeyDefaultProvider(locale: Locale): ApiKeyProviderChoice {
  return locale === "zh-CN" ? "cloud-cn" : "zai";
}

export function resolveLoginApiKeyTemplateId(
  choice: ApiKeyProviderChoice,
): "zai-api" | "cloud-cn-api" {
  return choice === "zai"
    ? BUILTIN_PROVIDER_TEMPLATE_IDS.zai
    : BUILTIN_PROVIDER_TEMPLATE_IDS.cloudCn;
}

export function resolveLoginApiKeyProviderLabel(choice: ApiKeyProviderChoice): string {
  // Welcome Screen API Key 错误提示需要使用 CloudCN 品牌固定写法。
  return choice === "zai" ? "" : "CloudCN";
}

function resolveLoginApiKeyProviderFamilyDomain(
  choice: ApiKeyProviderChoice,
): ProviderFamilyDomain {
  return choice;
}

export function buildLoginApiKeySkipSettings(
  choice: ApiKeyProviderChoice,
  now: number,
): Pick<
  AppSettings,
  "providerFamilyDomain" | "providerFamilyDomainUpdatedAt" | "providerFamilyDomainMigrated"
> {
  return {
    providerFamilyDomain: resolveLoginApiKeyProviderFamilyDomain(choice),
    providerFamilyDomainUpdatedAt: now,
    providerFamilyDomainMigrated: true,
  };
}

export function shouldShowLoginApiKeyLink(
  apiKeyValue: string,
  apiKeyUrl: string | undefined,
): boolean {
  return Boolean(apiKeyUrl) && apiKeyValue.trim().length === 0;
}

export function buildLoginApiKeyDefaultModelPreferenceFromSelection(
  view: ModelSelectionView,
  providerId: string,
): string | null {
  const firstModel = view.providers.find((provider) => provider.providerId === providerId)
    ?.models[0]?.modelId;
  return firstModel ? encodeCustomModelValue(providerId, firstModel) : null;
}
