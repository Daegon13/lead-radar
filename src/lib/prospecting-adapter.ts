import { calculateProspectFitScore } from "@/lib/prospecting/fit-score";
import { normalizeProspect } from "@/lib/prospecting/normalize";
import type { Lead, LeadFormValues } from "@/types/lead";

export type ExternalProspectResult = {
  id?: string;
  nombre?: string;
  tipo?: string;
  vicinity?: string;
  address?: string;
  rating?: number | null;
  user_ratings_total?: number;
  website?: string;
  phone?: string;
};

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeRating(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(5, value));
  }

  return null;
}

function normalizeReviewCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  return 0;
}

export function mapExternalResultToLeadFormValues(result: ExternalProspectResult): LeadFormValues {
  const websiteUrl = asOptionalString(result.website);
  const address = asOptionalString(result.address);
  const location = asOptionalString(result.vicinity) ?? address ?? "Sin ubicación";

  const baseValues: LeadFormValues = {
    businessName: asOptionalString(result.nombre) ?? "Prospecto sin nombre",
    category: asOptionalString(result.tipo) ?? "Sin categoría",
    location,
    address,
    rating: normalizeRating(result.rating),
    reviewCount: normalizeReviewCount(result.user_ratings_total),
    hasWebsite: Boolean(websiteUrl),
    websiteUrl,
    instagram: undefined,
    whatsapp: undefined,
    phone: asOptionalString(result.phone),
    digitalPresenceQuality: "none",
    commercialPotential: "low",
    decisionMakerAccess: "none",
    urgencySignal: "none",
    problemObservation: undefined,
    status: "new",
    nextAction: "follow_up",
    followUpDate: undefined,
    notes: "Importado desde prospección externa. Revisar variables comerciales antes de priorizar.",
    demoRecommended: false,
  };

  const normalizedProspect = normalizeProspect({
    id: result.id,
    name: baseValues.businessName,
    category: baseValues.category,
    vicinity: baseValues.location,
    address: baseValues.address,
    rating: baseValues.rating,
    reviewCount: baseValues.reviewCount,
    website: baseValues.websiteUrl,
    phone: baseValues.phone,
    source: "Mock prospecting provider",
  });

  if (!normalizedProspect) return baseValues;

  const fitScore = calculateProspectFitScore(normalizedProspect);

  return {
    ...baseValues,
    digitalPresenceQuality: baseValues.websiteUrl ? "acceptable" : "none",
    commercialPotential: fitScore.priority === "A" || fitScore.priority === "B" ? "high" : "medium",
    decisionMakerAccess: baseValues.phone ? "reachable" : "none",
    urgencySignal: fitScore.gap.level >= 4 ? "high" : fitScore.gap.level >= 2 ? "medium" : "low",
    problemObservation: fitScore.gap.summary,
    nextAction: fitScore.nextAction,
    notes: `Importado desde prospección externa. ${fitScore.salesAngle}`,
    demoRecommended: fitScore.gap.level >= 3,
    source: normalizedProspect.source,
    sourceId: normalizedProspect.sourceId,
    sourceUrl: normalizedProspect.sourceUrl,
    sourceCheckedAt: normalizedProspect.sourceCheckedAt,
    confidence: fitScore.gap.confidence,
    priority: fitScore.priority,
    gapSignals: fitScore.gapSignals,
    scoreReasons: fitScore.scoreReasons,
    salesAngle: fitScore.salesAngle,
    callOpening: fitScore.callOpening,
    objectionHint: fitScore.objectionHint,
  };
}

export function buildLeadDedupKey(lead: Pick<Lead, "businessName" | "address" | "location">): string {
  const normalizedName = lead.businessName.trim().toLowerCase();
  const normalizedPlace = (lead.address ?? lead.location).trim().toLowerCase();

  return `${normalizedName}|${normalizedPlace}`;
}
