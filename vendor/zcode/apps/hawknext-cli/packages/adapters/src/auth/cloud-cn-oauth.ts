import { randomBytes } from "node:crypto";
import type { HttpClientPort, HttpClientRunOptions, TraceContext } from "@hawknext/contracts";
import { buildCloudCNApiUrl } from "@hawknext/shared";

const CLOUD_CN_AUTHORIZE_PATH = "/login";
const CLOUD_CN_TOKEN_PATH = "/api/auth/tokenByAuthCode";
const CLOUD_CN_APP_ID = "hawknext";
const OAUTH_STATE_BYTES = 32;
const JSON_CONTENT_TYPE = "application/json";

export interface CloudCnOAuthClientOptions {
  appId?: string;
  appSecret?: string;
  authorizeUrl?: string;
  httpClient: HttpClientPort;
  tokenUrl?: string;
  trace?: TraceContext;
}

export interface CloudCnOAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
}

export interface CloudCnOAuthClient {
  buildAuthorizeUrl(input: { redirectUri: string; state: string }): string;
  exchangeCode(input: { code: string }, options?: HttpClientRunOptions): Promise<CloudCnOAuthTokenSet>;
}

export class CloudCnOAuthError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "CloudCnOAuthError";
  }
}

interface CloudCnTokenEnvelope {
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
  msg?: string;
}

export function createCloudCnOAuthClient(
  options: CloudCnOAuthClientOptions,
): CloudCnOAuthClient {
  const appId = options.appId ?? CLOUD_CN_APP_ID;
  const appSecret = options.appSecret?.trim() ?? "";
  const authorizeUrl =
    options.authorizeUrl ?? buildCloudCNApiUrl(process.env, CLOUD_CN_AUTHORIZE_PATH);
  const tokenUrl = options.tokenUrl ?? buildCloudCNApiUrl(process.env, CLOUD_CN_TOKEN_PATH);

  return {
    buildAuthorizeUrl(input: { redirectUri: string; state: string }): string {
      const query = new URLSearchParams({
        appId,
        redirect: input.redirectUri,
        state: input.state,
      });
      return `${authorizeUrl}?${query.toString()}`;
    },

    async exchangeCode(
      input: { code: string },
      runOptions?: HttpClientRunOptions,
    ): Promise<CloudCnOAuthTokenSet> {
      if (!appSecret) {
        throw new CloudCnOAuthError("CloudCN OAuth appSecret is required.");
      }
      const response = await options.httpClient.request(
        {
          body: new TextEncoder().encode(
            JSON.stringify({
              appId,
              appSecret,
              authCode: input.code,
            }),
          ),
          headers: {
            "Content-Type": JSON_CONTENT_TYPE,
          },
          maxResponseBytes: 64 * 1024,
          method: "POST",
          trace: options.trace,
          url: tokenUrl,
        },
        runOptions,
      );
      const payload = JSON.parse(new TextDecoder().decode(response.body)) as CloudCnTokenEnvelope;
      const accessToken = payload.data?.accessToken?.trim() ?? "";
      if (!accessToken) {
        throw new CloudCnOAuthError(payload.msg ?? "CloudCN token response is missing accessToken.");
      }
      return {
        accessToken,
        ...(payload.data?.refreshToken ? { refreshToken: payload.data.refreshToken } : {}),
      };
    },
  };
}

export function createCloudCnOAuthState(): string {
  return randomBytes(OAUTH_STATE_BYTES).toString("hex");
}
