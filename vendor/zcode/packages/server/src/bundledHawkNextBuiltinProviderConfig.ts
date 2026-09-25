import { materializeHawkNextBuiltinProviderConfig } from "@hawknext/services/node";

declare const __HAWKNEXT_BUILTIN_PROVIDER_CONFIG_JSON__: string | undefined;

interface MaterializeBundledHawkNextBuiltinProviderConfigOptions {
  readonly environmentConfigRoot: string;
  readonly content: string;
}

/** 返回构建时嵌入远端 Server 的 HawkNext Built-in Provider Config。 */
export function readBundledHawkNextBuiltinProviderConfig(): string {
  if (typeof __HAWKNEXT_BUILTIN_PROVIDER_CONFIG_JSON__ !== "string") {
    throw new Error("当前构建未嵌入 HawkNext Built-in Provider Config");
  }
  return __HAWKNEXT_BUILTIN_PROVIDER_CONFIG_JSON__;
}

/**
 * 将 HawkNext Built-in Config 原子物化到所属环境的固定资源副本。
 * 升级前退出旧进程；不保留按内容 hash 增长的历史文件。
 */
export async function materializeBundledHawkNextBuiltinProviderConfig(
  options: MaterializeBundledHawkNextBuiltinProviderConfigOptions,
): Promise<string> {
  return materializeHawkNextBuiltinProviderConfig(options);
}
