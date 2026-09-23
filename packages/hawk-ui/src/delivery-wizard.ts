/**
 * 交付向导（Delivery Wizard）— 首屏可见入口 + 步骤契约。
 * Wave 6: 向导入口首屏可见（checklist §7）。
 * 步骤覆盖 llmapi Key / model Auto / runtime doctor / Office·Coding 路径。
 */

export type WizardStepId =
  | "welcome"
  | "llmapi-key"
  | "model-auto"
  | "runtime-doctor"
  | "paths"
  | "finish";

export interface WizardStep {
  id: WizardStepId;
  title: string;
  titleZh: string;
  summary: string;
  /** First-screen primary CTA launches from welcome → llmapi-key. */
  primary?: boolean;
}

export const DELIVERY_WIZARD_STEPS: WizardStep[] = [
  {
    id: "welcome",
    title: "Welcome",
    titleZh: "欢迎使用 HawkNext",
    summary: "Office + Coding 桌面 Agent · 模型只走 llmapi Auto",
  },
  {
    id: "llmapi-key",
    title: "LLMAPI Key",
    titleZh: "配置 LLMAPI 密钥",
    summary: "写入 safeStorage；禁止静默打官方端点",
    primary: true,
  },
  {
    id: "model-auto",
    title: "Model Auto",
    titleZh: "默认模型 Auto",
    summary: "Auto 智能路由；可显式选 mimo，不写死单一 ID",
    primary: true,
  },
  {
    id: "runtime-doctor",
    title: "Runtime Doctor",
    titleZh: "运行时自检",
    summary: "Node/Python/Office/FFmpeg/rg·fd/Git/Playwright/7z/签名",
    primary: true,
  },
  {
    id: "paths",
    title: "Office & Coding",
    titleZh: "双路径就绪",
    summary: "Office→codex driver · Coding→shell driver（llmapi 预置）",
    primary: true,
  },
  {
    id: "finish",
    title: "Finish",
    titleZh: "开始交付",
    summary: "进入工作台；设置可回退「旧布局」",
  },
];

export const FIRST_SCREEN_ENTRY_ID = "hawk-delivery-wizard";

export interface FirstScreenEntry {
  id: string;
  labelZh: string;
  labelEn: string;
  /** Visible without scrolling on first screen. */
  visibleFirstScreen: true;
  target: "delivery-wizard";
  /** Gold CTA per HawkBrain Primary Button. */
  variant: "primary";
}

export const DELIVERY_WIZARD_ENTRY: FirstScreenEntry = {
  id: FIRST_SCREEN_ENTRY_ID,
  labelZh: "交付向导",
  labelEn: "Delivery Wizard",
  visibleFirstScreen: true,
  target: "delivery-wizard",
  variant: "primary",
};

export function primarySteps(): WizardStep[] {
  return DELIVERY_WIZARD_STEPS.filter((s) => s.primary);
}

export function stepOrder(): WizardStepId[] {
  return DELIVERY_WIZARD_STEPS.map((s) => s.id);
}

export function nextStep(id: WizardStepId): WizardStepId | null {
  const order = stepOrder();
  const i = order.indexOf(id);
  return i < 0 || i + 1 >= order.length ? null : order[i + 1]!;
}

/** Validation for llmapi-key step (no secret persistence here). */
export function validateLlmApiKey(key: string | undefined | null): {
  ok: boolean;
  reason?: string;
} {
  const k = (key ?? "").trim();
  if (!k) return { ok: false, reason: "empty" };
  if (!k.startsWith("as-")) return { ok: false, reason: "expected as- prefix" };
  if (k.length < 20) return { ok: false, reason: "too short" };
  return { ok: true };
}

export function validateModelChoice(model: string | undefined | null): {
  ok: boolean;
  wire: string;
  reason?: string;
} {
  const m = (model ?? "Auto").trim() || "Auto";
  if (m.toLowerCase() === "auto") return { ok: true, wire: "Auto" };
  if (/^mimo-v\d/.test(m)) return { ok: true, wire: m };
  // unknown → Auto (iron rule)
  return { ok: true, wire: "Auto", reason: "normalized-to-Auto" };
}
