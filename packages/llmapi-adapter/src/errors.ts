import type { LlmApiErrorShape } from "./types.ts";

/** Adapter error with structured code. Never embeds full Bearer. */
export class LlmApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly type?: string;
  readonly baseUrl?: string;

  constructor(shape: LlmApiErrorShape) {
    super(shape.message);
    this.name = "LlmApiError";
    this.code = shape.code;
    this.status = shape.status;
    this.type = shape.type;
    this.baseUrl = shape.baseUrl;
  }

  toShape(): LlmApiErrorShape {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      type: this.type,
      baseUrl: this.baseUrl,
    };
  }
}

export function isLlmApiError(e: unknown): e is LlmApiError {
  return e instanceof LlmApiError;
}
