import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RawProspect } from "../types";
import type { DataSourceInput, DataSourceProvider, DataSourceResult } from "./types";

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_TIMEOUT_MS = 25_000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const DEFAULT_USER_AGENT = "LeadRadar/phase-19 OSM Overpass Uruguay jobs (local-first; manual review; contact: Diego)";
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_ROOT = "exports/source-cache/osm-overpass";

type OverpassElement = {
  id?: number;
  type?: string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OsmTag = { key: string; value: string };
type OverpassPayload = { elements?: OverpassElement[] };
type CachedOverpassPayload = { fetchedAt: string; input: DataSourceInput; payload: OverpassPayload };

function escapeOverpass(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function normalizeTags(input: DataSourceInput): OsmTag[] {
  const tags = input.tags ?? (input.category ? { amenity: [input.category], shop: [input.category], tourism: [input.category], healthcare: [input.category], office: [input.category], leisure: [input.category] } : { amenity: ["restaurant", "cafe", "dentist", "clinic"], shop: ["beauty", "hairdresser"] });
  const pairs = Array.isArray(tags)
    ? tags
    : Object.entries(tags).flatMap(([key, values]) => values.map((value) => ({ key, value })));

  return pairs
    .filter((tag) => tag.key.trim() && tag.value.trim())
    .slice(0, 12);
}

function buildSelector(tag: OsmTag, bbox: string, elementType: "node" | "way" | "relation"): string {
  return `${elementType}["${escapeOverpass(tag.key)}"="${escapeOverpass(tag.value)}"](${bbox});`;
}

function buildQuery(input: DataSourceInput): string {
  if (input.query && !input.bbox) throw new Error("OSM Overpass provider requires a bbox even when a custom query is provided.");
  if (input.query) return input.query;
  if (!input.bbox) throw new Error("OSM Overpass provider requires a bbox to avoid broad searches.");
  const [south, west, north, east] = input.bbox;
  const bbox = `${south},${west},${north},${east}`;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const tags = normalizeTags(input);
  if (tags.length === 0) throw new Error("OSM Overpass provider requires at least one tag filter.");
  const timeoutSeconds = Math.ceil(Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS) / 1000);
  const selectors = tags.flatMap((tag) => [buildSelector(tag, bbox, "node"), buildSelector(tag, bbox, "way"), buildSelector(tag, bbox, "relation")]);
  return `[out:json][timeout:${timeoutSeconds}];(${selectors.join("")});out center ${limit};`;
}

function safeCacheKey(input: DataSourceInput): string {
  const raw = input.cacheKey ?? [input.city, input.category, input.bbox?.join("_")].filter(Boolean).join("-");
  return (raw || "osm-overpass").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "osm-overpass";
}

async function readCachedPayload(input: DataSourceInput, nowMs: number): Promise<CachedOverpassPayload | undefined> {
  if (input.forceRefresh) return undefined;
  const cacheTtlMs = input.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  if (cacheTtlMs <= 0) return undefined;
  try {
    const cachePath = path.join(CACHE_ROOT, safeCacheKey(input), "latest.json");
    const cached = JSON.parse(await readFile(cachePath, "utf8")) as CachedOverpassPayload;
    const fetchedAtMs = Date.parse(cached.fetchedAt);
    if (Number.isNaN(fetchedAtMs) || nowMs - fetchedAtMs > cacheTtlMs) return undefined;
    return cached;
  } catch {
    return undefined;
  }
}

async function writeCachedPayload(input: DataSourceInput, payload: OverpassPayload, fetchedAt: string): Promise<void> {
  const cacheDir = path.join(CACHE_ROOT, safeCacheKey(input));
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, "latest.json"), `${JSON.stringify({ fetchedAt, input, payload }, null, 2)}\n`, "utf8");
}

function elementToProspect(element: OverpassElement, checkedAt: string, input: DataSourceInput): RawProspect {
  const tags = element.tags ?? {};
  const id = [element.type, element.id].filter(Boolean).join("/");
  return {
    id,
    name: tags.name,
    category: input.category ?? tags.amenity ?? tags.shop ?? tags.tourism ?? tags.healthcare ?? tags.craft ?? tags.office ?? tags.leisure ?? tags.sport,
    country: tags["addr:country"] ?? input.country,
    city: tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"] ?? input.city,
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
    confidence: tags.name ? 0.55 : 0.35,
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
    const timeoutMs = Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
    const controller = new AbortController();
    const abortFromParent = () => controller.abort(input.signal?.reason);
    if (input.signal?.aborted) abortFromParent();
    else input.signal?.addEventListener("abort", abortFromParent, { once: true });
    const timeout = setTimeout(() => controller.abort(new Error(`timeout: Overpass request timed out after ${timeoutMs}ms.`)), timeoutMs);
    try {
      const cacheInput = { ...input, limit, timeoutMs };
      const cached = await readCachedPayload(cacheInput, Date.now());
      const payload = cached?.payload ?? await (async () => {
        const response = await fetch(input.overpassUrl ?? DEFAULT_OVERPASS_URL, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "user-agent": input.userAgent ?? DEFAULT_USER_AGENT,
          },
          body: new URLSearchParams({ data: buildQuery(cacheInput) }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Overpass request failed with ${response.status} ${response.statusText}`.trim());
        const freshPayload = (await response.json()) as OverpassPayload;
        await writeCachedPayload(cacheInput, freshPayload, checkedAt);
        return freshPayload;
      })();
      const elements = Array.isArray(payload.elements) ? payload.elements.slice(0, limit) : [];
      const cacheWarning = cached ? `cache_hit: respuesta OSM reutilizada desde ${cached.fetchedAt}; usar forceRefresh para consultar Overpass otra vez.` : "cache_write: respuesta OSM guardada en exports/source-cache/osm-overpass.";
      const warnings = elements.length === 0 ? ["empty_result: OSM Overpass no devolvió resultados para este bbox/rubro; puede ser cobertura incompleta o filtro demasiado estricto.", cacheWarning] : ["success: OSM Overpass es fuente comunitaria: teléfono, web, rubro y dirección pueden estar incompletos.", cacheWarning];
      return { sourceId: this.id, sourceLabel: input.sourceLabel ?? `OSM REAL — ${this.label}`, checkedAt, input, rawProspects: elements.map((element) => elementToProspect(element, checkedAt, input)), warnings, errors: [], status: elements.length === 0 ? "empty_result" : "success" };
    } catch (error) {
      const isTimeout = (error instanceof Error && error.name === "AbortError") || controller.signal.aborted;
      const status = isTimeout ? "timeout" : "request_failed";
      const message = isTimeout
        ? `timeout: Overpass request timed out after ${timeoutMs}ms.`
        : error instanceof Error
          ? `request_failed: Overpass request failed: ${error.message}`
          : "request_failed: Overpass request failed with unknown error.";
      return {
        sourceId: this.id,
        sourceLabel: input.sourceLabel ?? `OSM REAL — ${this.label}`,
        checkedAt,
        input,
        rawProspects: [],
        warnings: [`${message} No se detuvo la corrida; revisar conectividad, estado de Overpass o bajar el límite antes de reintentar.`],
        errors: [`${message} Revisar conectividad, estado de Overpass o bajar el límite antes de reintentar.`],
        status,
      };
    } finally {
      clearTimeout(timeout);
      input.signal?.removeEventListener("abort", abortFromParent);
    }
  },
};
