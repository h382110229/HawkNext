import {
  hawknextProtocolMethods,
  hawknextPluginsReferenceCatalogResultSchema,
  type HawkNextPluginsReferenceCatalogParams,
} from "@hawknext/shared";
import type { HawkNextProtocolClient } from "#src/hawknext-agent/hawknextProtocolClient.js";

/** 旧协议严格校验响应；新展示字段走独立入口，只有 -32601 能证明旧 Agent 不支持。 */
export async function requestPluginReferenceCatalog(
  client: Pick<HawkNextProtocolClient, "request">,
  params: HawkNextPluginsReferenceCatalogParams,
) {
  try {
    return await client.request(
      hawknextProtocolMethods.pluginsReferenceCatalogWithCategory,
      params,
      hawknextPluginsReferenceCatalogResultSchema,
    );
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === -32601))
      throw error;
    return client.request(
      hawknextProtocolMethods.pluginsReferenceCatalog,
      params,
      hawknextPluginsReferenceCatalogResultSchema,
    );
  }
}
