import type { HawkNextBackgroundTaskControlItem } from "./background-task-controls.js";

export function mergeHawkNextBackgroundTaskControlItems(
  current: readonly HawkNextBackgroundTaskControlItem[],
  updates: readonly HawkNextBackgroundTaskControlItem[],
): HawkNextBackgroundTaskControlItem[] {
  const jobsById = new Map(current.map((job) => [job.jobId, job] as const));
  for (const job of updates) {
    jobsById.set(job.jobId, job);
  }
  return Array.from(jobsById.values());
}
