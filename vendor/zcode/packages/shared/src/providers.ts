import { z } from "zod";

/**
 * HawkNext agent 提供方的单一真源。
 *
 * 类型 HawkNextProvider、运行时 schema hawknextProviderSchema 都从这里派生,
 * 避免各处内联 z.enum([...]) 副本随新增/删除 provider 漂移。
 * 本模块只依赖 zod(叶子),可被 validation / hawknext-protocol 等无环引用。
 */
const HAWKNEXT_PROVIDERS = ["glm"] as const;

export const hawknextProviderSchema = z.enum(HAWKNEXT_PROVIDERS);

export type HawkNextProvider = (typeof HAWKNEXT_PROVIDERS)[number];
