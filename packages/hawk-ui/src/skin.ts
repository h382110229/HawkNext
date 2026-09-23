/**
 * Apply HawkBrain skin to a document, with 「旧布局」 fallback (checklist §7).
 */
import {
  HAWK_TOKENS,
  HAWK_ALIAS_DARK,
  HAWK_ALIAS_LIGHT,
  tokensToCssBlock,
  type SkinMode,
  type SkinState,
} from "./tokens.ts";

export const SKIN_STYLE_ID = "hawknext-hawk-skin";
export const LEGACY_CLASS = "hawk-legacy-layout";
export const HAWK_CLASS = "hawk-skin";

export interface SkinHost {
  document?: Document;
  localStorage?: Pick<Storage, "getItem" | "setItem">;
}

const LEGACY_KEY = "hawknext.skinMode";

export function readSkinMode(host: SkinHost = {}): SkinMode {
  const ls = host.localStorage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  const raw = ls?.getItem(LEGACY_KEY);
  return raw === "legacy" ? "legacy" : "hawk";
}

export function writeSkinMode(mode: SkinMode, host: SkinHost = {}): void {
  const ls = host.localStorage ?? (typeof localStorage !== "undefined" ? localStorage : undefined);
  ls?.setItem(LEGACY_KEY, mode);
}

/** Inject / refresh Hawk tokens stylesheet. */
export function ensureSkinStylesheet(doc: Document): HTMLStyleElement {
  let el = doc.getElementById(SKIN_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = doc.createElement("style");
    el.id = SKIN_STYLE_ID;
    el.textContent = tokensToCssBlock();
    doc.head.appendChild(el);
  } else {
    el.textContent = tokensToCssBlock();
  }
  return el;
}

/**
 * Apply skin mode to documentElement.
 * - `hawk`: inject tokens + `hawk-skin` class (delivery wizard density)
 * - `legacy`: remove hawk class, add `hawk-legacy-layout` so shell keeps stock chrome
 */
export function applyHawkSkin(
  mode: SkinMode = "hawk",
  host: SkinHost = {},
): SkinState {
  const doc = host.document ?? (typeof document !== "undefined" ? document : undefined);
  if (!doc?.documentElement) {
    return { mode, applied: false };
  }
  ensureSkinStylesheet(doc);
  const root = doc.documentElement;
  root.classList.toggle(HAWK_CLASS, mode === "hawk");
  root.classList.toggle(LEGACY_CLASS, mode === "legacy");
  root.dataset.hawkSkin = mode;
  writeSkinMode(mode, host);
  return { mode, applied: true };
}

/** Force CSS variables (useful when class-based tailwind tokens are not used). */
export function applyTokenVars(root: HTMLElement, mode: SkinMode = "hawk"): void {
  for (const [k, v] of Object.entries(HAWK_TOKENS)) {
    root.style.setProperty(k, v);
  }
  const alias = root.classList.contains("theme-zai-light") ? HAWK_ALIAS_LIGHT : HAWK_ALIAS_DARK;
  if (mode === "hawk") {
    for (const [k, v] of Object.entries(alias)) {
      root.style.setProperty(k, v);
    }
  }
}

export { tokensToCssBlock };
