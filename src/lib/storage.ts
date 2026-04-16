import { seedLeads } from "@/data/seed-leads";
import type { Lead } from "@/types/lead";

const LEADS_STORAGE_KEY = "lead-radar:leads";

const VALID_STATUSES = new Set<Lead["status"]>(["new", "contacted", "qualified", "proposal", "won", "lost"]);
const VALID_ACTIONS = new Set<Lead["nextAction"]>(["call_today", "dm_or_whatsapp", "follow_up", "disqualify"]);
const VALID_DIGITAL_QUALITY = new Set<Lead["digitalPresenceQuality"]>(["none", "weak", "acceptable", "strong"]);
const VALID_COMMERCIAL_POTENTIAL = new Set<Lead["commercialPotential"]>(["low", "medium", "high"]);
const VALID_DECISION_ACCESS = new Set<Lead["decisionMakerAccess"]>(["none", "gatekeeper", "reachable", "direct"]);
const VALID_URGENCY = new Set<Lead["urgencySignal"]>(["none", "low", "medium", "high"]);

function cloneLeads(leads: Lead[]): Lead[] {
  return leads.map((lead) => ({ ...lead }));
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function asAllowedString<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  if (typeof value === "string" && allowed.has(value as T)) {
    return value as T;
  }

  return fallback;
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
    status: asAllowedString(candidate.status, VALID_STATUSES, "new"),
    nextAction: asAllowedString(candidate.nextAction, VALID_ACTIONS, "follow_up"),
    followUpDate: asOptionalString(candidate.followUpDate),
    notes: asOptionalString(candidate.notes),
    demoRecommended: asBoolean(candidate.demoRecommended, false),
    createdAt: asString(candidate.createdAt, now),
    updatedAt: asString(candidate.updatedAt, now),
  };
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
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LEADS_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return normalizeLeadsArray(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function saveLeads(leads: Lead[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
}

export function exportLeadsAsJson(leads: Lead[]): string {
  return JSON.stringify(leads, null, 2);
}

export function importLeadsFromJson(rawText: string): { leads?: Lead[]; error?: string } {
  try {
    const normalizedLeads = normalizeLeadsArray(JSON.parse(rawText));

    if (!normalizedLeads) {
      return { error: "El JSON debe ser un array y cada lead debe incluir al menos id y businessName." };
    }

    return { leads: normalizedLeads };
  } catch {
    return { error: "No se pudo leer el archivo JSON. Verificá que sea un JSON válido." };
  }
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
