import type { ApiClient } from "@hawknext/shared";
import type { ICredentialService } from "../credential/credential.js";
import type { ICodingPlanSubscriptionService } from "./codingPlanSubscription.js";
import { CloudCNCodingPlanSubscriptionProvider } from "./cloudCnCodingPlanSubscriptionProvider.js";
import type { ModelSelectionView } from "@hawknext/provider";
import { CloudCodingPlanSubscriptionProvider } from "./cloudCodingPlanSubscriptionProvider.js";

interface CodingPlanSubscriptionServiceDependencies {
  apiClient: ApiClient;
  credentialService: Pick<ICredentialService, "load">;
  resolveOffPeakModelSelectionView?: () => Promise<ModelSelectionView>;
}

/**
 * 原 service 把所有调用直接绑定到单一 CloudCNCodingPlanSubscriptionProvider，
 * zai family 没有独立的 Team Plan 定价来源（死代码）。
 *
 * zai 与 cloud-cn Team Plan 全链路对称化：
 * 同时持有 cloud-cn 和 zai 两个 provider 实例；enterprise 读路径（getEnterprisePricing）按
 * request.family 路由到对应实例；缺省 family 时保持 cloud-cn，向后兼容既有调用点。
 *
 * 其余方法（购买/staticConfigs/preview 等）语义与 family 无关或已在 provider 内部按
 * request.providerId 动态路由，统一委托给 cloud-cn provider 即可：
 *   - 企业购买闭环（balance/order/pending/cancel/continue/status）按产品决策仍只走 cloud-cn 域。
 *   - staticConfigs 是平台级 client/configs，与 family 无关。
 *   - 购买类（Stripe/PayPal/preview/createSign 等）已通过 request.providerId 在 provider 内路由。
 */
export function createCodingPlanSubscriptionService(
  dependencies: CodingPlanSubscriptionServiceDependencies,
): ICodingPlanSubscriptionService {
  const cloudCnProvider = new CloudCNCodingPlanSubscriptionProvider(dependencies);
  const zaiProvider = new CloudCodingPlanSubscriptionProvider(dependencies);

  // 按 family 选择 enterprise 读路径 provider；缺省（含未指定 family 的历史调用）走 cloud-cn。
  const resolveEnterprisePricingProvider = (
    family?: "cloud-cn" | "zai",
  ): CloudCNCodingPlanSubscriptionProvider => (family === "zai" ? zaiProvider : cloudCnProvider);

  return {
    batchPreview: (request) => cloudCnProvider.batchPreview(request),
    getStaticProducts: () => cloudCnProvider.getStaticProducts(),
    getStaticTeamProducts: () => cloudCnProvider.getStaticTeamProducts(),
    getStartPlanPreview: () => cloudCnProvider.getStartPlanPreview(),
    getOffPeakClientConfig: (options) => cloudCnProvider.getOffPeakClientConfig(options),
    // 动态工作流灰度：与 client/configs 同源，
    // 因此和其它平台级配置一样固定走 cloud-cn provider，与 family 无关。
    getDynamicWorkflowClientConfig: (options) =>
      cloudCnProvider.getDynamicWorkflowClientConfig(options),
    getModelContextBudgetStrategy: () => cloudCnProvider.getModelContextBudgetStrategy(),
    getForceUpdateConfig: () => cloudCnProvider.getForceUpdateConfig(),
    productInfo: (request) => cloudCnProvider.productInfo(request),
    preview: (request) => cloudCnProvider.preview(request),
    createSign: (request) => cloudCnProvider.createSign(request),
    updateSign: (request) => cloudCnProvider.updateSign(request),
    checkPayment: (request) => cloudCnProvider.checkPayment(request),
    checkPendingOrders: (request) => cloudCnProvider.checkPendingOrders(request),
    queryStripeCards: (request) => cloudCnProvider.queryStripeCards(request),
    bindStripeCard: (request) => cloudCnProvider.bindStripeCard(request),
    unbindStripeCard: (request) => cloudCnProvider.unbindStripeCard(request),
    payStripe: (request) => cloudCnProvider.payStripe(request),
    checkPaypalSupport: (request) => cloudCnProvider.checkPaypalSupport(request),
    createPaypalSetupToken: (request) => cloudCnProvider.createPaypalSetupToken(request),
    subscribePaypal: (request) => cloudCnProvider.subscribePaypal(request),
    getEnterprisePricing: (request) =>
      resolveEnterprisePricingProvider(request?.family).getEnterprisePricing(request),
    getEnterpriseBalance: () => cloudCnProvider.getEnterpriseBalance(),
    calculateEnterpriseOrder: (request) => cloudCnProvider.calculateEnterpriseOrder(request),
    createEnterpriseOrder: (request) => cloudCnProvider.createEnterpriseOrder(request),
    getEnterprisePendingOrders: () => cloudCnProvider.getEnterprisePendingOrders(),
    cancelEnterpriseOrder: (request) => cloudCnProvider.cancelEnterpriseOrder(request),
    continueEnterpriseOrderPayment: (request) =>
      cloudCnProvider.continueEnterpriseOrderPayment(request),
    checkEnterpriseOrderStatus: (request) => cloudCnProvider.checkEnterpriseOrderStatus(request),
  };
}
