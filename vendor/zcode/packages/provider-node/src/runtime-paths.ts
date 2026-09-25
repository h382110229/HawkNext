export const HAWKNEXT_BUILTIN_PROVIDER_CONFIG_FILE_ENV = "HAWKNEXT_BUILTIN_PROVIDER_CONFIG_FILE";
export const HAWKNEXT_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV =
  "HAWKNEXT_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE";
export const HAWKNEXT_PERSONAL_PROVIDER_CONFIG_FILE_ENV = "HAWKNEXT_PERSONAL_PROVIDER_CONFIG_FILE";
export const PERSONAL_PROVIDER_CONFIG_FILE_NAME = "provider_config.json";

export interface NodeProviderRuntimePaths {
  readonly hawknextBuiltinFilePath: string;
  readonly personalFilePath: string;
}

export function createNodeProviderRuntimePathEnv(
  paths: NodeProviderRuntimePaths,
): Record<string, string> {
  return {
    [HAWKNEXT_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: paths.hawknextBuiltinFilePath,
    [HAWKNEXT_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: paths.personalFilePath,
  };
}

export function resolveNodeProviderRuntimePaths(
  env: Readonly<Record<string, string | undefined>>,
): NodeProviderRuntimePaths | null {
  const hawknextBuiltinFilePath = env[HAWKNEXT_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
  const personalFilePath = env[HAWKNEXT_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
  if (!hawknextBuiltinFilePath && !personalFilePath) return null;
  if (!hawknextBuiltinFilePath || !personalFilePath) {
    throw new Error("HawkNext Built-in 与 Personal Provider Config 路径必须同时提供");
  }
  return Object.freeze({ hawknextBuiltinFilePath, personalFilePath });
}
