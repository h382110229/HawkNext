import { loadBootstrapModule } from "./bootstrap-loader.js";
import { loadCliDotenv } from "./env.js";
import type { RunDependencies } from "./cli-types.js";
import type {
  CommandCenterApiKeyOptions,
  CommandCenterCloudCnLoginOptions,
  CommandCenterLoginOptions,
} from "./command-center/types.js";

export async function loginForTui(
  deps: RunDependencies,
  options?: CommandCenterLoginOptions,
) {
  const env = deps.env ?? process.env;
  const workingDirectory = (deps.cwd ?? process.cwd)();
  const dotenvResult = (deps.loadDotenv ?? loadCliDotenv)({
    cwd: workingDirectory,
    env,
  });

  if (dotenvResult.error) {
    throw new Error(`Failed to load environment file: ${dotenvResult.path}`, {
      cause: dotenvResult.error,
    });
  }

  const login = deps.loginHawkNextCli ?? (await loadBootstrapModule()).loginHawkNextCli;
  return await login({
    abortSignal: options?.abortSignal,
    env,
    onAuthorizeUrl: options?.onAuthorizeUrl,
  });
}

export async function loginCloudCnForTui(
  deps: RunDependencies,
  options?: CommandCenterCloudCnLoginOptions,
) {
  const env = deps.env ?? process.env;
  const workingDirectory = (deps.cwd ?? process.cwd)();
  const dotenvResult = (deps.loadDotenv ?? loadCliDotenv)({
    cwd: workingDirectory,
    env,
  });

  if (dotenvResult.error) {
    throw new Error(`Failed to load environment file: ${dotenvResult.path}`, {
      cause: dotenvResult.error,
    });
  }

  const login =
    deps.loginCloudCnCodingPlan ?? (await loadBootstrapModule()).loginCloudCnCodingPlan;
  return await login({
    abortSignal: options?.abortSignal,
    env,
    onAuthorizeUrl: options?.onAuthorizeUrl,
  });
}

export async function configureApiKeyForTui(
  deps: RunDependencies,
  options: CommandCenterApiKeyOptions,
) {
  const configure =
    deps.configureCodingPlanApiKey ?? (await loadBootstrapModule()).configureCodingPlanApiKey;
  return await configure({
    apiKey: options.apiKey,
    env: deps.env ?? process.env,
    providerId: options.providerId,
  });
}

export async function logoutForTui(deps: RunDependencies) {
  const env = deps.env ?? process.env;
  const workingDirectory = (deps.cwd ?? process.cwd)();
  const dotenvResult = (deps.loadDotenv ?? loadCliDotenv)({
    cwd: workingDirectory,
    env,
  });

  if (dotenvResult.error) {
    throw new Error(`Failed to load environment file: ${dotenvResult.path}`, {
      cause: dotenvResult.error,
    });
  }

  const logout = deps.logoutHawkNextCli ?? (await loadBootstrapModule()).logoutHawkNextCli;
  return await logout({ env });
}
