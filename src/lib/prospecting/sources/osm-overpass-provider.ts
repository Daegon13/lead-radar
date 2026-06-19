import type { RawProspect } from "../types";
import type { DataSourceInput, DataSourceProvider, DataSourceResult } from "./types";

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

type OverpassElement = {
  id?: number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

function escapeOverpass(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function buildTagFilters(input: DataSourceInput): string {
  const tags = input.tags ?? (input.category ? { amenity: [input.category], shop: [input.category], tourism: [input.category], healthcare: [input.category] } : { amenity: ["restaurant", "cafe", "dentist", "clinic"], shop: ["beauty", "hairdresser"] });
  return Object.entries(tags)
    .flatMap(([key, values]) => values.slice(0, 6).map((value) => `["${escapeOverpass(key)}"="${escapeOverpass(value)}"]`))
    .join("");
}

function buildQuery(input: DataSourceInput): string {
  if (input.query) return input.query;
  if (!input.bbox) throw new Error("OSM Overpass provider requires a bbox or explicit query to avoid broad searches.");
  const [south, west, north, east] = input.bbox;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const filters = buildTagFilters(input);
  const timeoutSeconds = Math.ceil(Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS) / 1000);
  return `[out:json][timeout:${timeoutSeconds}];(node${filters}(${south},${west},${north},${east});way${filters}(${south},${west},${north},${east});relation${filters}(${south},${west},${north},${east}););out center ${limit};`;
}

function elementToProspect(element: OverpassElement, checkedAt: string): RawProspect {
  const tags = element.tags ?? {};
  const id = [element.type, element.id].filter(Boolean).join("/");
  return {
    id,
    name: tags.name,
    category: tags.amenity ?? tags.shop ?? tags.tourism ?? tags.healthcare ?? tags.craft ?? tags.office,
    country: tags["addr:country"],
    city: tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"],
    neighborhood: tags["addr:suburb"] ?? tags["addr:neighbourhood"],
    address: tags["addr:full"] ?? ([tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ") || undefined),
    website: tags.website ?? tags["contact:website"],
    phone: tags.phone ?? tags["contact:phone"],
    email: tags.email ?? tags["contact:email"],
    instagram: tags["contact:instagram"],
    facebook: tags["contact:facebook"],
    lat: element.lat ?? element.center?.lat,
    lng: element.lon ?? element.center?.lon,
    source: "OpenStreetMap Overpass API",
    sourceId: id,
    sourceUrl: id ? `https://www.openstreetmap.org/${id}` : "https://www.openstreetmap.org/",
    sourceCheckedAt: checkedAt,
    confidence: 0.55,
    sourcePayload: element,
  };
}

export const osmOverpassProvider: DataSourceProvider = {
  id: "osm-overpass",
  label: "OpenStreetMap Overpass API",
  capabilities: ["http-api", "rate-limited"],
  async run(input): Promise<DataSourceResult> {
    const checkedAt = input.checkedAt ?? new Date().toISOString();
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const timeoutMs = Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input.overpassUrl ?? DEFAULT_OVERPASS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "user-agent": input.userAgent ?? "LeadRadar/phase-14 local prospecting research (contact: manual)",
        },
        body: new URLSearchParams({ data: buildQuery({ ...input, limit, timeoutMs }) }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Overpass request failed with ${response.status}`);
      const payload = (await response.json()) as { elements?: OverpassElement[] };
      const elements = Array.isArray(payload.elements) ? payload.elements.slice(0, limit) : [];
      return { sourceId: this.id, sourceLabel: this.label, checkedAt, input, rawProspects: elements.map((element) => elementToProspect(element, checkedAt)), warnings: [] };
    } finally {
      clearTimeout(timeout);
    }
  },
};
