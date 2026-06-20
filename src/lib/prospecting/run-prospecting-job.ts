import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dedupeProspects } from "./dedupe";
import { getDataSourceProvider, type DataSourceInput } from "./sources";
import { capPriorityForContactability } from "../scoring";
import { calculateProspectFitScore } from "./fit-score";
import { normalizeProspects, type NormalizedProspectRecord } from "./normalize";
import type { Lead, LeadFormValues, Priority } from "../../types/lead";

export type Format = "csv" | "json";
export type Provider = "generic" | "csv-local" | "json-local" | "overture" | "overture-file" | "foursquare" | "foursquare-file" | "osm" | "osm-file" | "osm-overpass";
type RawRecord = Record<string, unknown>;

export type ProspectRunOptions = {
  input: string;
  format: Format;
  provider: Provider;
  country?: string;
  city?: string;
  category?: string;
  limit?: number;
  minPriority?: Priority;
  out: string;
  outputName?: string;
  sources?: DataSourceInput[];
};

const FIELD_ALIASES = {
  id: ["id", "sourceId", "externalId", "providerId", "osm_id"],
  name: ["businessName", "name", "business", "nombre"],
  category: ["category", "rubro", "type", "amenity"],
  country: ["country", "pais", "addr:country"],
  city: ["city", "location", "localidad", "addr:city", "town"],
  address: ["address", "direccion", "addr:full", "addr:street"],
  website: ["websiteUrl", "website", "sitioWeb", "url"],
  instagram: ["instagram", "ig"],
  whatsapp: ["whatsapp"],
  phone: ["phone", "telefono", "contact:phone"],
  rating: ["rating"],
  reviewCount: ["reviewCount", "reviews", "review_count"],
  source: ["source", "fuente"],
  sourceUrl: ["sourceUrl", "urlFuente"],
} as const;

function normalizeForMatch(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-UY")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getValue(record: RawRecord, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return undefined;
}

function passesFilter(record: RawRecord, aliases: readonly string[], expected?: string): boolean {
  if (!expected) return true;
  const actual = normalizeForMatch(getValue(record, aliases));
  return actual.includes(normalizeForMatch(expected));
}

function inferDigitalPresence(website?: string, instagram?: string): Lead["digitalPresenceQuality"] {
  if (website) return "acceptable";
  if (instagram) return "weak";
  return "none";
}

function inferCommercialPotential(category: string): Lead["commercialPotential"] {
  const categoryKey = normalizeForMatch(category);
  if (/clinica|dentista|hotel|inmobiliaria|restaurant|restaurante|spa|estetica/.test(categoryKey)) return "high";
  if (/caf[eé]|tienda|gimnasio|ferreteria|servicio/.test(categoryKey)) return "medium";
  return "medium";
}

function buildLead(prospect: NormalizedProspectRecord, row: number): Lead {
  const now = prospect.sourceCheckedAt;
  const businessName = prospect.name;
  const category = prospect.category;
  const location = prospect.neighborhood ?? prospect.city ?? prospect.address ?? "Sin ubicación";
  const websiteUrl = prospect.website;
  const instagram = prospect.socials.instagram;
  const phone = prospect.phone;
  const whatsapp = prospect.socials.whatsapp;
  const source = prospect.source;
  const sourceId = prospect.sourceId ?? `local-${row}`;
  const fitScore = calculateProspectFitScore(prospect);
  const gapSignals = fitScore.gapSignals;
  const scoreReasons = fitScore.scoreReasons;

  const values: LeadFormValues = {
    businessName,
    category,
    location,
    address: prospect.address,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    hasWebsite: Boolean(websiteUrl),
    websiteUrl,
    instagram,
    whatsapp,
    phone,
    digitalPresenceQuality: inferDigitalPresence(websiteUrl, instagram),
    commercialPotential: inferCommercialPotential(category),
    decisionMakerAccess: phone || whatsapp ? "reachable" : instagram ? "gatekeeper" : "none",
    urgencySignal: websiteUrl ? "low" : "medium",
    problemObservation: websiteUrl
      ? "Prospecto importado desde archivo local; revisar calidad del sitio y señales comerciales antes de contactar."
      : "Prospecto importado desde archivo local sin sitio web informado; validar brecha digital antes de contactar.",
    status: "new",
    nextAction: fitScore.nextAction,
    notes: `Generado por CLI local desde ${source}. No proviene de scraping ni API real.`,
    demoRecommended: !websiteUrl,
    source,
    sourceId,
    sourceUrl: prospect.sourceUrl,
    sourceCheckedAt: now,
    confidence: fitScore.gap.confidence,
    priority: capPriorityForContactability(fitScore.priority, { phone, whatsapp, instagram }),
    gapSignals,
    scoreReasons,
    salesAngle: fitScore.salesAngle,
    callOpening: fitScore.callOpening,
    objectionHint: fitScore.objectionHint,
    doNotCallChecked: false,
    optOut: false,
  };

  return {
    id: `prospect-${sourceId}-${row}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    ...values,
    createdAt: now,
    updatedAt: now,
  };
}

function toCsvValue(value: unknown): string {
  const raw = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function leadsToReviewCsv(leads: Lead[]): string {
  const headers = ["businessName", "category", "location", "address", "phone", "whatsapp", "instagram", "websiteUrl", "priority", "nextAction", "confidence", "gapSignals", "scoreReasons", "salesAngle", "callOpening", "objectionHint"];
  return [headers.join(","), ...leads.map((lead) => headers.map((header) => toCsvValue(lead[header as keyof Lead])).join(","))].join("\n");
}

function providerLabel(provider: Provider): string {
  if (provider === "overture" || provider === "overture-file") return "Overture Places local file";
  if (provider === "foursquare" || provider === "foursquare-file") return "Foursquare OS Places local file";
  if (provider === "osm" || provider === "osm-file") return "OpenStreetMap local file";
  if (provider === "osm-overpass") return "OpenStreetMap Overpass API";
  return "Archivo local";
}

function canonicalProviderId(provider: Provider, format: Format): string {
  if (provider === "generic") return format === "csv" ? "csv-local" : "json-local";
  if (provider === "overture") return "overture-file";
  if (provider === "foursquare") return "foursquare-file";
  if (provider === "osm") return "osm-file";
  return provider;
}

async function loadProviderRecords(options: ProspectRunOptions): Promise<RawRecord[]> {
  const sourceInputs: DataSourceInput[] = options.sources?.length
    ? options.sources
    : [{ id: canonicalProviderId(options.provider, options.format), input: options.input, format: options.format, country: options.country, city: options.city, category: options.category, limit: options.limit }];

  const results = await Promise.all(
    sourceInputs.map(async (sourceInput) => {
      const providerId = sourceInput.id ?? sourceInput.type ?? canonicalProviderId(options.provider, sourceInput.format ?? options.format);
      const provider = getDataSourceProvider(providerId);
      if (!provider) throw new Error(`Unknown data source provider: ${providerId}`);
      return provider.run({ ...sourceInput, format: sourceInput.format ?? options.format, country: sourceInput.country ?? options.country, city: sourceInput.city ?? options.city, category: sourceInput.category ?? options.category, limit: sourceInput.limit ?? options.limit });
    }),
  );

  return results.flatMap((result) => result.rawProspects as RawRecord[]);
}

export type ProspectRunSummary = {
  recordsRead: number;
  totalFound: number;
  filtered: number;
  normalized: number;
  duplicateCount: number;
  deduplicated: number;
  exported: number;
  discarded: number;
  priorityCounts: Record<Priority, number>;
  jsonPath: string;
  csvPath: string;
  leads: Lead[];
  errors: string[];
};

export async function runProspecting(options: ProspectRunOptions): Promise<ProspectRunSummary> {
  const records = await loadProviderRecords(options);
  const filtered = records.filter(
    (record) =>
      passesFilter(record, FIELD_ALIASES.country, options.country) &&
      passesFilter(record, FIELD_ALIASES.city, options.city) &&
      passesFilter(record, FIELD_ALIASES.category, options.category),
  );
  const normalized = normalizeProspects(filtered, { defaultSource: providerLabel(options.provider) });
  const { prospects: cleanProspects, duplicateCount } = dedupeProspects(normalized);
  const limited = cleanProspects.slice(0, options.limit ?? cleanProspects.length);
  const priorityRank: Record<Priority, number> = { A: 4, B: 3, C: 2, D: 1 };
  const minPriority = options.minPriority ?? "D";
  const leads = limited
    .map((prospect, index) => buildLead(prospect, index + 1))
    .filter((lead) => priorityRank[lead.priority ?? "D"] >= priorityRank[minPriority]);

  await mkdir(options.out, { recursive: true });
  const outputName = options.outputName ?? "lead-radar-prospects";
  const jsonPath = path.join(options.out, `${outputName}.json`);
  const csvPath = path.join(options.out, `${outputName}.csv`);
  await writeFile(jsonPath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await writeFile(csvPath, `${leadsToReviewCsv(leads)}\n`, "utf8");

  const priorityCounts: Record<Priority, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const lead of leads) priorityCounts[lead.priority ?? "D"] += 1;

  return {
    recordsRead: records.length,
    totalFound: records.length,
    filtered: filtered.length,
    normalized: normalized.length,
    duplicateCount,
    deduplicated: duplicateCount,
    exported: leads.length,
    discarded: records.length - filtered.length + Math.max(0, normalized.length - cleanProspects.length),
    priorityCounts,
    jsonPath,
    csvPath,
    leads,
    errors: [],
  };
}
