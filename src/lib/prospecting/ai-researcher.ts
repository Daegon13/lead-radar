import type { Lead, Priority } from "@/types/lead";

export type AiResearcherStatus = "disabled" | "configured" | "missing_api_key";

export type AiResearcherConfig = {
  status: AiResearcherStatus;
  provider: string;
  model: string;
  maxBatchSize: number;
  timeoutMs: number;
  estimatedCostNote: string;
};

export type AiLeadResearchResult = {
  researchSummary?: string;
  verifiedWebsite?: string;
  verifiedSocials?: string[];
  businessSignals?: string[];
  riskFlags?: string[];
  improvedSalesAngle?: string;
  improvedCallOpening?: string;
  citations?: string[];
  evidenceUrls?: string[];
  aiResearchedAt: string;
  aiProvider: string;
  aiModel: string;
};

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_MAX_BATCH_SIZE = 5;
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_HARD_BATCH_SIZE = 20;
const ENABLED_VALUES = new Set(["1", "true", "yes", "enabled"]);

function numberFromEnv(value: string | undefined, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function getAiResearcherConfig(): AiResearcherConfig {
  const provider = process.env.AI_RESEARCHER_PROVIDER?.trim() || DEFAULT_PROVIDER;
  const model = process.env.AI_RESEARCHER_MODEL?.trim() || DEFAULT_MODEL;
  const maxBatchSize = numberFromEnv(process.env.AI_RESEARCHER_MAX_BATCH_SIZE, DEFAULT_MAX_BATCH_SIZE, MAX_HARD_BATCH_SIZE);
  const timeoutMs = numberFromEnv(process.env.AI_RESEARCHER_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 60_000);
  const enabled = ENABLED_VALUES.has((process.env.AI_RESEARCHER_ENABLED ?? "").trim().toLowerCase());
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  return {
    status: !enabled ? "disabled" : hasApiKey ? "configured" : "missing_api_key",
    provider,
    model,
    maxBatchSize,
    timeoutMs,
    estimatedCostNote: "Enriquecimiento acotado: usar manualmente o en lotes A/B limitados para controlar costos.",
  };
}

export function isBatchEligiblePriority(priority: Priority): boolean {
  return priority === "A" || priority === "B";
}

function compactLeadForResearch(lead: Lead) {
  return {
    businessName: lead.businessName,
    category: lead.category,
    location: lead.location,
    address: lead.address,
    websiteUrl: lead.websiteUrl,
    instagram: lead.instagram,
    whatsapp: lead.whatsapp,
    phone: lead.phone,
    source: lead.source,
    sourceUrl: lead.sourceUrl,
    gapSignals: lead.gapSignals,
    scoreReasons: lead.scoreReasons,
    salesAngle: lead.salesAngle,
    callOpening: lead.callOpening,
  };
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return values.length > 0 ? values.slice(0, 8) : undefined;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseResearchJson(value: unknown, config: AiResearcherConfig): AiLeadResearchResult {
  const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const evidenceUrls = asStringArray(record.evidenceUrls) ?? asStringArray(record.citations);

  return {
    researchSummary: asOptionalString(record.researchSummary),
    verifiedWebsite: asOptionalString(record.verifiedWebsite),
    verifiedSocials: asStringArray(record.verifiedSocials),
    businessSignals: asStringArray(record.businessSignals),
    riskFlags: asStringArray(record.riskFlags),
    improvedSalesAngle: asOptionalString(record.improvedSalesAngle),
    improvedCallOpening: asOptionalString(record.improvedCallOpening),
    citations: asStringArray(record.citations),
    evidenceUrls,
    aiResearchedAt: new Date().toISOString(),
    aiProvider: config.provider,
    aiModel: config.model,
  };
}

export async function researchLeadWithAi(lead: Lead): Promise<AiLeadResearchResult> {
  const config = getAiResearcherConfig();
  if (config.status !== "configured") throw new Error(`AI Researcher is ${config.status}.`);
  if (config.provider !== "openai") throw new Error(`Unsupported AI provider: ${config.provider}.`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        tools: [{ type: "web_search_preview" }],
        input: [
          { role: "system", content: "You enrich one already-selected sales lead. Do not generate new leads, do not automate contact, and do not overwrite existing data. Return strict JSON only." },
          { role: "user", content: `Research this existing lead for a human web-development sales call. Return JSON with optional fields: researchSummary, verifiedWebsite, verifiedSocials, businessSignals, riskFlags, improvedSalesAngle, improvedCallOpening, evidenceUrls. Keep it concise and cite public URLs when available. Lead: ${JSON.stringify(compactLeadForResearch(lead))}` },
        ],
        text: { format: { type: "json_object" } },
      }),
    });

    if (!response.ok) throw new Error(`AI provider error ${response.status}`);
    const payload = await response.json() as { output_text?: string };
    const outputText = payload.output_text ?? JSON.stringify(payload);
    return parseResearchJson(JSON.parse(outputText), config);
  } finally {
    clearTimeout(timeout);
  }
}
