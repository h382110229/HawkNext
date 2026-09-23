import type { ModelRef } from "./types.ts";
import { AUTO_MODEL_ID, DEFAULT_MODEL } from "./types.ts";

/** Serialize ModelRef to wire model string. Default is always Auto. */
export function modelRefToWire(model: ModelRef | undefined): string {
  const m = model ?? DEFAULT_MODEL;
  if (m.kind === "auto") return AUTO_MODEL_ID;
  return m.id;
}

export function isAutoModel(model: ModelRef | undefined): boolean {
  return (model ?? DEFAULT_MODEL).kind === "auto";
}

/** Parse wire/legacy ids into ModelRef. Bare "Auto" stays auto. */
export function parseModelRef(id: string | undefined | null): ModelRef {
  if (!id || id === AUTO_MODEL_ID || id.toLowerCase() === "auto") {
    return { kind: "auto" };
  }
  return { kind: "id", id };
}
