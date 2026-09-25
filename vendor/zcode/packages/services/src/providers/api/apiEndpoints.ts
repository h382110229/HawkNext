import { buildRuntimeHawkNextApiUrl, resolveZaiBusinessBaseUrl } from "@hawknext/shared";

export const HAWKNEXT_CLIENT_SCENES_URL = buildRuntimeHawkNextApiUrl(
  process.env,
  "/api/v1/client/scenes",
);

export const ZAI_API_HOST = resolveZaiBusinessBaseUrl(process.env);
