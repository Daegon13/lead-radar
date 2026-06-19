import { mapExternalResultToLeadFormValues } from "@/lib/prospecting-adapter";
import type {
  NormalizedProspect,
  ProspectGapSignal,
  ProspectingProvider,
  ProspectingRunInput,
  ProspectingRunResult,
  RawProspect,
} from "@/lib/prospecting/types";

const PROVIDER_ID = "mock";
const PROVIDER_LABEL = "Mock prospecting provider";

function buildMockRawProspects(input: ProspectingRunInput): RawProspect[] {
  const areaLabel = `${input.category.trim() || "Negocio"} (${input.lat}, ${input.lng})`;
  const category = input.category.trim() || "Comercio";

  return [
    {
      id: "mock-north",
      name: `${areaLabel} Norte`,
      category,
      vicinity: "Zona Norte",
      address: "Av. Principal 123",
      rating: 4.4,
      reviewCount: 82,
      website: "https://ejemplo-negocio-norte.com",
      phone: "+54 11 4000-1111",
    },
    {
      id: "mock-center",
      name: `${areaLabel} Centro`,
      category,
      vicinity: "Centro",
      address: "Calle 9 de Julio 550",
      rating: 3.9,
      reviewCount: 27,
      phone: "+54 11 4555-2020",
    },
    {
      id: "mock-south",
      name: `${areaLabel} Sur`,
      category,
      vicinity: "Zona Sur",
      address: "Mitre 920",
      rating: null,
      reviewCount: 0,
    },
  ];
}

function buildGapSignals(raw: RawProspect): ProspectGapSignal[] {
  const signals: ProspectGapSignal[] = [];

  if (!raw.website) {
    signals.push({
      type: "missing_website",
      label: "Sin sitio web detectado en el mock",
      severity: "high",
      evidence: raw.phone ? "Tiene teléfono público, pero no sitio web." : "No se detectó sitio web público.",
    });
  }

  if (!raw.phone) {
    signals.push({
      type: "missing_contact",
      label: "Contacto público incompleto",
      severity: "medium",
      evidence: "El mock no incluye teléfono para este negocio.",
    });
  }

  if (!raw.reviewCount || raw.reviewCount < 10) {
    signals.push({
      type: "low_reviews",
      label: "Pocas reseñas visibles",
      severity: "low",
      evidence: `${raw.reviewCount ?? 0} reseñas en datos simulados.`,
    });
  }

  return signals;
}

function normalizeRawProspect(raw: RawProspect, checkedAt: string): NormalizedProspect {
  return {
    id: `${PROVIDER_ID}:${raw.id ?? raw.name ?? crypto.randomUUID()}`,
    source: {
      providerId: PROVIDER_ID,
      providerLabel: PROVIDER_LABEL,
      checkedAt,
      externalId: raw.id,
    },
    raw,
    leadValues: mapExternalResultToLeadFormValues({
      id: raw.id,
      nombre: raw.name,
      tipo: raw.category,
      vicinity: raw.vicinity,
      address: raw.address,
      rating: raw.rating,
      user_ratings_total: raw.reviewCount,
      website: raw.website,
      phone: raw.phone,
    }),
    gapSignals: buildGapSignals(raw),
  };
}

export const mockProspectingProvider: ProspectingProvider = {
  id: PROVIDER_ID,
  label: PROVIDER_LABEL,
  run(input: ProspectingRunInput): ProspectingRunResult {
    const checkedAt = new Date().toISOString();
    const rawProspects = buildMockRawProspects(input);
    const limitedRawProspects = typeof input.maxResults === "number" ? rawProspects.slice(0, input.maxResults) : rawProspects;

    return {
      providerId: PROVIDER_ID,
      providerLabel: PROVIDER_LABEL,
      checkedAt,
      input,
      rawProspects: limitedRawProspects,
      prospects: limitedRawProspects.map((raw) => normalizeRawProspect(raw, checkedAt)),
    };
  },
};
