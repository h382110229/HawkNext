/* eslint-disable max-lines -- 模型供应商 schema、迁移和运行时投影 helper 需要共享同一套类型边界，暂时集中在单文件避免契约分散。 */
export const BUILTIN_PROVIDER_TEMPLATE_IDS = {
  zai: "zai-api",
  cloudCn: "cloud-cn-api",
  // HAWK_LLMAPI_TEMPLATE: sole default egress (llmapi.hawkren.online / ashawk)
  llmapi: "hawknext-llmapi",
} as const;

export const BUILTIN_MODEL_PROVIDER_IDS = {
  zaiIndividualCodingPlan: "account:zai-individual-coding-plan",
  zaiTeamCodingPlan: "account:zai-team-coding-plan",
  zaiStartPlan: "account:zai-start-plan",
  cloudCnIndividualCodingPlan: "account:cloud-cn-individual-coding-plan",
  cloudCnTeamCodingPlan: "account:cloud-cn-team-coding-plan",
  cloudCnStartPlan: "account:cloud-cn-start-plan",
} as const;

export type BuiltinOAuthProviderId = keyof typeof BUILTIN_MODEL_PROVIDER_IDS;

export type BuiltinModelProviderId = (typeof BUILTIN_MODEL_PROVIDER_IDS)[BuiltinOAuthProviderId];

export function isBuiltinModelProviderId(id: string): id is BuiltinModelProviderId {
  return (
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiIndividualCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiTeamCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiStartPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnIndividualCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnTeamCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnStartPlan
  );
}

export function isCloudCodingPlanProviderId(id: string): boolean {
  return (
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiIndividualCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiTeamCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiStartPlan
  );
}

export function isCloudCNStartPlanProviderId(id: string): boolean {
  return id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnStartPlan;
}

export function isStartPlanModelProviderId(id: string): boolean {
  return (
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiStartPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnStartPlan
  );
}

/**
 * 个人版 Coding Plan（不含 Start Plan 与 Team Plan）。
 * Start Plan 用 disconnected 展示领取/付费卡，Team Plan 有独立文案，
 * "服务端明确无权益"只对个人版需要区分成"未开通"。
 */
export function isIndividualCodingPlanModelProviderId(id: string): boolean {
  return (
    id === BUILTIN_MODEL_PROVIDER_IDS.zaiIndividualCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnIndividualCodingPlan
  );
}

export function isCodingPlanModelProviderId(id: string): boolean {
  return (
    isCloudCodingPlanProviderId(id) ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnIndividualCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnTeamCodingPlan ||
    id === BUILTIN_MODEL_PROVIDER_IDS.cloudCnStartPlan
  );
}

/** 一个正式 Model 的连通性测试结果。 */
export type ModelConnectivityResult =
  | { readonly success: true }
  | {
      readonly success: false;
      readonly error: {
        readonly message: string;
        /** 设置连接测试边界已确认的资格失败；其他执行错误保留原消息。 */
        readonly code?: "provider-unavailable" | "model-unavailable";
      };
    };
