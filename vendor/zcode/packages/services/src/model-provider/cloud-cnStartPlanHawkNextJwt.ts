import { CLOUD_CN_PROVIDER_ID } from "@hawknext/shared";

const ACTIVE_PROVIDER_KEY = "oauth:active_provider";
const HAWKNEXT_JWT_TOKEN_KEY = "hawknext-jwt";

interface CloudCNStartPlanHawkNextJwtCredentialService {
  load(key: string): Promise<string | null>;
}

export async function resolveCloudCNStartPlanHawkNextJwt(params: {
  credentialService?: CloudCNStartPlanHawkNextJwtCredentialService;
  provider?: { readonly apiKey?: string | null } | null;
  trustCachedHawkNextJwt?: boolean;
}): Promise<string> {
  const activeProvider = (await params.credentialService?.load(ACTIVE_PROVIDER_KEY))?.trim() || "";
  if (params.trustCachedHawkNextJwt === true || activeProvider === CLOUD_CN_PROVIDER_ID) {
    const credentialJwt = (await params.credentialService?.load(HAWKNEXT_JWT_TOKEN_KEY))?.trim() || "";
    if (credentialJwt) {
      return credentialJwt;
    }
  }

  // hawknext JWT 必须在 CloudCN OAuth callback 阶段用授权码 body 落盘。
  // Start Plan 查询余额/运行时只消费已保存的 JWT 或 provider 副本，不再用
  // CloudCN access_token 构造 provider+access_token body 临时兑换，避免 /oauth/token 400。
  return params.provider?.apiKey?.trim() || "";
}
