import { getHawkNextCopy, type SupportedLocale, type UiLocale } from "@hawknext/i18n";

export function formatCliHelp(
  version: string,
  locale?: UiLocale,
  detectedLocale?: SupportedLocale,
): string {
  return getHawkNextCopy(locale, detectedLocale).cli.help(version);
}
