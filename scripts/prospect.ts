import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type { Lead, LeadFormValues } from "../src/types/lead";

type Format = "csv" | "json";
type RawRecord = Record<string, unknown>;

type CliOptions = {
  input: string;
  format: Format;
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
  console.error(`Uso: npm run prospect:run -- --input <archivo> --format csv|json --out <ruta> [--country UY] [--city Montevideo] [--category restaurant] [--limit 50]`);
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
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

  const limit = values.limit === undefined ? undefined : Number(values.limit);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) usage();

  return {
    input: values.input,
    format: values.format,
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

function getString(record: RawRecord, aliases: readonly string[]): string | undefined {
  const value = getValue(record, aliases);
  return value === undefined ? undefined : String(value).trim();
}

function getNumber(record: RawRecord, aliases: readonly string[]): number | null {
  const value = getValue(record, aliases);
  if (value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
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

function buildLead(record: RawRecord, row: number): Lead | null {
  const now = new Date().toISOString();
  const businessName = getString(record, FIELD_ALIASES.name);
  if (!businessName) return null;

  const category = getString(record, FIELD_ALIASES.category) ?? "Sin categoría";
  const location = getString(record, FIELD_ALIASES.city) ?? "Sin ubicación";
  const websiteUrl = getString(record, FIELD_ALIASES.website);
  const instagram = getString(record, FIELD_ALIASES.instagram);
  const phone = getString(record, FIELD_ALIASES.phone);
  const whatsapp = getString(record, FIELD_ALIASES.whatsapp);
  const source = getString(record, FIELD_ALIASES.source) ?? "Archivo local";
  const sourceId = getString(record, FIELD_ALIASES.id) ?? `local-${row}`;
  const gapSignals = websiteUrl ? ["Tiene sitio web: requiere revisión manual de calidad"] : ["No se detectó sitio web en el archivo fuente"];
  const scoreReasons = [
    `Rubro filtrado/importado: ${category}`,
    phone || whatsapp || instagram ? "Tiene al menos un contacto público" : "Contacto público no detectado; prioridad limitada",
    websiteUrl ? "Brecha digital pendiente de validar manualmente" : "Brecha digital inicial: sin sitio web informado",
  ];

  const values: LeadFormValues = {
    businessName,
    category,
    location,
    address: getString(record, FIELD_ALIASES.address),
    rating: getNumber(record, FIELD_ALIASES.rating),
    reviewCount: getNumber(record, FIELD_ALIASES.reviewCount) ?? 0,
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
    nextAction: phone || whatsapp ? "call_today" : instagram ? "dm_or_whatsapp" : "follow_up",
    notes: `Generado por CLI local desde ${source}. No proviene de scraping ni API real.`,
    demoRecommended: !websiteUrl,
    source,
    sourceId,
    sourceUrl: getString(record, FIELD_ALIASES.sourceUrl),
    sourceCheckedAt: now,
    confidence: phone || whatsapp || instagram ? 0.7 : 0.45,
    gapSignals,
    scoreReasons,
    salesAngle: websiteUrl
      ? "Auditoría breve para detectar mejoras de conversión en presencia digital existente."
      : "Presencia web básica para captar consultas locales y explicar servicios con claridad.",
    callOpening: `Hola, vi a ${businessName} en un listado local y quería validar si hoy tienen una web que les genere consultas.`,
    objectionHint: "Si ya tienen proveedor, ofrecer diagnóstico puntual y no reemplazo inmediato.",
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

function leadsToReviewCsv(leads: Lead[]): string {
  const headers = ["businessName", "category", "location", "address", "phone", "whatsapp", "instagram", "websiteUrl", "nextAction", "confidence", "gapSignals", "scoreReasons"];
  return [headers.join(","), ...leads.map((lead) => headers.map((header) => toCsvValue(lead[header as keyof Lead])).join(","))].join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const raw = await readFile(options.input, "utf8");
  const records = options.format === "csv" ? parseCsv(raw) : parseJson(raw);
  const filtered = records.filter(
    (record) =>
      passesFilter(record, FIELD_ALIASES.country, options.country) &&
      passesFilter(record, FIELD_ALIASES.city, options.city) &&
      passesFilter(record, FIELD_ALIASES.category, options.category),
  );
  const limited = filtered.slice(0, options.limit ?? filtered.length);
  const leads = limited.map((record, index) => buildLead(record, index + 1)).filter((lead): lead is Lead => lead !== null);

  await mkdir(options.out, { recursive: true });
  const jsonPath = path.join(options.out, "lead-radar-prospects.json");
  const csvPath = path.join(options.out, "lead-radar-prospects.csv");
  await writeFile(jsonPath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await writeFile(csvPath, `${leadsToReviewCsv(leads)}\n`, "utf8");

  console.log(`Leídos: ${records.length}. Filtrados: ${filtered.length}. Exportados: ${leads.length}.`);
  console.log(`JSON importable: ${jsonPath}`);
  console.log(`CSV revisión: ${csvPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
