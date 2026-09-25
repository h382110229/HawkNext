import {
  CLOUD_CN_PROVIDER_ID,
  type ApiClient,
  resolveCloudCNApiOrigin,
  resolveZaiBusinessBaseUrl,
  type HawkNextAccountAccess,
  CLOUD_INTL_PROVIDER_ID,
} from "@hawknext/shared";
import type { ICredentialService } from "#src/credential/credential.js";
import {
  createCloudCNBizHeaders,
  copyCloudCNTeamPlanProjectApiKeySecret,
  ensureCloudCNTeamPlanProjectApiKey,
} from "#src/cloud-cn/teamPlanApiKey.js";
import { createZaiLoginAuthHeaders } from "#src/coding-plan-subscription/cloudCnCodingPlanSubscriptionProvider.js";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { readApiJson } from "#src/providers/api/apiJson.js";
import type { RemoteCustomerInfo } from "./accountProviderApiTypes.js";

const log = createServiceLogger("account-provider-team-plan-request-key");
const HAWKNEXT_JWT_TOKEN_KEY = "hawknext-jwt";
const TEAM_PLAN_RUNTIME_KEY_REQUEST_TIMEOUT_MS = 15_000;

interface TeamPlanRequestKeyDependencies {
  readonly apiClient: ApiClient;
  readonly credentialService?: Pick<ICredentialService, "load">;
  readonly access: Extract<HawkNextAccountAccess, { planKind: "team-coding-plan" }>;
}

export async function resolveAccountTeamPlanRuntimeApiKey(
  params: TeamPlanRequestKeyDependencies,
): Promise<string | null> {
  const { family, organizationId, projectId } = params.access;
  const oauthProviderId = family === "zai" ? CLOUD_INTL_PROVIDER_ID : CLOUD_CN_PROVIDER_ID;
  const token =
    (await params.credentialService?.load(`oauth:${oauthProviderId}:access_token`))?.trim() ?? "";
  if (!token) {
    log.warn(undefined, "Team Plan runtime key projection skipped: OAuth token missing", {
      family,
      projectId,
    });
    return null;
  }
  const hawknextJwtToken = (await params.credentialService?.load(HAWKNEXT_JWT_TOKEN_KEY))?.trim() ?? "";
  if (family === "cloud-cn" && hawknextJwtToken && token === hawknextJwtToken) {
    // CloudCN /api/biz 只接受登录 access token，不能使用旧版本误存的 HawkNext JWT。
    log.warn(undefined, "Team Plan runtime key projection skipped: stale hawknext JWT token", {
      family,
      projectId,
    });
    return null;
  }

  const host =
    family === "zai"
      ? resolveZaiBusinessBaseUrl(process.env)
      : resolveCloudCNApiOrigin(process.env);
  const headers =
    family === "zai" ? createZaiLoginAuthHeaders(token) : createCloudCNBizHeaders(token);
  const customerInfo = await readApiJson<{ data?: RemoteCustomerInfo }>(
    params.apiClient,
    `${host}/api/biz/customer/getCustomerInfo`,
    {
      method: "GET",
      timeoutMs: TEAM_PLAN_RUNTIME_KEY_REQUEST_TIMEOUT_MS,
      headers,
    },
  ).catch((error: unknown) => {
    log.warn(undefined, "Team Plan runtime key projection customerInfo request failed", {
      family,
      projectId,
      host,
      error: normalizeTeamPlanRuntimeKeyError(error),
    });
    throw error;
  });
  const organization = customerInfo.data?.organizations?.find(
    (item) => item.organizationId?.trim() === organizationId,
  );
  const hasProject = organization?.projects?.some(
    (project) => project.projectId?.trim() === projectId,
  );
  if (!hasProject) {
    log.warn(
      undefined,
      "Team Plan runtime key projection skipped: project not found in customer info",
      {
        family,
        projectId,
        organizationId,
        organizationCount: customerInfo.data?.organizations?.length ?? 0,
      },
    );
    return null;
  }

  return resolveTeamPlanProjectApiKey({
    apiClient: params.apiClient,
    authorization: token,
    family: family === "zai" ? "" : "CloudCN",
    host,
    organizationId,
    projectId,
  });
}

async function resolveTeamPlanProjectApiKey(params: {
  readonly apiClient: ApiClient;
  readonly authorization: string;
  readonly family: "CloudCN" | "";
  readonly host: string;
  readonly organizationId: string;
  readonly projectId: string;
}): Promise<string | null> {
  const { organizationId, projectId } = params;
  const teamContext = { organizationId, projectId };
  const apiKeyEntry = await ensureCloudCNTeamPlanProjectApiKey({
    apiClient: params.apiClient,
    authorization: params.authorization,
    host: params.host,
    teamContext,
    timeoutMs: TEAM_PLAN_RUNTIME_KEY_REQUEST_TIMEOUT_MS,
  }).catch((error: unknown) => {
    log.warn(undefined, `${params.family} Team Plan runtime key projection api key ensure failed`, {
      projectId,
      organizationId,
      host: params.host,
      error: normalizeTeamPlanRuntimeKeyError(error),
    });
    throw error;
  });
  const apiKey = apiKeyEntry?.apiKey?.trim() ?? "";
  if (!apiKey) {
    log.warn(
      undefined,
      `${params.family} Team Plan runtime key projection skipped: project api key missing`,
      { projectId, organizationId },
    );
    return null;
  }

  const secretKey = await copyCloudCNTeamPlanProjectApiKeySecret({
    apiClient: params.apiClient,
    authorization: params.authorization,
    apiKey,
    host: params.host,
    teamContext,
    timeoutMs: TEAM_PLAN_RUNTIME_KEY_REQUEST_TIMEOUT_MS,
  }).catch((error: unknown) => {
    log.warn(undefined, `${params.family} Team Plan runtime key projection api key copy failed`, {
      projectId,
      organizationId,
      host: params.host,
      error: normalizeTeamPlanRuntimeKeyError(error),
    });
    throw error;
  });
  if (!secretKey) {
    log.warn(
      undefined,
      `${params.family} Team Plan runtime key projection using api key without copied secret`,
      { projectId, organizationId, hasApiKey: true },
    );
  }
  return secretKey ? `${apiKey}.${secretKey}` : apiKey;
}

function normalizeTeamPlanRuntimeKeyError(error: unknown): {
  name: string;
  message: string;
  status?: number;
} {
  if (error instanceof Error) {
    const maybeStatus = (error as { status?: unknown }).status;
    return {
      name: error.name,
      message: error.message,
      status: typeof maybeStatus === "number" ? maybeStatus : undefined,
    };
  }
  return {
    name: typeof error,
    message: String(error),
  };
}
