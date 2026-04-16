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

  return {
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
}

export function buildLeadDedupKey(lead: Pick<Lead, "businessName" | "address" | "location">): string {
  const normalizedName = lead.businessName.trim().toLowerCase();
  const normalizedPlace = (lead.address ?? lead.location).trim().toLowerCase();

  return `${normalizedName}|${normalizedPlace}`;
}
