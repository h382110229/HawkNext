import type { TuiSelection, TuiSubmitPrompt } from "@hawknext/tui";
import { getHawkNextCopy } from "@hawknext/i18n";
import type { CommandCenterApp, CommandCenterLoginResult } from "./types.js";
import { randomUUID } from "node:crypto";

export function buildLoginSelection(locale?: string): TuiSelection {
  const copy = getHawkNextCopy(locale).tui.loginSetup;
  return {
    emptyMessage: copy.emptyMessage,
    filterable: false,
    help: copy.help,
    items: [
      {
        command: "/login zai-coding-plan",
        id: "zai-coding-plan",
        keywords: ["zai", "oauth", "coding", "plan"],
        pending: {
          cancelStatus: copy.pending.cancelStatus,
          help: copy.pending.help,
          primary: copy.options.zaiOauth.pendingPrimary,
          secondary: copy.options.zaiOauth.pendingSecondary,
          status: copy.pending.status,
        },
        primary: copy.options.zaiOauth.primary,
        secondary: copy.options.zaiOauth.secondary,
      },
      {
        command: "/login cloud-cn-coding-plan",
        id: "cloud-cn-coding-plan",
        keywords: ["cloud-cn", "oauth", "coding", "plan"],
        pending: {
          cancelStatus: copy.pending.cancelStatus,
          help: copy.pending.help,
          primary: copy.options.cloudCnOauth.pendingPrimary,
          secondary: copy.options.cloudCnOauth.pendingSecondary,
          status: copy.pending.status,
        },
        primary: copy.options.cloudCnOauth.primary,
        secondary: copy.options.cloudCnOauth.secondary,
      },
      {
        command: "/login zai-coding-plan-api-key",
        id: "zai-coding-plan-api-key",
        input: {
          cancelStatus: copy.input.cancelStatus,
          clearStatus: copy.input.clearStatus,
          emptyStatus: copy.input.emptyStatus,
          help: copy.input.help,
          mask: true,
          placeholder: copy.input.placeholder,
          primary: copy.options.zaiApiKey.inputPrimary,
          secondary: copy.options.zaiApiKey.inputSecondary,
          status: copy.input.status,
          submitStatus: copy.input.submitStatus,
        },
        keywords: ["zai", "api", "key", "manual"],
        primary: copy.options.zaiApiKey.primary,
        secondary: copy.options.zaiApiKey.secondary,
      },
      {
        command: "/login cloud-cn-coding-plan-api-key",
        id: "cloud-cn-coding-plan-api-key",
        input: {
          cancelStatus: copy.input.cancelStatus,
          clearStatus: copy.input.clearStatus,
          emptyStatus: copy.input.emptyStatus,
          help: copy.input.help,
          mask: true,
          placeholder: copy.input.placeholder,
          primary: copy.options.cloudCnApiKey.inputPrimary,
          secondary: copy.options.cloudCnApiKey.inputSecondary,
          status: copy.input.status,
          submitStatus: copy.input.submitStatus,
        },
        keywords: ["cloud-cn", "api", "key", "manual"],
        primary: copy.options.cloudCnApiKey.primary,
        secondary: copy.options.cloudCnApiKey.secondary,
      },
    ],
    prompt: copy.prompt,
    title: copy.title,
  };
}

export function loginSetupResponse(locale?: string): string {
  return getHawkNextCopy(locale).tui.loginSetup.response;
}

export function formatLoginResult(result: CommandCenterLoginResult): string {
  const label = result.user.name || result.user.email || result.user.user_id;
  const browserNote =
    result.browser && !result.browser.opened
      ? `\nBrowser open failed: ${result.browser.reason ?? "unknown error"}`
      : "";

  return [
    `Configured  Coding Plan as ${label}.`,
    `Model: ${result.model}`,
    `Credentials: ${result.credentialsPath}`,
    `Model selection: ${result.configPath}${browserNote}`,
  ].join("\n");
}

export function formatProviderSetupResult(result: {
  configPath: string;
  model: string;
  providerId: "cloud-cn" | "zai";
}): string {
  const provider = result.providerId === "cloud-cn" ? "CloudCN" : "";
  return [
    `Configured ${provider} Coding Plan.`,
    `Model: ${result.model}`,
    `Model selection: ${result.configPath}`,
  ].join("\n");
}

export async function emitLoginAuthorizeMessage(
  options: Parameters<TuiSubmitPrompt>[1],
  authorizeUrl: string,
  providerName: string,
  session: Pick<CommandCenterApp, "sessionId" | "traceId">,
): Promise<void> {
  const onEvent = options.onEvent;
  if (!onEvent) return;

  await onEvent({
    id: `local-login-authorize-${randomUUID()}` as never,
    payload: {
      content: [
        `Open this URL to sign in with ${providerName}:`,
        "",
        authorizeUrl,
        "",
        "After authorization, return here and I will finish the login automatically.",
      ].join("\n"),
    },
    sequenceNumber: 0,
    sessionId: session.sessionId as never,
    timestamp: new Date(),
    traceId: session.traceId as never,
    type: "assistant_message" as never,
  });
}

export function parseApiKeyLoginArgs(args: string): {
  apiKey: string;
  kind: "cloud-cn-coding-plan-api-key" | "zai-coding-plan-api-key";
  providerId: "cloud-cn" | "zai";
} | null {
  const [kind, ...rest] = args.split(/\s+/u);
  if (kind !== "zai-coding-plan-api-key" && kind !== "cloud-cn-coding-plan-api-key") {
    return null;
  }
  return {
    apiKey: rest.join(" ").trim(),
    kind,
    providerId: kind.startsWith("cloud-cn") ? "cloud-cn" : "zai",
  };
}
