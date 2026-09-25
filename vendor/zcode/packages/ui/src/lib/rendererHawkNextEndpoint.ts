import {
  buildRuntimeHawkNextEndpointUrls,
  HAWKNEXT_ENV,
  type RuntimeHawkNextEndpointEnv,
} from "@hawknext/shared";

interface RendererImportMetaEnv {
  VITE_HAWKNEXT_BASE_URL?: string;
  VITE_HAWKNEXT_ENDPOINT_ORIGIN?: string;
}

function readRendererImportMetaEnv(): RendererImportMetaEnv {
  return ((import.meta as ImportMeta & { env?: RendererImportMetaEnv }).env ??
    {}) as RendererImportMetaEnv;
}

function createRendererHawkNextEndpointEnv(
  env: RendererImportMetaEnv = readRendererImportMetaEnv(),
): RuntimeHawkNextEndpointEnv {
  return {
    HAWKNEXT_ENV,
    // UI 侧的 hawknext-plan 占位 provider 以前只看 HAWKNEXT_ENV，
    // 没有消费 Vite 注入的 base url，导致自定义测试域名时 renderer 和 host/service 可能不一致。
    HAWKNEXT_BASE_URL: env.VITE_HAWKNEXT_BASE_URL,
    HAWKNEXT_ENDPOINT_ORIGIN: env.VITE_HAWKNEXT_ENDPOINT_ORIGIN,
  };
}

export const RENDERER_HAWKNEXT_ENDPOINT_URLS = buildRuntimeHawkNextEndpointUrls(
  createRendererHawkNextEndpointEnv(),
);
