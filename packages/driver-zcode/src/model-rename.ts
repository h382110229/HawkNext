/**
 * Model rename / alias table for Coding (zcode driver).
 * Extends legacy glm/deepseek renames with **Auto/mimo** — never a single hardcoded mimo ID.
 * Port + extension of vendor/zcode provider-node legacy-reasoning-level-renames.
 */
import { AUTO_MODEL_ID, parseModelRef, type ModelRef } from "../../llmapi-adapter/src/index.ts";

/** Upstream/legacy id → HawkNext Auto/mimo family (wire still sends Auto when possible). */
export const MODEL_RENAME_TABLE: ReadonlyArray<{ from: RegExp | string; to: string }> = [
  // reasoning-level / vendor aliases → Auto (router decides)
  { from: /^glm-.*$/i, to: AUTO_MODEL_ID },
  { from: /^deepseek-.*$/i, to: AUTO_MODEL_ID },
  { from: /^(gpt|o[0-9]|chatgpt).*$/i, to: AUTO_MODEL_ID },
  { from: /^claude-.*$/i, to: AUTO_MODEL_ID },
  { from: /^gemini-.*$/i, to: AUTO_MODEL_ID },
  // partial mimo pins → Auto unless explicitly exact
  { from: /^mimo$/i, to: AUTO_MODEL_ID },
  { from: /^mimo-v2$/i, to: AUTO_MODEL_ID },
  { from: /^(MiMo|mimo)-(auto|router)$/i, to: AUTO_MODEL_ID },
];

/** Exact mimo ids that may be requested explicitly (never the only option). */
export const KNOWN_MIMO_IDS = [
  "mimo-v2.5-pro",
  "mimo-v2.6-flash",
  "mimo-v2.6-pro",
  "mimo-v2.5-flash",
] as const;

export interface RenameResult {
  /** Wire model id sent to llmapi. */
  wireModel: string;
  modelRef: ModelRef;
  renamedFrom?: string;
  /** True when request was normalized to Auto. */
  defaultedToAuto: boolean;
}

/**
 * Map any user/legacy model id to a safe wire id.
 * Default and unknown ids → **Auto**. Explicit known mimo ids pass through.
 */
export function renameModelId(raw: string | undefined | null): RenameResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "auto") {
    return {
      wireModel: AUTO_MODEL_ID,
      modelRef: { kind: "auto" },
      defaultedToAuto: true,
    };
  }

  const known = (KNOWN_MIMO_IDS as readonly string[]).includes(trimmed);
  if (known) {
    return {
      wireModel: trimmed,
      modelRef: { kind: "id", id: trimmed },
      defaultedToAuto: false,
    };
  }

  for (const rule of MODEL_RENAME_TABLE) {
    const hit =
      typeof rule.from === "string"
        ? trimmed === rule.from
        : rule.from.test(trimmed);
    if (hit) {
      return {
        wireModel: rule.to,
        modelRef: parseModelRef(rule.to),
        renamedFrom: trimmed,
        defaultedToAuto: rule.to === AUTO_MODEL_ID,
      };
    }
  }

  // unknown → Auto (never invent a single mimo pin)
  return {
    wireModel: AUTO_MODEL_ID,
    modelRef: { kind: "auto" },
    renamedFrom: trimmed,
    defaultedToAuto: true,
  };
}

export function isAutoWire(id: string): boolean {
  return id === AUTO_MODEL_ID || id.toLowerCase() === "auto";
}
