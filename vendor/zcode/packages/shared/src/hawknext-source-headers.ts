import { DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN } from "./hawknextEndpoint.js";

export const HAWKNEXT_SOURCE_HEADERS = {
  "User-Agent": "HawkNext/unknown",
  "HTTP-Referer": DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN,
  "X-Title": "HawkNext@electron",
} as const;

export interface BuildHawkNextSourceHeadersFromContextOptions {
  appVersion?: string;
  arch?: string;
  clientLanguage?: string;
  clientTimezone?: string;
  deviceMid?: string;
  endpointOrigin?: string;
  osVersion?: string;
  platform?: string;
  releaseChannel?: string;
  sourceTitle?: string;
}

export function normalizeHawkNextSourceHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\x20-\x7e]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function buildHawkNextSourceHeadersFromContext(
  options: BuildHawkNextSourceHeadersFromContextOptions = {},
): Record<string, string> {
  const appVersion = normalizeHawkNextSourceHeaderValue(options.appVersion);
  const arch = normalizeHawkNextSourceHeaderValue(options.arch);
  const clientLanguage = normalizeHawkNextSourceHeaderValue(options.clientLanguage) ?? "unknown";
  const clientTimezone = normalizeHawkNextSourceHeaderValue(options.clientTimezone) ?? "unknown";
  const deviceMid = normalizeHawkNextSourceHeaderValue(options.deviceMid);
  const endpointOrigin =
    normalizeHawkNextSourceHeaderValue(options.endpointOrigin) ?? DEFAULT_HAWKNEXT_ENDPOINT_ORIGIN;
  const osVersion = normalizeHawkNextSourceHeaderValue(options.osVersion);
  const platform = normalizeHawkNextSourceHeaderValue(options.platform);
  const releaseChannel = normalizeHawkNextSourceHeaderValue(options.releaseChannel);
  const sourceTitle = normalizeHawkNextSourceHeaderValue(options.sourceTitle) ?? "electron";

  return {
    ...HAWKNEXT_SOURCE_HEADERS,
    "HTTP-Referer": endpointOrigin,
    "User-Agent": `HawkNext/${appVersion ?? "unknown"}`,
    ...(appVersion ? { "X-HawkNext-App-Version": appVersion } : {}),
    "X-Title": `HawkNext@${sourceTitle}`,
    ...(platform && arch ? { "X-Platform": `${platform}-${arch}` } : {}),
    ...(releaseChannel ? { "X-Release-Channel": releaseChannel } : {}),
    "X-Client-Language": clientLanguage,
    "X-Client-Timezone": clientTimezone,
    ...(platform ? { "X-Os-Category": normalizeOsCategory(platform) } : {}),
    ...(osVersion ? { "X-Os-Version": osVersion } : {}),
    ...(deviceMid ? { "X-Device-Mid": deviceMid } : {}),
  };
}

function normalizeOsCategory(platform: string): string {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}
