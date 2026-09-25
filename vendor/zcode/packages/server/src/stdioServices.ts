import { createLocalServices, type HawkNextAgentCommandResolver } from "@hawknext/services/node";
import {
  parseServiceAuthorityMode,
  HAWKNEXT_REMOTE_HTTP_PROXY_ENV_KEY,
  HAWKNEXT_REMOTE_NO_PROXY_ENV_KEY,
  HAWKNEXT_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY,
} from "@hawknext/shared";

interface CreateStdioServicesOptions {
  env?: Record<string, string | undefined>;
  hawknextBuiltinProviderConfigFilePath: string;
  hawknextAgentCommandResolver?: HawkNextAgentCommandResolver;
}

interface RemoteAgentNetworkOptions {
  httpProxy?: string;
  noProxy?: string;
}

function resolveRemoteAgentNetworkFromEnv(
  env: Record<string, string | undefined>,
): RemoteAgentNetworkOptions | undefined {
  if (env[HAWKNEXT_REMOTE_RUNTIME_NETWORK_AUTHORITY_ENV_KEY]?.trim() !== "1") {
    return undefined;
  }
  return {
    httpProxy: env[HAWKNEXT_REMOTE_HTTP_PROXY_ENV_KEY]?.trim() || undefined,
    noProxy: env[HAWKNEXT_REMOTE_NO_PROXY_ENV_KEY]?.trim() || undefined,
  };
}

export function createStdioServices(options: CreateStdioServicesOptions) {
  const env = options.env ?? process.env;
  const authorityModeParseResult = parseServiceAuthorityMode(env);
  const remoteAgentNetwork = resolveRemoteAgentNetworkFromEnv(env);
  // 远程 Desktop 的呈现能力必须从 stdio 入口收到的 authority mode 进入 Services 推导链。
  // 测试注入 resolver 只用于在 spawn 前观察最终命令，不改变生产默认 resolver。
  const services = createLocalServices({
    hawknextBuiltinProviderConfigFilePath: options.hawknextBuiltinProviderConfigFilePath,
    serviceAuthorityMode: authorityModeParseResult.mode,
    hawknextAgentCommandResolver: options.hawknextAgentCommandResolver,
    remoteAgentNetwork,
  });

  return {
    authorityModeParseResult,
    services,
  };
}
