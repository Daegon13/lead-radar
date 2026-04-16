import type { ProspectingHotspot } from "@/lib/prospecting-hotspots";

const PROSPECTING_RUN_METADATA_STORAGE_KEY = "lead-radar:prospecting:hotspot-runs";

export type HotspotRunMetadata = {
  lastRunAt?: string;
};

export type HotspotRunMetadataMap = Record<string, HotspotRunMetadata>;

export type ProspectingExecutionPolicy = {
  maxZonesPerRun: number;
  maxCandidatesPerRun: number;
  maxCandidatesPerZone: number;
  hotspotCooldownMs: number;
};

export type PlannedProspectingRun = {
  hotspots: ProspectingHotspot[];
  skippedByCooldown: ProspectingHotspot[];
  skippedByZoneLimit: ProspectingHotspot[];
};

export const DEFAULT_PROSPECTING_EXECUTION_POLICY: ProspectingExecutionPolicy = {
  maxZonesPerRun: 3,
  maxCandidatesPerRun: 8,
  maxCandidatesPerZone: 3,
  hotspotCooldownMs: 1000 * 60 * 45,
};

function parseDateAsMs(value?: string): number | null {
  if (!value) {
    return null;
  }

  const asMs = Date.parse(value);
  return Number.isFinite(asMs) ? asMs : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function loadHotspotRunMetadata(): HotspotRunMetadataMap {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(PROSPECTING_RUN_METADATA_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return {};
    }

    const metadataEntries = Object.entries(parsed).map(([id, candidate]) => {
      const nextValue = isRecord(candidate) && typeof candidate.lastRunAt === "string"
        ? { lastRunAt: candidate.lastRunAt }
        : {};

      return [id, nextValue] as const;
    });

    return Object.fromEntries(metadataEntries);
  } catch {
    return {};
  }
}

export function saveHotspotRunMetadata(metadata: HotspotRunMetadataMap): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROSPECTING_RUN_METADATA_STORAGE_KEY, JSON.stringify(metadata));
}

export function registerHotspotRun(hotspotId: string, ranAtIso = new Date().toISOString()): HotspotRunMetadataMap {
  const current = loadHotspotRunMetadata();
  const next = {
    ...current,
    [hotspotId]: {
      lastRunAt: ranAtIso,
    },
  };

  saveHotspotRunMetadata(next);
  return next;
}

export function registerHotspotRuns(hotspotIds: string[], ranAtIso = new Date().toISOString()): HotspotRunMetadataMap {
  const current = loadHotspotRunMetadata();
  const next: HotspotRunMetadataMap = { ...current };

  for (const hotspotId of hotspotIds) {
    next[hotspotId] = { lastRunAt: ranAtIso };
  }

  saveHotspotRunMetadata(next);
  return next;
}

export function planProspectingRun(
  hotspots: ProspectingHotspot[],
  metadata: HotspotRunMetadataMap,
  policy: ProspectingExecutionPolicy = DEFAULT_PROSPECTING_EXECUTION_POLICY,
  nowMs = Date.now(),
): PlannedProspectingRun {
  const sortedByPriority = [...hotspots].sort((a, b) => {
    if (a.commercialPriority !== b.commercialPriority) {
      return a.commercialPriority - b.commercialPriority;
    }

    const aLastRunMs = parseDateAsMs(metadata[a.id]?.lastRunAt);
    const bLastRunMs = parseDateAsMs(metadata[b.id]?.lastRunAt);

    if (aLastRunMs === null && bLastRunMs === null) {
      return 0;
    }

    if (aLastRunMs === null) {
      return -1;
    }

    if (bLastRunMs === null) {
      return 1;
    }

    return aLastRunMs - bLastRunMs;
  });

  const available: ProspectingHotspot[] = [];
  const skippedByCooldown: ProspectingHotspot[] = [];

  for (const hotspot of sortedByPriority) {
    const lastRunMs = parseDateAsMs(metadata[hotspot.id]?.lastRunAt);

    if (lastRunMs !== null && nowMs - lastRunMs < policy.hotspotCooldownMs) {
      skippedByCooldown.push(hotspot);
      continue;
    }

    available.push(hotspot);
  }

  return {
    hotspots: available.slice(0, policy.maxZonesPerRun),
    skippedByCooldown,
    skippedByZoneLimit: available.slice(policy.maxZonesPerRun),
  };
}
