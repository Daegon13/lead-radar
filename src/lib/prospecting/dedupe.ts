import type { NormalizedProspectRecord } from "./normalize";

export type DedupeOptions = {
  geoThresholdMeters?: number;
};

export type DedupeResult = {
  prospects: NormalizedProspectRecord[];
  duplicateCount: number;
};

const DEFAULT_GEO_THRESHOLD_METERS = 75;

function distanceMeters(a: NormalizedProspectRecord, b: NormalizedProspectRecord): number | null {
  if (a.lat === undefined || a.lng === undefined || b.lat === undefined || b.lng === undefined) return null;
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function hasSameName(a: NormalizedProspectRecord, b: NormalizedProspectRecord): boolean {
  return a.normalizedName.length > 0 && a.normalizedName === b.normalizedName;
}

function hasSharedStrongIdentifier(a: NormalizedProspectRecord, b: NormalizedProspectRecord): boolean {
  return Boolean(
    (a.normalizedPhone && a.normalizedPhone === b.normalizedPhone) ||
      (a.websiteKey && a.websiteKey === b.websiteKey),
  );
}

function hasSameAddress(a: NormalizedProspectRecord, b: NormalizedProspectRecord): boolean {
  return Boolean(a.normalizedAddress && b.normalizedAddress && a.normalizedAddress === b.normalizedAddress);
}

export function areDuplicateProspects(a: NormalizedProspectRecord, b: NormalizedProspectRecord, options: DedupeOptions = {}): boolean {
  if (hasSharedStrongIdentifier(a, b)) return true;
  if (hasSameName(a, b) && hasSameAddress(a, b)) return true;

  const distance = distanceMeters(a, b);
  const threshold = options.geoThresholdMeters ?? DEFAULT_GEO_THRESHOLD_METERS;
  return distance !== null && distance <= threshold && (hasSameName(a, b) || hasSharedStrongIdentifier(a, b) || hasSameAddress(a, b));
}

function mergeProspects(primary: NormalizedProspectRecord, duplicate: NormalizedProspectRecord): NormalizedProspectRecord {
  return {
    ...primary,
    sourceId: primary.sourceId ?? duplicate.sourceId,
    category: primary.category !== "Sin categoría" ? primary.category : duplicate.category,
    country: primary.country ?? duplicate.country,
    city: primary.city ?? duplicate.city,
    neighborhood: primary.neighborhood ?? duplicate.neighborhood,
    address: primary.address ?? duplicate.address,
    normalizedAddress: primary.normalizedAddress || duplicate.normalizedAddress,
    phone: primary.phone ?? duplicate.phone,
    normalizedPhone: primary.normalizedPhone ?? duplicate.normalizedPhone,
    email: primary.email ?? duplicate.email,
    website: primary.website ?? duplicate.website,
    websiteKey: primary.websiteKey ?? duplicate.websiteKey,
    socials: {
      instagram: primary.socials.instagram ?? duplicate.socials.instagram,
      facebook: primary.socials.facebook ?? duplicate.socials.facebook,
      linkedin: primary.socials.linkedin ?? duplicate.socials.linkedin,
      whatsapp: primary.socials.whatsapp ?? duplicate.socials.whatsapp,
      other: Array.from(new Set([...primary.socials.other, ...duplicate.socials.other])),
    },
    lat: primary.lat ?? duplicate.lat,
    lng: primary.lng ?? duplicate.lng,
    rating: primary.rating ?? duplicate.rating,
    reviewCount: Math.max(primary.reviewCount, duplicate.reviewCount),
    source: Array.from(new Set([primary.source, duplicate.source])).join(" + "),
    sourceUrl: primary.sourceUrl ?? duplicate.sourceUrl,
    sourceCheckedAt: primary.sourceCheckedAt > duplicate.sourceCheckedAt ? primary.sourceCheckedAt : duplicate.sourceCheckedAt,
  };
}

export function dedupeProspects(prospects: NormalizedProspectRecord[], options: DedupeOptions = {}): DedupeResult {
  const unique: NormalizedProspectRecord[] = [];
  let duplicateCount = 0;

  for (const prospect of prospects) {
    const existingIndex = unique.findIndex((candidate) => areDuplicateProspects(candidate, prospect, options));
    if (existingIndex === -1) {
      unique.push(prospect);
      continue;
    }

    unique[existingIndex] = mergeProspects(unique[existingIndex], prospect);
    duplicateCount += 1;
  }

  return { prospects: unique, duplicateCount };
}
