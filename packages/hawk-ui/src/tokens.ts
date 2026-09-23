/**
 * HawkBrain UI tokens (v2.2 B+C+Gold Hybrid) — HawkNext skin source of truth.
 * Spec: HawkBrain/docs/hawk-ui-design-spec.md
 * 克制优雅 · Champagne Gold 强调 · 深色默认 · 8px 网格 · WCAG ≥ 4.5:1
 */

export const HAWK_TOKENS = {
  // Dark Mode (默认)
  "--hawk-bg-primary": "#080B0C",
  "--hawk-bg-card": "#111719",
  "--hawk-bg-input": "#1A2424",
  "--hawk-gold": "#D6AD5C",
  "--hawk-text": "#F3EFE5",
  "--hawk-teal": "#39C7B0",
  "--hawk-text-secondary": "#8A9494",
  "--hawk-error": "#BE1D5D",
  "--hawk-warning": "#F4A259",
  // Light Mode
  "--hawk-bg-light": "#FAFAF8",
  "--hawk-surface-light": "#E8ECEB",
  "--hawk-text-light": "#2E3A3A",
  // Radius
  "--hawk-radius-btn": "8px",
  "--hawk-radius-input": "10px",
  "--hawk-radius-card": "12px",
  "--hawk-radius-pill": "9999px",
  // Typography
  "--hawk-font-en": "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  "--hawk-font-cn": "PingFang SC, Noto Sans SC, sans-serif",
  "--hawk-font-mono": "JetBrains Mono, Geist Mono, monospace",
  // Type scale
  "--hawk-h1": "700 48px/1.15 var(--hawk-font-en)",
  "--hawk-h2": "600 32px/1.25 var(--hawk-font-en)",
  "--hawk-h3": "600 24px/1.3 var(--hawk-font-en)",
  "--hawk-h4": "500 18px/1.4 var(--hawk-font-en)",
  "--hawk-body": "400 16px/1.6 var(--hawk-font-cn)",
  "--hawk-caption": "500 12px/1.4 var(--hawk-font-cn)",
  // Spacing (8px grid)
  "--hawk-space-1": "8px",
  "--hawk-space-2": "12px",
  "--hawk-space-3": "16px",
  "--hawk-space-4": "20px",
  "--hawk-space-5": "24px",
  "--hawk-space-6": "32px",
  "--hawk-space-7": "48px",
} as const;

export type HawkTokenName = keyof typeof HAWK_TOKENS;

/** Semantic aliases mapped onto shell / tailwind token names (dark). */
export const HAWK_ALIAS_DARK = {
  "--background": "var(--hawk-bg-primary)",
  "--background-alt": "var(--hawk-bg-card)",
  "--foreground": "var(--hawk-text)",
  "--foreground-subtle": "var(--hawk-text-secondary)",
  "--card": "var(--hawk-bg-card)",
  "--input": "var(--hawk-bg-input)",
  "--primary": "var(--hawk-gold)",
  "--primary-foreground": "var(--hawk-bg-primary)",
  "--accent": "var(--hawk-teal)",
  "--destructive": "var(--hawk-error)",
  "--warning": "var(--hawk-warning)",
  "--border": "var(--hawk-bg-input)",
  "--radius": "var(--hawk-radius-btn)",
} as const;

export const HAWK_ALIAS_LIGHT = {
  "--background": "var(--hawk-bg-light)",
  "--background-alt": "var(--hawk-surface-light)",
  "--foreground": "var(--hawk-text-light)",
  "--foreground-subtle": "var(--hawk-text-secondary)",
  "--card": "var(--hawk-surface-light)",
  "--input": "#FFFFFF",
  "--primary": "var(--hawk-gold)",
  "--primary-foreground": "#080B0C",
  "--accent": "var(--hawk-teal)",
  "--destructive": "var(--hawk-error)",
  "--warning": "var(--hawk-warning)",
  "--border": "var(--hawk-surface-light)",
  "--radius": "var(--hawk-radius-btn)",
} as const;

export function tokensToCssBlock(): string {
  const body = Object.entries(HAWK_TOKENS)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  const dark = Object.entries(HAWK_ALIAS_DARK)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  const light = Object.entries(HAWK_ALIAS_LIGHT)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return `/* HawkNext · HawkBrain skin tokens v2.2 */\n:root {\n${body}\n}\n\n.theme-zai-dark,\n.theme-dark,\n[data-theme="dark"] {\n${dark}\n}\n\n.theme-zai-light,\n.theme-light,\n[data-theme="light"] {\n${light}\n}\n`;
}

/** Legacy layout: disable Hawk three-column density, fall back to stock shell chrome. */
export type SkinMode = "hawk" | "legacy";

export interface SkinState {
  mode: SkinMode;
  applied: boolean;
}
