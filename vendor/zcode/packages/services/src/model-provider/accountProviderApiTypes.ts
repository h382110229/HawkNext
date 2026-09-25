import { CLOUD_CN_PROVIDER_ID, CLOUD_INTL_PROVIDER_ID } from "@hawknext/shared";

export type AccountApiProviderId = typeof CLOUD_CN_PROVIDER_ID | typeof CLOUD_INTL_PROVIDER_ID;

export interface RemoteEnvelope<T> {
  code?: number;
  data?: T;
}

export interface RemoteProjectInfo {
  projectId?: string;
  projectName?: string;
  projectType?: number | string | null;
}

export interface RemoteOrganizationInfo {
  organizationId?: string;
  organizationName?: string;
  projects?: RemoteProjectInfo[];
}

export interface RemoteCustomerInfo {
  organizations?: RemoteOrganizationInfo[];
}

export interface RemoteApiKeySummary {
  apiKey?: string;
  keyType?: number | null;
  name?: string;
}

export interface RemoteApiKeySecret {
  secretKey?: string;
}

export const DEFAULT_ORG_NAME = "默认机构";
export const DEFAULT_PROJECT_NAME = "默认项目";
export const HAWKNEXT_API_KEY_NAME = "hawknext-api-key";
