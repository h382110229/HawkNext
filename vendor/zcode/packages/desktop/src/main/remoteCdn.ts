import { HAWKNEXT_VERSION, type HawkNextEnv } from "@hawknext/shared";

declare const __HAWKNEXT_CDN_BASE_URL__: string | undefined;
const DEFAULT_CDN_BASE_URL = "";

export interface ResolveRemoteCdnOptions {
  env?: HawkNextEnv;
  locale?: string;
  timeZone?: string;
  overrideBaseUrl?: string;
  version?: string;
  now?: Date;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("CDN URL must use http or https");
  return value.replace(/\/+$/, "");
}

export function resolveRemoteCdnBaseUrls(options: ResolveRemoteCdnOptions = {}): string[] {
  const override = options.overrideBaseUrl?.trim();
  if (override) return [normalizeBaseUrl(override)];
  const baseUrl =
    process.env.HAWKNEXT_CDN_BASE_URL?.trim() ||
    (typeof __HAWKNEXT_CDN_BASE_URL__ === "undefined" ? "" : __HAWKNEXT_CDN_BASE_URL__) ||
    DEFAULT_CDN_BASE_URL;
  return [
    `${normalizeBaseUrl(baseUrl)}/hawknext/electron/releases/${options.version ?? HAWKNEXT_VERSION}`,
  ];
}
