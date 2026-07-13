import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dedupeProspects } from "./dedupe";
import { getDataSourceProvider, type DataSourceInput } from "./sources";
import { PROSPECTING_RUNTIME_LIMITS, clampPositiveInteger, isRemoteProviderId } from "./runtime-guards";
import { validateDataPack } from "./data-pack-validator";
import { isCallableLead } from "./callable-lead";
import { capPriorityForContactability } from "../scoring";
import { calculateProspectFitScore } from "./fit-score";
import { normalizeProspects, type NormalizedProspectRecord } from "./normalize";
import type { Lead, LeadFormValues, Priority } from "../../types/lead";
import type { SourceStatus } from "./sources/types";

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
  forceRefresh?: boolean;
  skipRemote?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
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

function canonicalProviderId(provider: Provider, format: Format): string {
  if (provider === "generic") return format === "csv" ? "csv-local" : "json-local";
  if (provider === "overture") return "overture-file";
  if (provider === "foursquare") return "foursquare-file";
  if (provider === "osm") return "osm-file";
  return provider;
}

export type AcquisitionSourceSummary = {
  sourceId: string;
  sourceLabel: string;
  recordsRead: number;
  recordsAccepted: number;
  recordsRejected: number;
  warnings: string[];
  errors: string[];
  durationMs: number;
  status: SourceStatus;
  leadsWithAnyContact?: number;
  leadsWithoutWebsite?: number;
  callableLeads?: number;
  priorityA?: number;
  priorityB?: number;
  sourceYieldScore?: number;
};

export type AcquisitionRunSummary = {
  recordsRead: number;
  totalFound: number;
  filtered: number;
  normalized: number;
  totalRecordsRead: number;
  totalNormalized: number;
  totalDuplicates: number;
  totalExported: number;
  duplicates: number;
  exported: number;
  discarded: number;
  sourcesUsed: string[];
  priorityCounts: Record<Priority, number>;
  jsonPath: string;
  csvPath: string;
  runSummaryPath?: string;
  runStartedAt?: string;
  runFinishedAt?: string;
  durationMs?: number;
  warnings?: string[];
  errors?: string[];
  leadsWithPhone?: number;
  leadsWithEmail?: number;
  leadsWithWebsite?: number;
  leadsWithoutWebsite?: number;
  leadsWithSocials?: number;
  leadsWithAnyContact?: number;
  callableLeads?: number;
  nonCallableLeads?: number;
  contactabilityRate?: number;
  digitalGapRate?: number;
  callableRate?: number;
  priorityABRate?: number;
  sourceFailureRate?: number;
  skippedSourcesCount?: number;
  invalidSourcesCount?: number;
};

export type AcquisitionRun = {
  sources: AcquisitionSourceSummary[];
  summary: AcquisitionRunSummary;
};

type LoadedSourceRecords = {
  summary: AcquisitionSourceSummary;
  records: RawRecord[];
  normalized: NormalizedProspectRecord[];
};

function sourceInputProviderId(sourceInput: DataSourceInput, options: ProspectRunOptions): string {
  return sourceInput.id ?? sourceInput.type ?? canonicalProviderId(options.provider, sourceInput.format ?? options.format);
}

function getSourceInputs(options: ProspectRunOptions): DataSourceInput[] {
  return options.sources?.length
    ? options.sources
    : [{ id: canonicalProviderId(options.provider, options.format), input: options.input, format: options.format, country: options.country, city: options.city, category: options.category, limit: options.limit }];
}

async function loadProviderSource(sourceInput: DataSourceInput, options: ProspectRunOptions, signal?: AbortSignal): Promise<LoadedSourceRecords> {
  const startedAt = Date.now();
  const providerId = sourceInputProviderId(sourceInput, options);
  const provider = getDataSourceProvider(providerId);
  const sourceLabel = provider?.label ?? providerId;

  try {
    if (!provider) throw new Error(`Unknown data source provider: ${providerId}`);
    if (options.skipRemote && (provider.capabilities.includes("http-api") || isRemoteProviderId(providerId))) {
      return { records: [], normalized: [], summary: { sourceId: providerId, sourceLabel, recordsRead: 0, recordsAccepted: 0, recordsRejected: 0, warnings: ["skipped_source: fuente remota omitida por --skipRemote true."], errors: [], durationMs: Date.now() - startedAt, status: "skipped_source" } };
    }
    if (provider.capabilities.includes("local-file")) {
      const validation = await validateDataPack({ ...sourceInput, format: sourceInput.format ?? options.format });
      if (validation.status === "skipped_source" || validation.status === "invalid_source") {
        return { records: [], normalized: [], summary: { sourceId: providerId, sourceLabel, recordsRead: 0, recordsAccepted: 0, recordsRejected: 0, warnings: validation.warnings, errors: validation.errors, durationMs: Date.now() - startedAt, status: validation.status } };
      }
    }
    const result = await provider.run({ ...sourceInput, format: sourceInput.format ?? options.format, country: sourceInput.country ?? options.country, city: sourceInput.city ?? options.city, category: sourceInput.category ?? options.category, limit: sourceInput.limit ?? options.limit, forceRefresh: sourceInput.forceRefresh ?? options.forceRefresh, timeoutMs: sourceInput.timeoutMs ?? options.timeoutMs, signal });
    const records = result.rawProspects as RawRecord[];
    const filtered = records.filter(
      (record) =>
        passesFilter(record, FIELD_ALIASES.country, options.country) &&
        passesFilter(record, FIELD_ALIASES.city, options.city) &&
        passesFilter(record, FIELD_ALIASES.category, options.category),
    );
    const normalized = normalizeProspects(filtered, { defaultSource: result.sourceLabel, checkedAt: result.checkedAt });
    return {
      records,
      normalized,
      summary: {
        sourceId: result.sourceId,
        sourceLabel: result.sourceLabel,
        recordsRead: records.length,
        recordsAccepted: normalized.length,
        recordsRejected: Math.max(0, records.length - normalized.length),
        warnings: result.warnings ?? [],
        errors: result.errors ?? [],
        durationMs: Date.now() - startedAt,
        status: result.status ?? (normalized.length === 0 ? "empty_result" : "success"),
      },
    };
  } catch (error) {
    return {
      records: [],
      normalized: [],
      summary: {
        sourceId: providerId,
        sourceLabel,
        recordsRead: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : "Unknown source error"],
        durationMs: Date.now() - startedAt,
        status: "request_failed",
      },
    };
  }
}

async function loadProviderRecords(options: ProspectRunOptions, signal?: AbortSignal): Promise<LoadedSourceRecords[]> {
  const sourceInputs = getSourceInputs(options);
  return Promise.all(sourceInputs.map((sourceInput) => loadProviderSource(sourceInput, options, signal)));
}

export type ProspectRunSummary = AcquisitionRunSummary & {
  duplicateCount: number;
  deduplicated: number;
  acquisitionRun: AcquisitionRun;
  sources: AcquisitionSourceSummary[];
  leads: Lead[];
  errors: string[];
  warnings: string[];
};


function rate(count: number, total: number): number { return total > 0 ? Number((count / total).toFixed(4)) : 0; }
function hasAnyContact(lead: Lead): boolean { return Boolean(lead.phone || lead.whatsapp || lead.instagram || lead.websiteUrl); }
function hasDigitalGap(lead: Lead): boolean { return lead.digitalPresenceQuality === "none" || lead.digitalPresenceQuality === "weak" || lead.demoRecommended === true || (lead.gapSignals ?? []).length > 0; }
function computeYieldMetrics(leads: Lead[], sources: AcquisitionSourceSummary[]) {
  const leadsWithPhone = leads.filter((lead) => Boolean(lead.phone)).length;
  const leadsWithEmail = leads.filter((lead) => Boolean((lead as Lead & { email?: string }).email)).length;
  const leadsWithWebsite = leads.filter((lead) => Boolean(lead.websiteUrl)).length;
  const leadsWithoutWebsite = leads.length - leadsWithWebsite;
  const leadsWithSocials = leads.filter((lead) => Boolean(lead.instagram)).length;
  const leadsWithAnyContact = leads.filter(hasAnyContact).length;
  const callableLeads = leads.filter(isCallableLead).length;
  const priorityAB = leads.filter((lead) => lead.priority === "A" || lead.priority === "B").length;
  const digitalGap = leads.filter(hasDigitalGap).length;
  const failedSources = sources.filter((source) => ["request_failed", "timeout", "invalid_source"].includes(source.status)).length;
  return { leadsWithPhone, leadsWithEmail, leadsWithWebsite, leadsWithoutWebsite, leadsWithSocials, leadsWithAnyContact, callableLeads, nonCallableLeads: leads.length - callableLeads, contactabilityRate: rate(leadsWithAnyContact, leads.length), digitalGapRate: rate(digitalGap, leads.length), callableRate: rate(callableLeads, leads.length), priorityABRate: rate(priorityAB, leads.length), sourceFailureRate: rate(failedSources, sources.length), skippedSourcesCount: sources.filter((s) => s.status === "skipped_source").length, invalidSourcesCount: sources.filter((s) => s.status === "invalid_source").length };
}
function enrichSourcesWithYield(sources: AcquisitionSourceSummary[], leads: Lead[]): AcquisitionSourceSummary[] {
  return sources.map((source) => {
    const sourceLeads = leads.filter((lead) => lead.source === source.sourceLabel || lead.source === source.sourceId || lead.source?.includes(source.sourceLabel));
    const leadsWithAnyContact = sourceLeads.filter(hasAnyContact).length;
    const callableLeads = sourceLeads.filter(isCallableLead).length;
    const priorityA = sourceLeads.filter((lead) => lead.priority === "A").length;
    const priorityB = sourceLeads.filter((lead) => lead.priority === "B").length;
    const score = Math.round((rate(leadsWithAnyContact, Math.max(source.recordsAccepted, sourceLeads.length)) * 35) + (rate(priorityA + priorityB, Math.max(1, sourceLeads.length)) * 30) + (source.status === "success" ? 20 : source.status === "partial_success" ? 10 : 0) + (source.recordsAccepted > 0 ? 15 : 0));
    return { ...source, leadsWithAnyContact, leadsWithoutWebsite: sourceLeads.filter((lead) => !lead.websiteUrl).length, callableLeads, priorityA, priorityB, sourceYieldScore: Math.max(0, Math.min(100, score)) };
  });
}

export async function runProspecting(options: ProspectRunOptions): Promise<ProspectRunSummary> {
  const runStartedAt = new Date().toISOString();
  const startedMs = Date.now();
  const timeoutMs = clampPositiveInteger(options.timeoutMs, PROSPECTING_RUNTIME_LIMITS.defaultJobTimeoutMs, PROSPECTING_RUNTIME_LIMITS.maxJobTimeoutMs);
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromParent();
  else options.signal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error(`job_failed_timeout: job exceeded ${timeoutMs}ms`)), timeoutMs);
  let sourceResults: LoadedSourceRecords[];
  try {
    sourceResults = await Promise.race([
      loadProviderRecords(options, controller.signal),
      new Promise<LoadedSourceRecords[]>((_, reject) => {
        controller.signal.addEventListener("abort", () => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Error(`job_failed_timeout: job exceeded ${timeoutMs}ms`)), { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromParent);
  }
  let sources = sourceResults.map((result) => result.summary);
  const errors = sources.flatMap((source) => source.errors.map((error) => `${source.sourceLabel}: ${error}`));
  const warnings = sources.flatMap((source) => source.warnings.map((warning) => `${source.sourceLabel}: ${warning}`));


  const recordsRead = sources.reduce((total, source) => total + source.recordsRead, 0);
  const normalized = sourceResults.flatMap((result) => result.normalized);
  const filtered = sources.reduce((total, source) => total + source.recordsAccepted, 0);
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
  const runSummaryPath = path.join(options.out, "run-summary.json");
  await writeFile(jsonPath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
  await writeFile(csvPath, `${leadsToReviewCsv(leads)}\n`, "utf8");

  const priorityCounts: Record<Priority, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const lead of leads) priorityCounts[lead.priority ?? "D"] += 1;
  sources = enrichSourcesWithYield(sources, leads);
  const yieldMetrics = computeYieldMetrics(leads, sources);

  const summary: AcquisitionRunSummary = {
    recordsRead,
    totalFound: recordsRead,
    filtered,
    normalized: normalized.length,
    totalRecordsRead: recordsRead,
    totalNormalized: normalized.length,
    totalDuplicates: duplicateCount,
    totalExported: leads.length,
    duplicates: duplicateCount,
    exported: leads.length,
    discarded: recordsRead - filtered + Math.max(0, normalized.length - cleanProspects.length) + Math.max(0, limited.length - leads.length),
    sourcesUsed: sources.filter((source) => source.recordsAccepted > 0).map((source) => source.sourceId),
    priorityCounts,
    jsonPath,
    csvPath,
    runSummaryPath,
    runStartedAt,
    runFinishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedMs,
    warnings,
    errors,
    ...yieldMetrics,
  };

  await writeFile(runSummaryPath, `${JSON.stringify({
    job: {
      input: options.input,
      format: options.format,
      provider: options.provider,
      country: options.country,
      city: options.city,
      category: options.category,
      limit: options.limit,
      minPriority: options.minPriority,
        outputName: options.outputName,
        forceRefresh: options.forceRefresh,
    },
    options,
    sources,
    recordsRead,
    normalized: normalized.length,
    duplicates: duplicateCount,
    exported: leads.length,
    discarded: summary.discarded,
    priorityCounts,
    ...yieldMetrics,
    warnings,
    errors,
    jsonPath,
    csvPath,
    runStartedAt: summary.runStartedAt,
    runFinishedAt: summary.runFinishedAt,
    durationMs: summary.durationMs,
  }, null, 2)}\n`, "utf8");

  return {
    ...summary,
    duplicateCount,
    deduplicated: duplicateCount,
    acquisitionRun: { sources, summary },
    sources,
    leads,
    errors,
    warnings,
  };
}
