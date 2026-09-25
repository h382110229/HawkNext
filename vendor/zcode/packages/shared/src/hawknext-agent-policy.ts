import { z } from "zod";
import type { CommandAgentSource } from "./command-types.js";
import type { HawkNextProvider } from "./hawknext-task-types-core.js";

export const HAWKNEXT_AGENT_PROVIDER = "glm" satisfies HawkNextProvider;
export const HAWKNEXT_AGENT_PROVIDER_LABEL = "HawkNext Agent";
export const HAWKNEXT_COMMAND_AGENT_SOURCE = "hawknextAgent" satisfies CommandAgentSource;

export const hawknextAgentProviderSchema = z.literal(HAWKNEXT_AGENT_PROVIDER);

export const HAWKNEXT_COMMAND_AGENT_SOURCES = [
  HAWKNEXT_COMMAND_AGENT_SOURCE,
] as const satisfies readonly CommandAgentSource[];

export function normalizeAgentProviderToHawkNextAgent(
  _provider?: HawkNextProvider | null,
): HawkNextProvider {
  return HAWKNEXT_AGENT_PROVIDER;
}

export function isHawkNextAgentProvider(
  provider: HawkNextProvider | null | undefined,
): provider is typeof HAWKNEXT_AGENT_PROVIDER {
  return provider === HAWKNEXT_AGENT_PROVIDER;
}
