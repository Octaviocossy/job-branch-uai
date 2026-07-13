import type { FollowupThresholds, FollowupUrgency } from "@repo/models";

export const DEFAULT_FOLLOWUP_THRESHOLDS: FollowupThresholds = { warn: 7, critical: 15 };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function calculateDaysSince(lastUpdated: string, now: Date = new Date()): number {
  const elapsedMs = now.getTime() - new Date(lastUpdated).getTime();

  return Math.max(0, Math.floor(elapsedMs / MS_PER_DAY));
}

export function calculateUrgency(daysSince: number, thresholds: FollowupThresholds): FollowupUrgency {
  if (daysSince >= thresholds.critical) {
    return "critical";
  }

  if (daysSince >= thresholds.warn) {
    return "warn";
  }

  return "ok";
}

export function resolveThresholds(threshold: number | undefined): FollowupThresholds {
  const warn = threshold ?? DEFAULT_FOLLOWUP_THRESHOLDS.warn;
  const critical = Math.max(DEFAULT_FOLLOWUP_THRESHOLDS.critical, warn);

  return { warn, critical };
}

export function todayIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
