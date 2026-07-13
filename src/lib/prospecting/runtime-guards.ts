export const PROSPECTING_RUNTIME_LIMITS = {
  defaultScheduleConcurrency: 1,
  defaultScheduleMaxJobs: 3,
  defaultJobTimeoutMs: 30_000,
  maxJobTimeoutMs: 120_000,
  maxOverpassLimit: 100,
  defaultRunHistoryLimit: 100,
  maxRunHistoryLimit: 500,
  maxWarningsPrinted: 10,
} as const;

export function clampPositiveInteger(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function isRemoteProviderId(providerId?: string): boolean {
  return providerId === "osm-overpass";
}

export function compactList(values: string[], max = PROSPECTING_RUNTIME_LIMITS.maxWarningsPrinted): { visible: string[]; hidden: number } {
  return { visible: values.slice(0, max), hidden: Math.max(0, values.length - max) };
}
