import { createLocalServices, getAppConfigDir } from "@hawknext/services/node";
import {
  materializeBundledHawkNextBuiltinProviderConfig,
  readBundledHawkNextBuiltinProviderConfig,
} from "./bundledHawkNextBuiltinProviderConfig.js";
import { createHttpServer } from "./http.js";

async function main(): Promise<void> {
  const hawknextBuiltinProviderConfigFilePath = await materializeBundledHawkNextBuiltinProviderConfig({
    environmentConfigRoot: getAppConfigDir(),
    content: readBundledHawkNextBuiltinProviderConfig(),
  });
  const port = Number(process.env["PORT"]) || 3030;
  const host = process.env["HAWKNEXT_SERVER_HOST"]?.trim() || process.env["HOST"]?.trim() || undefined;
  const staticRoot = process.env["HAWKNEXT_WEB_STATIC_ROOT"]?.trim() || undefined;
  const authToken = process.env["HAWKNEXT_SERVER_AUTH_TOKEN"]?.trim() || undefined;
  const services = createLocalServices({
    hawknextBuiltinProviderConfigFilePath,
    providerProvisioningTargetEnabled: Boolean(authToken),
  });

  createHttpServer(services, port, {
    ...(host ? { host } : {}),
    ...(staticRoot ? { staticRoot, spaFallback: true } : {}),
    ...(authToken ? { authToken, authRequired: true } : {}),
  });
}

void main().catch((error: unknown) => {
  console.error("[hawknext-server:http] startup failed", error);
  process.exitCode = 1;
});
