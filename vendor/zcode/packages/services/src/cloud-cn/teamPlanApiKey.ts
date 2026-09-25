import type { ApiClient } from "@hawknext/shared";
import { readApiJson } from "#src/providers/api/apiJson.js";

const CLOUD_CN_TEAM_PLAN_API_KEY_NAME = "hawknext-team-api-key";
const CLOUD_CN_TEAM_PLAN_API_KEY_TYPE = 2;

export interface CloudCNTeamPlanBizContext {
  organizationId: string;
  projectId: string;
}

export interface CloudCNTeamPlanApiKeySummary {
  apiKey?: string | null;
  keyType?: number | null;
  name?: string | null;
}

interface CloudCNTeamPlanApiKeySecret {
  secretKey?: string | null;
}

interface CloudCNBizEnvelope<T> {
  code?: number;
  msg?: string;
  success?: boolean;
  data?: T | null;
}

export type CloudCNTeamPlanApiKeyEnsureStatus = "existing" | "created" | "missing";

export interface CloudCNTeamPlanApiKeyEnsureResult {
  apiKey: CloudCNTeamPlanApiKeySummary | null;
  diagnostics: CloudCNTeamPlanApiKeyEnsureDiagnostics;
  status: CloudCNTeamPlanApiKeyEnsureStatus;
}

export interface CloudCNTeamPlanApiKeyEnsureDiagnostics {
  create?: CloudCNBizEnvelopeDiagnostics & {
    dataHasApiKey: boolean;
    dataKeyType: number | null;
    dataName: string | null;
  };
  list: CloudCNBizEnvelopeDiagnostics & {
    apiKeyCount: number;
    usableApiKeyCount: number;
  };
}

export interface CloudCNBizEnvelopeDiagnostics {
  code: number | null;
  msg: string | null;
  success: boolean | null;
}

export function createCloudCNBizHeaders(
  authorization: string,
  teamContext?: CloudCNTeamPlanBizContext | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: authorization,
    "Content-Type": "application/json",
  };
  if (teamContext) {
    headers["cloud-cn-organization"] = teamContext.organizationId;
    headers["cloud-cn-project"] = teamContext.projectId;
  }
  return headers;
}

function createCloudCNTeamPlanApiKeyPayload(): {
  keyType: typeof CLOUD_CN_TEAM_PLAN_API_KEY_TYPE;
  name: typeof CLOUD_CN_TEAM_PLAN_API_KEY_NAME;
} {
  return {
    name: CLOUD_CN_TEAM_PLAN_API_KEY_NAME,
    keyType: CLOUD_CN_TEAM_PLAN_API_KEY_TYPE,
  };
}

function isUsableCloudCNTeamPlanApiKey(item: CloudCNTeamPlanApiKeySummary): boolean {
  return (
    item.name === CLOUD_CN_TEAM_PLAN_API_KEY_NAME &&
    item.keyType === CLOUD_CN_TEAM_PLAN_API_KEY_TYPE &&
    Boolean(item.apiKey?.trim())
  );
}

export async function ensureCloudCNTeamPlanProjectApiKey(params: {
  apiClient: ApiClient;
  authorization: string;
  host: string;
  teamContext: CloudCNTeamPlanBizContext;
  timeoutMs: number;
}): Promise<CloudCNTeamPlanApiKeySummary | null> {
  const result = await ensureCloudCNTeamPlanProjectApiKeyWithStatus(params);
  return result.apiKey;
}

export async function ensureCloudCNTeamPlanProjectApiKeyWithStatus(params: {
  apiClient: ApiClient;
  authorization: string;
  host: string;
  teamContext: CloudCNTeamPlanBizContext;
  timeoutMs: number;
}): Promise<CloudCNTeamPlanApiKeyEnsureResult> {
  const listUrl = buildCloudCNTeamPlanApiKeysUrl(params.host, params.teamContext);
  const listPayload = await readApiJson<CloudCNBizEnvelope<CloudCNTeamPlanApiKeySummary[]>>(
    params.apiClient,
    listUrl,
    {
      method: "GET",
      timeoutMs: params.timeoutMs,
      headers: createCloudCNBizHeaders(params.authorization, params.teamContext),
    },
  );
  const apiKeys = isSuccessfulCloudCNBizEnvelope(listPayload) ? (listPayload.data ?? []) : [];
  const listDiagnostics = {
    ...createCloudCNBizEnvelopeDiagnostics(listPayload),
    apiKeyCount: apiKeys.length,
    usableApiKeyCount: apiKeys.filter(isUsableCloudCNTeamPlanApiKey).length,
  };
  const existingApiKey = apiKeys.find(isUsableCloudCNTeamPlanApiKey) ?? null;
  if (existingApiKey) {
    return { apiKey: existingApiKey, diagnostics: { list: listDiagnostics }, status: "existing" };
  }

  // 一个账号可能有多个 Team Plan 项目，每个项目都需要自己的 keyType=2
  // 项目级 API Key；只给当前选中团队创建会导致切换到其他团队后 runtime 无法投影。
  const createPayload = await readApiJson<CloudCNBizEnvelope<CloudCNTeamPlanApiKeySummary>>(
    params.apiClient,
    listUrl,
    {
      method: "POST",
      timeoutMs: params.timeoutMs,
      headers: createCloudCNBizHeaders(params.authorization, params.teamContext),
      body: JSON.stringify(createCloudCNTeamPlanApiKeyPayload()),
    },
  );
  const createData = isSuccessfulCloudCNBizEnvelope(createPayload)
    ? (createPayload.data ?? null)
    : null;
  const createdApiKey =
    createData && isUsableCloudCNTeamPlanApiKey(createData) ? createData : null;
  return {
    apiKey: createdApiKey,
    diagnostics: {
      create: {
        ...createCloudCNBizEnvelopeDiagnostics(createPayload),
        dataHasApiKey: Boolean(createPayload.data?.apiKey?.trim()),
        dataKeyType:
          typeof createPayload.data?.keyType === "number" ? createPayload.data.keyType : null,
        dataName: createPayload.data?.name?.trim() || null,
      },
      list: listDiagnostics,
    },
    status: createdApiKey ? "created" : "missing",
  };
}

export async function copyCloudCNTeamPlanProjectApiKeySecret(params: {
  apiClient: ApiClient;
  authorization: string;
  apiKey: string;
  host: string;
  teamContext: CloudCNTeamPlanBizContext;
  timeoutMs: number;
}): Promise<string | null> {
  const copyPayload = await readApiJson<CloudCNBizEnvelope<CloudCNTeamPlanApiKeySecret>>(
    params.apiClient,
    `${buildCloudCNTeamPlanApiKeysUrl(params.host, params.teamContext)}/copy/${encodeURIComponent(
      params.apiKey,
    )}`,
    {
      method: "GET",
      timeoutMs: params.timeoutMs,
      headers: createCloudCNBizHeaders(params.authorization, params.teamContext),
    },
  );
  const secretKey = isSuccessfulCloudCNBizEnvelope(copyPayload)
    ? (copyPayload.data?.secretKey?.trim() ?? "")
    : "";
  return secretKey || null;
}

function buildCloudCNTeamPlanApiKeysUrl(
  host: string,
  teamContext: CloudCNTeamPlanBizContext,
): string {
  return (
    `${host}/api/biz/v1/organization/${encodeURIComponent(teamContext.organizationId)}` +
    `/projects/${encodeURIComponent(teamContext.projectId)}/api_keys`
  );
}

function isSuccessfulCloudCNBizEnvelope(envelope: CloudCNBizEnvelope<unknown>): boolean {
  if (envelope.success === false) {
    return false;
  }
  if (typeof envelope.code === "number") {
    return envelope.code === 0 || envelope.code === 200;
  }
  return envelope.success === true || envelope.data !== undefined;
}

function createCloudCNBizEnvelopeDiagnostics(
  envelope: CloudCNBizEnvelope<unknown>,
): CloudCNBizEnvelopeDiagnostics {
  return {
    code: typeof envelope.code === "number" ? envelope.code : null,
    msg: envelope.msg?.trim() || null,
    success: typeof envelope.success === "boolean" ? envelope.success : null,
  };
}
