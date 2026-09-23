/**
 * zcode driver provider preset — llmapi as sole Coding egress.
 * Wire format matches vendor/zcode provider-data-schema (OpenAI-compatible).
 */
import {
  AUTO_MODEL_ID,
  FALLBACK_BASE_URL,
  PRIMARY_BASE_URL,
  assertSafeBaseUrl,
  type ApiKeyProvider,
} from "../../llmapi-adapter/src/index.ts";

export const LLMAPI_PROVIDER_ID = "hawknext-llmapi";
export const LLMAPI_PROVIDER_NAME = "HawkNext LLMAPI";

/** Models exposed in the Coding picker (Auto first — iron rule). */
export const CODING_MODEL_IDS = [
  AUTO_MODEL_ID,
  "mimo-v2.5-pro",
  "mimo-v2.6-flash",
  "mimo-v2.6-pro",
] as const;

export type CodingModelId = (typeof CODING_MODEL_IDS)[number];

export interface ZcodeProviderPreset {
  id: string;
  name: string;
  api: {
    type: "official-model-chat-completions" | "openai-compatible";
    baseUrl: string;
  };
  builtinModelIds: string[];
  /** Secondary base for failover (adapter layer). */
  fallbackBaseUrl?: string;
  defaultModel: string;
}

export interface PresetOptions {
  baseUrl?: string;
  fallbackBaseUrl?: string;
  modelIds?: string[];
}

/**
 * Build the llmapi provider preset injected into zcode driver / builtin config.
 * Never points at official hosts (guard throws).
 */
export function buildLlmApiProviderPreset(opts: PresetOptions = {}): ZcodeProviderPreset {
  const baseUrl = opts.baseUrl ?? PRIMARY_BASE_URL;
  const fallbackBaseUrl = opts.fallbackBaseUrl ?? FALLBACK_BASE_URL;
  assertSafeBaseUrl(baseUrl, "provider.baseUrl");
  if (fallbackBaseUrl) assertSafeBaseUrl(fallbackBaseUrl, "provider.fallbackBaseUrl");

  const modelIds = [...(opts.modelIds ?? CODING_MODEL_IDS)];
  if (!modelIds.includes(AUTO_MODEL_ID)) {
    modelIds.unshift(AUTO_MODEL_ID);
  }

  return {
    id: LLMAPI_PROVIDER_ID,
    name: LLMAPI_PROVIDER_NAME,
    api: {
      type: "official-model-chat-completions",
      baseUrl,
    },
    builtinModelIds: modelIds,
    fallbackBaseUrl,
    defaultModel: AUTO_MODEL_ID,
  };
}

/**
 * JSON snippet compatible with `config/provider/hawknext-builtin.json` templateRules entry.
 * Used to patch vendor builtin config for Coding default.
 */
export function toBuiltinTemplateRule(preset: ZcodeProviderPreset): Record<string, unknown> {
  return {
    templateId: "hawknext-llmapi",
    templateNameMap: {
      "zh-CN": "HawkNext LLMAPI",
      "en-US": "HawkNext LLMAPI",
    },
    config: {
      access: {
        type: "api-key",
        apiKeyManagementUrl: "",
      },
      api: {
        type: "official-model-chat-completions",
        baseUrl: preset.api.baseUrl,
      },
      builtinModelIds: [...preset.builtinModelIds],
      defaultModel: preset.defaultModel,
    },
  };
}

/** Credential env injection (driver child process only; scrub on exit). */
export function llmApiEnvForDriver(key: string): Record<string, string> {
  return {
    HAWKNEXT_LLMAPI_API_KEY: key,
    HAWKNEXT_LLMAPI_PRIMARY: PRIMARY_BASE_URL,
    HAWKNEXT_LLMAPI_FALLBACK: FALLBACK_BASE_URL,
    HAWKNEXT_DEFAULT_MODEL: AUTO_MODEL_ID,
  };
}

export function createKeyProvider(
  from: () => string | undefined,
): ApiKeyProvider {
  return () => {
    const k = from();
    if (!k) {
      throw new Error(
        "HawkNext LLMAPI key missing (safeStorage / HAWKNEXT_LLMAPI_API_KEY); refuse silent official fallback",
      );
    }
    return k;
  };
}
