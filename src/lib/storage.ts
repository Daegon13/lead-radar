import { seedLeads } from "@/data/seed-leads";
import { capPriorityForContactability, isProspectedLead } from "@/lib/scoring";
import { calculateProspectFitScore } from "@/lib/prospecting/fit-score";
import { normalizeProspect } from "@/lib/prospecting/normalize";
import { leadStore } from "@/lib/storage/lead-store";
import type { Lead } from "@/types/lead";

const VALID_STATUSES = new Set<Lead["status"]>(["new", "contacted", "qualified", "proposal", "won", "lost"]);
const VALID_ACTIONS = new Set<Lead["nextAction"]>(["call_today", "dm_or_whatsapp", "follow_up", "disqualify"]);
const VALID_PRIORITIES = new Set<NonNullable<Lead["priority"]>>(["A", "B", "C", "D"]);
const VALID_DIGITAL_QUALITY = new Set<Lead["digitalPresenceQuality"]>(["none", "weak", "acceptable", "strong"]);
const VALID_COMMERCIAL_POTENTIAL = new Set<Lead["commercialPotential"]>(["low", "medium", "high"]);
const VALID_DECISION_ACCESS = new Set<Lead["decisionMakerAccess"]>(["none", "gatekeeper", "reachable", "direct"]);
const VALID_URGENCY = new Set<Lead["urgencySignal"]>(["none", "low", "medium", "high"]);
const VALID_OUTCOMES = new Set([
  "no_answer",
  "answered_not_interested",
  "interested",
  "meeting_booked",
  "proposal_requested",
  "won",
  "lost",
]);

function cloneLeads(leads: Lead[]): Lead[] {
  return leads.map((lead) => ({ ...lead }));
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asOptionalOutcomeEvent(value: unknown): Lead["lastOutcome"] {
  if (!isObjectRecord(value) || typeof value.outcome !== "string" || !VALID_OUTCOMES.has(value.outcome)) {
    return undefined;
  }

  return {
    id: asString(value.id, `outcome-${Math.random().toString(36).slice(2, 10)}`),
    outcome: value.outcome as NonNullable<Lead["lastOutcome"]>["outcome"],
    occurredAt: asString(value.occurredAt, new Date().toISOString()),
    note: asOptionalString(value.note),
  };
}

function asOptionalOutcomeHistory(value: unknown): Lead["outcomeHistory"] {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const events = value.map(asOptionalOutcomeEvent).filter((event): event is NonNullable<Lead["lastOutcome"]> => Boolean(event));
  return events.length > 0 ? events : undefined;
}

function asOptionalStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalizedValues = value
      .map((item) => asOptionalString(item))
      .filter((item): item is string => Boolean(item));

    return normalizedValues.length > 0 ? normalizedValues : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmedValue);
    if (Array.isArray(parsed)) {
      return asOptionalStringArray(parsed);
    }
  } catch {
    // Fall back to pipe-separated CSV-friendly values.
  }

  const values = trimmedValue
    .split("|")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return values.length > 0 ? values : undefined;
}

function asNullableNumber(value: unknown, fallback: number | null): number | null {
  if (value === null) {
    return null;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asAllowedString<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }

  return fallback;
}

function asOptionalAllowedString<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }

  return undefined;
}

function normalizeProspectingContract(lead: Lead, fallbackSource: string, checkedAt: string): Lead {
  if (!isProspectedLead(lead)) {
    return lead;
  }

  const priority = lead.priority ? capPriorityForContactability(lead.priority, lead) : undefined;

  return {
    ...lead,
    source: lead.source ?? fallbackSource,
    sourceCheckedAt: lead.sourceCheckedAt ?? checkedAt,
    gapSignals: lead.gapSignals ?? [],
    scoreReasons: lead.scoreReasons ?? [],
    priority,
  };
}

function normalizeLead(candidate: unknown): Lead | null {
  if (!isObjectRecord(candidate)) {
    return null;
  }

  if (typeof candidate.id !== "string" || typeof candidate.businessName !== "string") {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: candidate.id,
    businessName: candidate.businessName,
    category: asString(candidate.category, "Sin categoría"),
    location: asString(candidate.location, "Sin ubicación"),
    address: asOptionalString(candidate.address),
    rating: asNullableNumber(candidate.rating, null),
    reviewCount: asNumber(candidate.reviewCount, 0),
    hasWebsite: asBoolean(candidate.hasWebsite, Boolean(asOptionalString(candidate.websiteUrl))),
    websiteUrl: asOptionalString(candidate.websiteUrl),
    instagram: asOptionalString(candidate.instagram),
    whatsapp: asOptionalString(candidate.whatsapp),
    phone: asOptionalString(candidate.phone),
    digitalPresenceQuality: asAllowedString(candidate.digitalPresenceQuality, VALID_DIGITAL_QUALITY, "none"),
    commercialPotential: asAllowedString(candidate.commercialPotential, VALID_COMMERCIAL_POTENTIAL, "low"),
    decisionMakerAccess: asAllowedString(candidate.decisionMakerAccess, VALID_DECISION_ACCESS, "none"),
    urgencySignal: asAllowedString(candidate.urgencySignal, VALID_URGENCY, "none"),
    problemObservation: asOptionalString(candidate.problemObservation),
    source: asOptionalString(candidate.source),
    sourceId: asOptionalString(candidate.sourceId),
    sourceUrl: asOptionalString(candidate.sourceUrl),
    sourceCheckedAt: asOptionalString(candidate.sourceCheckedAt),
    confidence: asOptionalNumber(candidate.confidence),
    priority: asOptionalAllowedString(candidate.priority, VALID_PRIORITIES),
    gapSignals: asOptionalStringArray(candidate.gapSignals),
    scoreReasons: asOptionalStringArray(candidate.scoreReasons),
    salesAngle: asOptionalString(candidate.salesAngle),
    callOpening: asOptionalString(candidate.callOpening),
    objectionHint: asOptionalString(candidate.objectionHint),
    lastContactedAt: asOptionalString(candidate.lastContactedAt),
    doNotCallChecked: asOptionalBoolean(candidate.doNotCallChecked),
    optOut: asOptionalBoolean(candidate.optOut),
    contactAttempts: asOptionalNumber(candidate.contactAttempts),
    lastOutcome: asOptionalOutcomeEvent(candidate.lastOutcome),
    outcomeHistory: asOptionalOutcomeHistory(candidate.outcomeHistory),
    nextFollowUpAt: asOptionalString(candidate.nextFollowUpAt),
    dealValueEstimate: asOptionalNumber(candidate.dealValueEstimate),
    researchSummary: asOptionalString(candidate.researchSummary),
    verifiedWebsite: asOptionalString(candidate.verifiedWebsite),
    verifiedSocials: asOptionalStringArray(candidate.verifiedSocials),
    businessSignals: asOptionalStringArray(candidate.businessSignals),
    riskFlags: asOptionalStringArray(candidate.riskFlags),
    improvedSalesAngle: asOptionalString(candidate.improvedSalesAngle),
    improvedCallOpening: asOptionalString(candidate.improvedCallOpening),
    citations: asOptionalStringArray(candidate.citations),
    evidenceUrls: asOptionalStringArray(candidate.evidenceUrls),
    aiResearchedAt: asOptionalString(candidate.aiResearchedAt),
    aiProvider: asOptionalString(candidate.aiProvider),
    aiModel: asOptionalString(candidate.aiModel),
    status: asAllowedString(candidate.status, VALID_STATUSES, "new"),
    nextAction: asAllowedString(candidate.nextAction, VALID_ACTIONS, "follow_up"),
    followUpDate: asOptionalString(candidate.followUpDate),
    notes: asOptionalString(candidate.notes),
    demoRecommended: asBoolean(candidate.demoRecommended, false),
    createdAt: asString(candidate.createdAt, now),
    updatedAt: asString(candidate.updatedAt, now),
  };
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "si", "sí"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function parseNullableNumberLike(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const normalizedDecimal = trimmed.replace(",", ".");
    const parsed = Number(normalizedDecimal);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

type ImportOrigin = "json" | "csv";

export type LeadImportDiscardedRecord = {
  row: number;
  reason: string;
};

export type LeadImportPreview = {
  total: number;
  valid: number;
  discarded: LeadImportDiscardedRecord[];
  deduplicated: number;
};

export type LeadImportResult = {
  leads?: Lead[];
  preview: LeadImportPreview;
  error?: string;
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function createImportedLeadId(row: number): string {
  return `imported-${row}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRecordValue(record: Record<string, unknown>, aliases: string[]): unknown {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeHeader(key);
    if (aliases.some((alias) => normalizeHeader(alias) === normalizedKey)) {
      return value;
    }
  }

  return undefined;
}

function requiredStringFromRecord(
  record: Record<string, unknown>,
  aliases: string[],
): string | undefined {
  const value = getRecordValue(record, aliases);
  return asOptionalString(value);
}

export function mapExternalRecordToLead(
  record: Record<string, unknown>,
  row: number,
  origin: ImportOrigin,
): { lead?: Lead; reason?: string } {
  const now = new Date().toISOString();
  const businessName = requiredStringFromRecord(record, ["businessName", "name", "business"]);

  if (!businessName) {
    return { reason: "falta businessName" };
  }

  const id = asOptionalString(getRecordValue(record, ["id"])) ?? createImportedLeadId(row);
  const createdAt = asOptionalString(getRecordValue(record, ["createdAt"])) ?? now;
  const updatedAt = asOptionalString(getRecordValue(record, ["updatedAt"])) ?? now;
  const address = asOptionalString(getRecordValue(record, ["address", "direccion"]));
  const location = asOptionalString(getRecordValue(record, ["location", "city", "localidad"])) ?? "Sin ubicación";

  const candidate: Record<string, unknown> = {
    id,
    businessName,
    category: asOptionalString(getRecordValue(record, ["category", "rubro"])) ?? "Sin categoría",
    location,
    address,
    rating: parseNullableNumberLike(getRecordValue(record, ["rating"])),
    reviewCount: parseNullableNumberLike(getRecordValue(record, ["reviewCount", "reviews"])) ?? 0,
    hasWebsite:
      parseBooleanLike(getRecordValue(record, ["hasWebsite"])) ??
      Boolean(asOptionalString(getRecordValue(record, ["websiteUrl", "website", "sitioWeb"]))),
    websiteUrl: asOptionalString(getRecordValue(record, ["websiteUrl", "website", "sitioWeb"])),
    instagram: asOptionalString(getRecordValue(record, ["instagram"])),
    whatsapp: asOptionalString(getRecordValue(record, ["whatsapp"])),
    phone: asOptionalString(getRecordValue(record, ["phone", "telefono"])),
    digitalPresenceQuality: asOptionalString(getRecordValue(record, ["digitalPresenceQuality"])),
    commercialPotential: asOptionalString(getRecordValue(record, ["commercialPotential"])),
    decisionMakerAccess: asOptionalString(getRecordValue(record, ["decisionMakerAccess"])),
    urgencySignal: asOptionalString(getRecordValue(record, ["urgencySignal"])),
    problemObservation: asOptionalString(getRecordValue(record, ["problemObservation"])),
    source: asOptionalString(getRecordValue(record, ["source", "fuente"])),
    sourceId: asOptionalString(getRecordValue(record, ["sourceId", "externalId", "providerId"])),
    sourceUrl: asOptionalString(getRecordValue(record, ["sourceUrl", "urlFuente"])),
    sourceCheckedAt: asOptionalString(getRecordValue(record, ["sourceCheckedAt", "checkedAt"])),
    confidence: parseNullableNumberLike(getRecordValue(record, ["confidence", "confianza"])),
    priority: asOptionalAllowedString(getRecordValue(record, ["priority", "prioridad"]), VALID_PRIORITIES),
    gapSignals: asOptionalStringArray(getRecordValue(record, ["gapSignals", "digitalGapSignals"])),
    scoreReasons: asOptionalStringArray(getRecordValue(record, ["scoreReasons", "priorityReasons"])),
    salesAngle: asOptionalString(getRecordValue(record, ["salesAngle", "anguloComercial"])),
    callOpening: asOptionalString(getRecordValue(record, ["callOpening", "aperturaLlamada"])),
    objectionHint: asOptionalString(getRecordValue(record, ["objectionHint", "objecion"])),
    lastContactedAt: asOptionalString(getRecordValue(record, ["lastContactedAt"])),
    doNotCallChecked: parseBooleanLike(getRecordValue(record, ["doNotCallChecked"])),
    optOut: parseBooleanLike(getRecordValue(record, ["optOut"])),
    contactAttempts: parseNullableNumberLike(getRecordValue(record, ["contactAttempts"])),
    nextFollowUpAt: asOptionalString(getRecordValue(record, ["nextFollowUpAt"])),
    dealValueEstimate: parseNullableNumberLike(getRecordValue(record, ["dealValueEstimate"])),
    researchSummary: asOptionalString(getRecordValue(record, ["researchSummary"])),
    verifiedWebsite: asOptionalString(getRecordValue(record, ["verifiedWebsite"])),
    verifiedSocials: asOptionalStringArray(getRecordValue(record, ["verifiedSocials"])),
    businessSignals: asOptionalStringArray(getRecordValue(record, ["businessSignals"])),
    riskFlags: asOptionalStringArray(getRecordValue(record, ["riskFlags"])),
    improvedSalesAngle: asOptionalString(getRecordValue(record, ["improvedSalesAngle"])),
    improvedCallOpening: asOptionalString(getRecordValue(record, ["improvedCallOpening"])),
    citations: asOptionalStringArray(getRecordValue(record, ["citations"])),
    evidenceUrls: asOptionalStringArray(getRecordValue(record, ["evidenceUrls"])),
    aiResearchedAt: asOptionalString(getRecordValue(record, ["aiResearchedAt"])),
    aiProvider: asOptionalString(getRecordValue(record, ["aiProvider"])),
    aiModel: asOptionalString(getRecordValue(record, ["aiModel"])),
    status: asOptionalString(getRecordValue(record, ["status"])),
    nextAction: asOptionalString(getRecordValue(record, ["nextAction"])),
    followUpDate: asOptionalString(getRecordValue(record, ["followUpDate"])),
    notes: asOptionalString(getRecordValue(record, ["notes"])),
    demoRecommended: parseBooleanLike(getRecordValue(record, ["demoRecommended"])),
    createdAt,
    updatedAt,
  };

  const prospect = normalizeProspect({
    id,
    name: businessName,
    category: candidate.category,
    city: location,
    address,
    rating: candidate.rating,
    reviewCount: candidate.reviewCount,
    website: candidate.websiteUrl,
    instagram: candidate.instagram,
    whatsapp: candidate.whatsapp,
    phone: candidate.phone,
    email: getRecordValue(record, ["email", "mail"]),
    source: candidate.source,
    sourceId: candidate.sourceId,
    sourceUrl: candidate.sourceUrl,
  }, { checkedAt: asOptionalString(candidate.sourceCheckedAt) ?? now });

  if (prospect && (!candidate.salesAngle || !candidate.callOpening || !candidate.objectionHint)) {
    const fitScore = calculateProspectFitScore(prospect);
    candidate.confidence ??= fitScore.gap.confidence;
    candidate.priority ??= fitScore.priority;
    candidate.gapSignals ??= fitScore.gapSignals;
    candidate.scoreReasons ??= fitScore.scoreReasons;
    candidate.salesAngle ??= fitScore.salesAngle;
    candidate.callOpening ??= fitScore.callOpening;
    candidate.objectionHint ??= fitScore.objectionHint;
    candidate.nextAction ??= fitScore.nextAction;
  }

  const normalized = normalizeLead(candidate);

  if (!normalized) {
    return { reason: `registro inválido (${origin})` };
  }

  return { lead: normalizeProspectingContract(normalized, origin === "csv" ? "manual-import" : "unknown", now) };
}

function deduplicateLeads(
  leadsWithRow: Array<{ lead: Lead; row: number }>,
): { leads: Lead[]; duplicateRows: number[] } {
  const seenKeys = new Set<string>();
  const deduped: Lead[] = [];
  const duplicateRows: number[] = [];

  for (const entry of leadsWithRow) {
    const { lead, row } = entry;
    const locationOrAddress = (lead.address ?? lead.location).trim().toLowerCase();
    const key = `${lead.businessName.trim().toLowerCase()}|${locationOrAddress}`;

    if (seenKeys.has(key)) {
      duplicateRows.push(row);
      continue;
    }

    seenKeys.add(key);
    deduped.push(lead);
  }

  return { leads: deduped, duplicateRows };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let isQuoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (char === "," && !isQuoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(rawText: string): Array<Record<string, string>> | null {
  const rows = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rows.length < 2) {
    return null;
  }

  const headers = splitCsvLine(rows[0]);
  const records: Array<Record<string, string>> = [];

  for (let index = 1; index < rows.length; index += 1) {
    const rowValues = splitCsvLine(rows[index]);
    const rowRecord: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      rowRecord[header] = rowValues[headerIndex] ?? "";
    });

    records.push(rowRecord);
  }

  return records;
}

function normalizeLeadsArray(input: unknown): Lead[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const normalizedLeads: Lead[] = [];

  for (const item of input) {
    const normalized = normalizeLead(item);

    if (!normalized) {
      return null;
    }

    normalizedLeads.push(normalized);
  }

  return normalizedLeads;
}

export function loadLeads(): Lead[] | null {
  const snapshot = leadStore.loadSnapshot();

  if (!snapshot.rawLeads) {
    return null;
  }

  return normalizeLeadsArray(snapshot.rawLeads);
}

export function saveLeads(leads: Lead[]): void {
  leadStore.saveLeads(leads);
}

export function exportLeadsAsJson(leads: Lead[]): string {
  return JSON.stringify(leads, null, 2);
}

export function importLeadsFromJson(rawText: string): LeadImportResult {
  return importExternalLeads(rawText, "json");
}

export function importLeadsFromCsv(rawText: string): LeadImportResult {
  return importExternalLeads(rawText, "csv");
}

export function importExternalLeads(rawText: string, origin: ImportOrigin): LeadImportResult {
  const discarded: LeadImportDiscardedRecord[] = [];
  let sourceRecords: unknown[] = [];

  if (origin === "json") {
    try {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) {
        return {
          error: "El JSON debe ser un array de registros.",
          preview: { total: 0, valid: 0, discarded: [], deduplicated: 0 },
        };
      }
      sourceRecords = parsed;
    } catch {
      return {
        error: "No se pudo leer el archivo JSON. Verificá que sea un JSON válido.",
        preview: { total: 0, valid: 0, discarded: [], deduplicated: 0 },
      };
    }
  } else {
    const parsedCsv = parseCsv(rawText);

    if (!parsedCsv) {
      return {
        error: "El CSV debe incluir una fila de encabezados y al menos un registro.",
        preview: { total: 0, valid: 0, discarded: [], deduplicated: 0 },
      };
    }

    sourceRecords = parsedCsv;
  }

  const normalizedLeads: Array<{ lead: Lead; row: number }> = [];

  sourceRecords.forEach((record, index) => {
    if (!isObjectRecord(record)) {
      discarded.push({ row: index + 1, reason: "registro no válido" });
      return;
    }

    const mapped = mapExternalRecordToLead(record, index + 1, origin);
    if (!mapped.lead) {
      discarded.push({ row: index + 1, reason: mapped.reason ?? "registro inválido" });
      return;
    }

    normalizedLeads.push({ lead: mapped.lead, row: index + 1 });
  });

  const deduplicated = deduplicateLeads(normalizedLeads);
  deduplicated.duplicateRows.forEach((row) => {
    discarded.push({ row, reason: "duplicado por businessName + address/location" });
  });

  return {
    leads: deduplicated.leads,
    preview: {
      total: sourceRecords.length,
      valid: deduplicated.leads.length,
      discarded,
      deduplicated: deduplicated.duplicateRows.length,
    },
  };
}

export function resetStoredLeads(): Lead[] {
  const cleared: Lead[] = [];
  saveLeads(cleared);
  return cleared;
}

export function loadOrInitializeLeads(): Lead[] {
  const storedLeads = loadLeads();

  if (storedLeads) {
    return storedLeads;
  }

  const initialLeads = cloneLeads(seedLeads);
  saveLeads(initialLeads);
  return initialLeads;
}
