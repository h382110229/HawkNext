import type { UiLocale, SupportedLocale } from "@hawknext/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { HawkNextCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, HawkNextCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, HawkNextCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getHawkNextCopy(locale?: UiLocale | string, detected?: string | null): HawkNextCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
