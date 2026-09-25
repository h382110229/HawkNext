import { BUILTIN_MODEL_PROVIDER_IDS, resolveZaiBusinessBaseUrl } from "@hawknext/shared";
import type { CodingPlanSubscriptionProviderId } from "@hawknext/shared";
import {
  CloudCNCodingPlanSubscriptionProvider,
  createZaiLoginAuthHeaders,
} from "./cloudCnCodingPlanSubscriptionProvider.js";

/**
 * CloudCodingPlanSubscriptionProvider
 *
 * 历史上 Team Plan 企业定价只在 cloud-cn family 上落地，service 层把所有
 * enterprise 读请求直接打到 CloudCNCodingPlanSubscriptionProvider，硬编码 cloud-cn
 * 域名 + cloudCnCodingPlan providerId + cloud-cn OAuth token。zai family 即使生成
 * 了 team plan 连接键，也无独立的定价数据来源（死代码）。
 *
 * zai 与 cloud-cn Team Plan 全链路对称化：
 * 本类继承 CloudCNCodingPlanSubscriptionProvider，仅覆盖 enterprise 读路径的 family 维度：
 *   - providerId  → cloudCodingPlan
 *   - 业务域名   → resolveCloudCodingPlanHost()（测试 配置的 ZAI Business origin / 线上 ）
 *   - OAuth token → loadZaiAuthorization()（oauth:cloud-intl:access_token，复用父类）
 *   - 鉴权头     → createZaiLoginAuthHeaders()
 *
 * 覆盖范围：仅 getEnterprisePricing + enrichEnterprisePricingTeamProjects 相关的
 * family 维度（通过 protected 虚方法）。企业购买闭环（balance/order/pending/cancel/
 * continue/status）仍由父类走 cloud-cn 域，符合 zai Team Plan "仅读定价+团队上下文" 的产品边界。
 *
 * 其余方法（batchPreview/preview/productInfo/checkPayment/checkPendingOrders/
 * Stripe/PayPal/createSign/updateSign/staticConfigs）全部复用父类：
 *   - 购买类已通过 request.providerId 在父类 resolveEndpointConfig 内动态路由
 *     （zai 走 /api/pay + zai host + zai token，cloud-cn 走 /api/biz + cloud-cn host + cloud-cn token）。
 *   - staticConfigs 是平台级 client/configs，与 family 无关。
 */
export class CloudCodingPlanSubscriptionProvider extends CloudCNCodingPlanSubscriptionProvider {
  protected codingPlanProviderId(): CodingPlanSubscriptionProviderId {
    return BUILTIN_MODEL_PROVIDER_IDS.zaiIndividualCodingPlan;
  }

  protected resolveFamilyEnterpriseHost(): string {
    return resolveCloudCodingPlanHost();
  }

  protected async loadFamilyEnterpriseToken(): Promise<string> {
    // 复用父类 loadZaiAuthorization：credential key = oauth:cloud-intl:access_token。
    return this.loadZaiAuthorization();
  }

  protected createFamilyEnterpriseAuthHeaders(token: string): Record<string, string> {
    return createZaiLoginAuthHeaders(token);
  }
}

/**
 * zai 业务域名（/api/biz 与 /api/pay）。
 * 与父类 file-scoped 的 resolveCloudCodingPlanHost 等价；这里独立保留是因为父类该函数未 export。
 * 必须与父类实现保持一致：跟随产品环境（测试 配置的 ZAI Business origin / 线上 ）。
 */
function resolveCloudCodingPlanHost(): string {
  return resolveZaiBusinessBaseUrl(process.env);
}
