import type { OAuthProviderId } from "@hawknext/shared";
import { CLOUD_CN_PROVIDER_ID, CLOUD_INTL_PROVIDER_ID } from "@hawknext/shared";
import { LogInIcon } from "lucide-react";
import { cn } from "@/components/lib/utils.js";
import cloudCnIcon from "@/assets/provider-icons/logo-cloud-cn.svg";
import zaiIcon from "@/assets/provider-icons/logo-zai.svg";

const OAUTH_PROVIDER_ICON_SRC: Partial<Record<OAuthProviderId, string>> = {
  [CLOUD_CN_PROVIDER_ID]: cloudCnIcon,
  [CLOUD_INTL_PROVIDER_ID]: zaiIcon,
};

export function renderOAuthProviderIcon(provider: OAuthProviderId, className?: string) {
  const src = OAUTH_PROVIDER_ICON_SRC[provider];
  if (!src) {
    return <LogInIcon className={cn("shrink-0", className)} />;
  }

  return (
    <img src={src} alt="" aria-hidden="true" className={cn("shrink-0 object-contain", className)} />
  );
}
