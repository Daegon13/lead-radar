import { seedLeads } from "@/data/seed-leads";
import type { Lead } from "@/types/lead";

const LEADS_STORAGE_KEY = "lead-radar:leads";

const VALID_STATUSES = new Set(["new", "contacted", "qualified", "proposal", "won", "lost"]);
const VALID_ACTIONS = new Set(["call_today", "dm_or_whatsapp", "follow_up", "disqualify"]);
const VALID_DIGITAL_QUALITY = new Set(["none", "weak", "acceptable", "strong"]);
const VALID_COMMERCIAL_POTENTIAL = new Set(["low", "medium", "high"]);
const VALID_DECISION_ACCESS = new Set(["none", "gatekeeper", "reachable", "direct"]);
const VALID_URGENCY = new Set(["none", "low", "medium", "high"]);

function cloneLeads(leads: Lead[]): Lead[] {
  return leads.map((lead) => ({ ...lead }));
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidLead(candidate: unknown): candidate is Lead {
  if (!isObjectRecord(candidate)) {
    return false;
  }

  return (
    typeof candidate.id === "string" &&
    typeof candidate.businessName === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.location === "string" &&
    (typeof candidate.address === "undefined" || typeof candidate.address === "string") &&
    (candidate.rating === null || typeof candidate.rating === "number") &&
    typeof candidate.reviewCount === "number" &&
    typeof candidate.hasWebsite === "boolean" &&
    (typeof candidate.websiteUrl === "undefined" || typeof candidate.websiteUrl === "string") &&
    (typeof candidate.instagram === "undefined" || typeof candidate.instagram === "string") &&
    (typeof candidate.whatsapp === "undefined" || typeof candidate.whatsapp === "string") &&
    (typeof candidate.phone === "undefined" || typeof candidate.phone === "string") &&
    typeof candidate.digitalPresenceQuality === "string" &&
    VALID_DIGITAL_QUALITY.has(candidate.digitalPresenceQuality) &&
    typeof candidate.commercialPotential === "string" &&
    VALID_COMMERCIAL_POTENTIAL.has(candidate.commercialPotential) &&
    typeof candidate.decisionMakerAccess === "string" &&
    VALID_DECISION_ACCESS.has(candidate.decisionMakerAccess) &&
    typeof candidate.urgencySignal === "string" &&
    VALID_URGENCY.has(candidate.urgencySignal) &&
    (typeof candidate.problemObservation === "undefined" || typeof candidate.problemObservation === "string") &&
    typeof candidate.status === "string" &&
    VALID_STATUSES.has(candidate.status) &&
    typeof candidate.nextAction === "string" &&
    VALID_ACTIONS.has(candidate.nextAction) &&
    (typeof candidate.followUpDate === "undefined" || typeof candidate.followUpDate === "string") &&
    (typeof candidate.notes === "undefined" || typeof candidate.notes === "string") &&
    (typeof candidate.demoRecommended === "undefined" || typeof candidate.demoRecommended === "boolean") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
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
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed) || !parsed.every(isValidLead)) {
      return null;
    }

    return parsed;
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
    const parsed = JSON.parse(rawText);

    if (!Array.isArray(parsed)) {
      return { error: "El JSON debe contener un array de leads." };
    }

    if (!parsed.every(isValidLead)) {
      return { error: "El archivo no cumple la estructura mínima esperada de Lead Radar." };
    }

    return { leads: parsed };
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
