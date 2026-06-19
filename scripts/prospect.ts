import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { dedupeProspects } from "../src/lib/prospecting/dedupe";
import { loadFoursquareFileProspects } from "../src/lib/prospecting/providers/foursquare-file-provider";
import { loadOsmFileProspects } from "../src/lib/prospecting/providers/osm-file-provider";
import { loadOvertureFileProspects } from "../src/lib/prospecting/providers/overture-file-provider";
import { calculateProspectFitScore } from "../src/lib/prospecting/fit-score";
import { normalizeProspects, type NormalizedProspectRecord } from "../src/lib/prospecting/normalize";
import type { Lead, LeadFormValues, Priority } from "../src/types/lead";

export type Format = "csv" | "json";
export type Provider = "generic" | "overture" | "foursquare" | "osm";
type RawRecord = Record<string, unknown>;

export type ProspectRunOptions = {
  input: string;
  format: Format;
  provider: Provider;
  country?: string;
  city?: string;
  category?: string;
  limit?: number;
  out: string;
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

function usage(): never {
  console.error(`Uso: npm run prospect:run -- --input <archivo> --format csv|json --out <ruta> [--provider generic|overture|foursquare|osm] [--country UY] [--city Montevideo] [--category restaurant] [--limit 50]`);
  process.exit(1);
}

function parseArgs(argv: string[]): ProspectRunOptions {
  const values: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) usage();
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    values[key] = value;
    index += 1;
  }

  if (!values.input || !values.format || !values.out) usage();
  if (values.format !== "csv" && values.format !== "json") usage();
  const provider = values.provider ?? "generic";
  if (provider !== "generic" && provider !== "overture" && provider !== "foursquare" && provider !== "osm") usage();

  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) usage();

  return {
    input: values.input,
    format: values.format,
    provider,
    country: values.country,
    city: values.city,
    category: values.category,
    limit,
    out: values.out,
  };
}

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

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(raw: string): RawRecord[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];
  const headers = splitCsvLine(headerLine);
  return rows.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseJson(raw: string): RawRecord[] {
  const parsed: unknown = JSON.parse(raw);
  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { records?: unknown }).records)
      ? (parsed as { records: unknown[] }).records
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : [];

  return records.filter((record): record is RawRecord => typeof record === "object" && record !== null && !Array.isArray(record));
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
    priority: fitScore.priority,
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
  if (provider === "overture") return "Overture Places local file";
  if (provider === "foursquare") return "Foursquare OS Places local file";
  if (provider === "osm") return "OpenStreetMap local file";
  return "Archivo local";
}

async function loadProviderRecords(options: ProspectRunOptions): Promise<RawRecord[]> {
  if (options.provider === "overture") return (await loadOvertureFileProspects(options)) as RawRecord[];
  if (options.provider === "foursquare") return (await loadFoursquareFileProspects(options)) as RawRecord[];
  if (options.provider === "osm") return (await loadOsmFileProspects(options)) as RawRecord[];

  const raw = await readFile(options.input, "utf8");
  return options.format === "csv" ? parseCsv(raw) : parseJson(raw);
}

export type ProspectRunSummary = {
  recordsRead: number;
  filtered: number;
  normalized: number;
  duplicateCount: number;
  exported: number;
  discarded: number;
  priorityCounts: Record<Priority, number>;
  jsonPath: string;
  csvPath: string;
  leads: Lead[];
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
  const leads = limited.map((prospect, index) => buildLead(prospect, index + 1));

  await mkdir(options.out, { recursive: true });
  const jsonPath = path.join(options.out, "lead-radar-prospects.json");
  const csvPath = path.join(options.out, "lead-radar-prospects.csv");
  await writeFile(jsonPath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await writeFile(csvPath, `${leadsToReviewCsv(leads)}\n`, "utf8");

  const priorityCounts: Record<Priority, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const lead of leads) priorityCounts[lead.priority ?? "D"] += 1;

  return {
    recordsRead: records.length,
    filtered: filtered.length,
    normalized: normalized.length,
    duplicateCount,
    exported: leads.length,
    discarded: records.length - filtered.length + Math.max(0, normalized.length - cleanProspects.length),
    priorityCounts,
    jsonPath,
    csvPath,
    leads,
  };
}

async function main() {
  const summary = await runProspecting(parseArgs(process.argv.slice(2)));
  console.log(`Leídos: ${summary.recordsRead}. Filtrados: ${summary.filtered}. Normalizados: ${summary.normalized}. Duplicados: ${summary.duplicateCount}. Exportados: ${summary.exported}.`);
  console.log(`JSON importable: ${summary.jsonPath}`);
  console.log(`CSV revisión: ${summary.csvPath}`);
}

if (process.argv[1]?.endsWith("prospect.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
