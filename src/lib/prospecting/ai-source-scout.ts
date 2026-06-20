import { getAiResearcherConfig, requestOpenAiResponseJson } from "@/lib/prospecting/ai-researcher";

export type AiSourceScoutInput = {
  country: string;
  city: string;
  zone?: string;
  category: string;
  maxSources?: number;
};

export type AiSourceScoutSuggestion = {
  sourceName: string;
  sourceUrl: string;
  sourceType: "public_directory" | "government_registry" | "open_dataset" | "industry_association" | "map_dataset" | "search_query" | "other";
  expectedData: string[];
  trustLevel: "high" | "medium" | "low";
  extractionDifficulty: "low" | "medium" | "high";
  notes: string;
  evidenceUrls: string[];
};

export type AiSourceScoutResult = {
  sources: AiSourceScoutSuggestion[];
  searchedAt: string;
  aiProvider: string;
  aiModel: string;
  costWarning: string;
  guardrails: string[];
};

const DEFAULT_MAX_SOURCES = 5;
const HARD_MAX_SOURCES = 8;

function clampMaxSources(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value <= 0) return DEFAULT_MAX_SOURCES;
  return Math.min(Math.floor(value), HARD_MAX_SOURCES);
}

function asRequiredString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 8)
    : [];
}

function parseSuggestions(value: unknown): AiSourceScoutSuggestion[] {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const rawSources = Array.isArray(record.sources) ? record.sources : [];

  return rawSources.flatMap((item): AiSourceScoutSuggestion[] => {
    const source = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
    const sourceName = asRequiredString(source.sourceName);
    const sourceUrl = asRequiredString(source.sourceUrl);
    const evidenceUrls = asStringArray(source.evidenceUrls);
    if (!sourceName || !sourceUrl || evidenceUrls.length === 0) return [];

    const sourceType = asRequiredString(source.sourceType) ?? "other";
    const trustLevel = asRequiredString(source.trustLevel) ?? "low";
    const extractionDifficulty = asRequiredString(source.extractionDifficulty) ?? "high";

    return [{
      sourceName,
      sourceUrl,
      sourceType: ["public_directory", "government_registry", "open_dataset", "industry_association", "map_dataset", "search_query", "other"].includes(sourceType) ? sourceType as AiSourceScoutSuggestion["sourceType"] : "other",
      expectedData: asStringArray(source.expectedData),
      trustLevel: ["high", "medium", "low"].includes(trustLevel) ? trustLevel as AiSourceScoutSuggestion["trustLevel"] : "low",
      extractionDifficulty: ["low", "medium", "high"].includes(extractionDifficulty) ? extractionDifficulty as AiSourceScoutSuggestion["extractionDifficulty"] : "high",
      notes: asRequiredString(source.notes) ?? "Revisar manualmente términos de uso, cobertura y trazabilidad antes de usar esta fuente.",
      evidenceUrls,
    }];
  });
}

export async function scoutPublicSourcesWithAi(input: AiSourceScoutInput): Promise<AiSourceScoutResult> {
  const config = getAiResearcherConfig();
  if (config.status !== "configured") throw new Error(config.status);
  if (config.provider !== "openai") throw new Error(`Unsupported AI provider: ${config.provider}.`);

  const maxSources = clampMaxSources(input.maxSources);
  const payload = await requestOpenAiResponseJson({
    config,
    system: "You are an AI Source Scout for a local-first sales prospecting tool. Find possible public data sources only. Do not generate business leads. Do not extract records. Do not contact anyone. Return strict JSON only.",
    user: `Find up to ${maxSources} public, auditable source candidates for discovering businesses by category and zone. Require evidence URLs. Prefer official/open datasets, public directories, associations, OSM/Overture/Foursquare-style sources, and pages that a human can review. Do not return final leads or invented businesses. Input: ${JSON.stringify({ ...input, maxSources })}. Return JSON: {"sources":[{"sourceName":"","sourceUrl":"","sourceType":"public_directory|government_registry|open_dataset|industry_association|map_dataset|search_query|other","expectedData":["names","addresses"],"trustLevel":"high|medium|low","extractionDifficulty":"low|medium|high","notes":"manual review guidance, terms/cost warnings, no automatic scraping","evidenceUrls":[""]}]}`,
  });

  return {
    sources: parseSuggestions(payload).slice(0, maxSources),
    searchedAt: new Date().toISOString(),
    aiProvider: config.provider,
    aiModel: config.model,
    costWarning: config.estimatedCostNote,
    guardrails: [
      "AI Source Scout sugiere fuentes para revisión humana; no genera leads finales.",
      "No ejecuta scraping, extracción automática ni contacto a negocios.",
      "Toda fuente sugerida debe conservar evidencia URL y respetar términos de uso.",
    ],
  };
}
