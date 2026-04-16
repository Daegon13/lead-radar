import type { ProspectingHotspot } from "@/lib/prospecting-hotspots";

export const HOTSPOT_RUNS_STORAGE_KEY = "lead-radar:prospecting:hotspot-runs";

export type HotspotRunRegistry = Record<string, { lastRunAt: string }>;

export type ProspectingExecutionLimits = {
  maxZonesPerRun: number;
  maxCandidatesPerRun: number;
  maxCandidatesPerZone: number;
  hotspotCooldownMs: number;
};

export type PlannedHotspotExecution = {
  hotspot: ProspectingHotspot;
  lastRunAt?: string;
};

export const DEFAULT_PROSPECTING_EXECUTION_LIMITS: ProspectingExecutionLimits = {
  maxZonesPerRun: 3,
  maxCandidatesPerRun: 12,
  maxCandidatesPerZone: 4,
  hotspotCooldownMs: 1000 * 60 * 45,
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeLastRunAt(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
}

export function loadHotspotRunRegistry(): HotspotRunRegistry {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(HOTSPOT_RUNS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isObjectRecord(parsed)) {
      return {};
    }

    const normalized: HotspotRunRegistry = {};

    for (const [hotspotId, metadata] of Object.entries(parsed)) {
      if (!isObjectRecord(metadata)) {
        continue;
      }

      const lastRunAt = normalizeLastRunAt(metadata.lastRunAt);
      if (!lastRunAt) {
        continue;
      }

      normalized[hotspotId] = { lastRunAt };
    }

    return normalized;
  } catch {
    return {};
  }
}

export function saveHotspotRunRegistry(registry: HotspotRunRegistry): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HOTSPOT_RUNS_STORAGE_KEY, JSON.stringify(registry));
}

export function recordHotspotRun(hotspotId: string, executedAt = new Date()): HotspotRunRegistry {
  const registry = loadHotspotRunRegistry();
  registry[hotspotId] = { lastRunAt: executedAt.toISOString() };
  saveHotspotRunRegistry(registry);

  return registry;
}

export function recordHotspotBatchRun(hotspotIds: string[], executedAt = new Date()): HotspotRunRegistry {
  const registry = loadHotspotRunRegistry();
  const timestamp = executedAt.toISOString();

  for (const hotspotId of hotspotIds) {
    registry[hotspotId] = { lastRunAt: timestamp };
  }

  saveHotspotRunRegistry(registry);

  return registry;
}

export function planSuggestedHotspotRun(
  hotspots: ProspectingHotspot[],
  registry: HotspotRunRegistry,
  limits: ProspectingExecutionLimits = DEFAULT_PROSPECTING_EXECUTION_LIMITS,
  now = new Date(),
): PlannedHotspotExecution[] {
  const nowMs = now.getTime();

  return hotspots
    .filter((hotspot) => {
      const lastRunAt = registry[hotspot.id]?.lastRunAt;
      if (!lastRunAt) {
        return true;
      }

      const lastRunMs = Date.parse(lastRunAt);
      if (Number.isNaN(lastRunMs)) {
        return true;
      }

      return nowMs - lastRunMs >= limits.hotspotCooldownMs;
    })
    .slice(0, limits.maxZonesPerRun)
    .map((hotspot) => ({
      hotspot,
      lastRunAt: registry[hotspot.id]?.lastRunAt,
    }));
}
