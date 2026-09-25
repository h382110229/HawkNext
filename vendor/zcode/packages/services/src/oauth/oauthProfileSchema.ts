import {
  CLOUD_CN_PROVIDER_ID,
  type OAuthProviderId,
  type OAuthTokenSet,
  type OAuthUserProfile,
} from "@hawknext/shared";
import type { OAuthProviderAdapter } from "./providers/index.js";

const CLOUD_CN_PROFILE_SCHEMA_VERSION = 2;
const CLOUD_CN_PROFILE_MIGRATION_RETRY_DELAY_MS = 60 * 60 * 1000;

interface RefreshLegacyCloudCNCachedProfileOptions {
  adapter: OAuthProviderAdapter;
  cachedProfile: OAuthUserProfile;
  loadTokenSet: () => Promise<OAuthTokenSet | null>;
  saveProfile: (profile: OAuthUserProfile) => Promise<void>;
  now: () => number;
  runWithAdapterError: <T>(run: () => Promise<T>) => Promise<T>;
}

function getCachedProfileSchemaVersion(profile: OAuthUserProfile): number | null {
  const rawProfile = profile.rawProfile;
  if (!rawProfile || typeof rawProfile !== "object") {
    return null;
  }

  const version = (rawProfile as { hawknextProfileSchemaVersion?: unknown }).hawknextProfileSchemaVersion;
  return typeof version === "number" ? version : null;
}

function getCachedProfileMigrationRetryAfter(profile: OAuthUserProfile): number | null {
  const rawProfile = profile.rawProfile;
  if (!rawProfile || typeof rawProfile !== "object") {
    return null;
  }

  const retryAfter = (rawProfile as { hawknextProfileMigrationRetryAfter?: unknown })
    .hawknextProfileMigrationRetryAfter;
  return typeof retryAfter === "number" ? retryAfter : null;
}

function isCloudCNUserInfoFallback(profile: OAuthUserProfile): boolean {
  return profile.id === "unknown" && profile.username === "user" && profile.displayName === "User";
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function shouldCompleteMigrationAfterError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 401 || status === 403;
}

export function withProviderProfileSchema(
  provider: OAuthProviderId,
  profile: OAuthUserProfile,
): OAuthUserProfile {
  if (provider !== CLOUD_CN_PROVIDER_ID) {
    return profile;
  }

  const rawProfile =
    profile.rawProfile && typeof profile.rawProfile === "object" ? profile.rawProfile : {};
  const nextRawProfile = { ...(rawProfile as Record<string, unknown>) };
  delete nextRawProfile.hawknextProfileMigrationRetryAfter;

  return {
    ...profile,
    rawProfile: {
      ...nextRawProfile,
      hawknextProfileSchemaVersion: CLOUD_CN_PROFILE_SCHEMA_VERSION,
    },
  };
}

function withCloudCNProfileMigrationRetryAfter(
  profile: OAuthUserProfile,
  now: number,
): OAuthUserProfile {
  const rawProfile =
    profile.rawProfile && typeof profile.rawProfile === "object" ? profile.rawProfile : {};

  return {
    ...profile,
    rawProfile: {
      ...(rawProfile as Record<string, unknown>),
      hawknextProfileMigrationRetryAfter: now + CLOUD_CN_PROFILE_MIGRATION_RETRY_DELAY_MS,
    },
  };
}

export async function refreshLegacyCloudCNCachedProfile(
  options: RefreshLegacyCloudCNCachedProfileOptions,
): Promise<OAuthUserProfile> {
  const { adapter, cachedProfile, loadTokenSet, now, runWithAdapterError, saveProfile } = options;
  if (
    (getCachedProfileSchemaVersion(cachedProfile) ?? 0) >= CLOUD_CN_PROFILE_SCHEMA_VERSION ||
    (getCachedProfileMigrationRetryAfter(cachedProfile) ?? 0) > now() ||
    !adapter.fetchUserInfo
  ) {
    return cachedProfile;
  }

  const tokenSet = await loadTokenSet();
  if (!tokenSet) {
    await saveProfile(withProviderProfileSchema(CLOUD_CN_PROVIDER_ID, cachedProfile));
    return cachedProfile;
  }

  try {
    // CloudCN 旧缓存只保存 nickName，升级后 restoreCachedSession 会绕过
    // fetchUserInfo。这里对无版本缓存做 best-effort 刷新，失败仍保留本地登录态。
    const refreshedProfile = await runWithAdapterError(() =>
      adapter.fetchUserInfo!(tokenSet, {
        providerId: CLOUD_CN_PROVIDER_ID,
        state: "",
        redirectUri: adapter.redirectUri,
        now,
      }),
    );
    if (isCloudCNUserInfoFallback(refreshedProfile)) {
      // 旧版本可能把 hawknext JWT 写进 CloudCN access token。
      // adapter 会返回 unknown/User 哨兵值表示无法查 CloudCN 用户信息；
      // 迁移不能把已有可信缓存覆盖成这个哨兵值，否则版本标记会永久固化错误展示名。
      await saveProfile(withProviderProfileSchema(CLOUD_CN_PROVIDER_ID, cachedProfile));
      return cachedProfile;
    }
    const migratedProfile = withProviderProfileSchema(CLOUD_CN_PROVIDER_ID, refreshedProfile);
    await saveProfile(migratedProfile);
    return migratedProfile;
  } catch (error) {
    if (shouldCompleteMigrationAfterError(error)) {
      await saveProfile(withProviderProfileSchema(CLOUD_CN_PROVIDER_ID, cachedProfile));
      return cachedProfile;
    }

    // 离线、超时或 5xx 只是暂时性失败，不能永久写入 schema version 2。
    // 写入 retry-after 可避免每次启动都打 userinfo，同时保留后续成功迁移机会。
    await saveProfile(withCloudCNProfileMigrationRetryAfter(cachedProfile, now()));
    return cachedProfile;
  }
}
