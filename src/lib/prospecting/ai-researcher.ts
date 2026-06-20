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
const WEB_SEARCH_TOOL = "web_search";
const WEB_SEARCH_PREVIEW_TOOL = "web_search_preview";

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

function extractOutputText(payload: unknown): string {
  const record = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  if (typeof record.output_text === "string") return record.output_text;

  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const contentItem of content) {
      const contentRecord = typeof contentItem === "object" && contentItem !== null ? contentItem as Record<string, unknown> : {};
      if (typeof contentRecord.text === "string") return contentRecord.text;
    }
  }

  return JSON.stringify(payload);
}

export async function requestOpenAiResponseJson(options: {
  config: AiResearcherConfig;
  system: string;
  user: string;
}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.config.timeoutMs);
  const configuredTool = process.env.AI_RESEARCHER_WEB_SEARCH_TOOL?.trim() || WEB_SEARCH_TOOL;
  const toolsToTry = configuredTool === WEB_SEARCH_PREVIEW_TOOL
    ? [WEB_SEARCH_PREVIEW_TOOL]
    : [configuredTool, WEB_SEARCH_PREVIEW_TOOL];

  try {
    let lastError: Error | null = null;
    for (const toolType of toolsToTry) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.config.model,
          tools: [{ type: toolType }],
          input: [
            { role: "system", content: options.system },
            { role: "user", content: options.user },
          ],
          text: { format: { type: "json_object" } },
        }),
      });

      if (response.ok) {
        return JSON.parse(extractOutputText(await response.json()));
      }

      lastError = new Error(`AI provider error ${response.status}`);
      if (toolType === WEB_SEARCH_PREVIEW_TOOL || ![400, 404, 422].includes(response.status)) {
        break;
      }
    }

    throw lastError ?? new Error("AI provider error");
  } finally {
    clearTimeout(timeout);
  }
}

export async function researchLeadWithAi(lead: Lead): Promise<AiLeadResearchResult> {
  const config = getAiResearcherConfig();
  if (config.status !== "configured") throw new Error(`AI Researcher is ${config.status}.`);
  if (config.provider !== "openai") throw new Error(`Unsupported AI provider: ${config.provider}.`);

  const payload = await requestOpenAiResponseJson({
    config,
    system: "You enrich one already-selected A/B sales lead. Do not generate new leads, do not automate contact, and do not overwrite existing data. Return strict JSON only.",
    user: `Research this existing lead for a human web-development sales call. Return JSON with optional fields: researchSummary, verifiedWebsite, verifiedSocials, businessSignals, riskFlags, improvedSalesAngle, improvedCallOpening, evidenceUrls. Keep it concise and cite public URLs when available. Do not invent evidence. Lead: ${JSON.stringify(compactLeadForResearch(lead))}`,
  });
  return parseResearchJson(payload, config);
}
