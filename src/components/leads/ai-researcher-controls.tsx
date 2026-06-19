"use client";

import { useEffect, useMemo, useState } from "react";

import { scoreLead } from "@/lib/scoring";
import type { Lead } from "@/types/lead";

type AiResearcherConfig = {
  status: "disabled" | "configured" | "missing_api_key";
  provider: string;
  model: string;
  maxBatchSize: number;
  estimatedCostNote: string;
};

type AiResearcherControlsProps = {
  lead?: Lead;
  leads?: Lead[];
  onLeadEnriched?: (lead: Lead) => void;
  onLeadsEnriched?: (leads: Lead[]) => void;
  mode: "single" | "batch";
};

const STATUS_LABELS: Record<AiResearcherConfig["status"], string> = {
  disabled: "AI Researcher deshabilitado",
  configured: "AI Researcher configurado",
  missing_api_key: "Falta API key server-only",
};

function mergeResearch(lead: Lead, research: Partial<Lead>): Lead {
  return {
    ...lead,
    researchSummary: research.researchSummary,
    verifiedWebsite: research.verifiedWebsite,
    verifiedSocials: research.verifiedSocials,
    businessSignals: research.businessSignals,
    riskFlags: research.riskFlags,
    improvedSalesAngle: research.improvedSalesAngle,
    improvedCallOpening: research.improvedCallOpening,
    citations: research.citations,
    evidenceUrls: research.evidenceUrls,
    aiResearchedAt: research.aiResearchedAt,
    aiProvider: research.aiProvider,
    aiModel: research.aiModel,
    updatedAt: new Date().toISOString(),
  };
}

async function enrichLead(lead: Lead): Promise<Lead> {
  const response = await fetch("/api/ai-researcher/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead }),
  });
  const payload = await response.json() as { research?: Partial<Lead>; error?: string };
  if (!response.ok || !payload.research) {
    throw new Error(payload.error ?? "No se pudo enriquecer el lead.");
  }
  return mergeResearch(lead, payload.research);
}

export function AiResearcherControls({ lead, leads = [], onLeadEnriched, onLeadsEnriched, mode }: AiResearcherControlsProps) {
  const [config, setConfig] = useState<AiResearcherConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai-researcher/status")
      .then((response) => response.json())
      .then((nextConfig: AiResearcherConfig) => setConfig(nextConfig))
      .catch(() => setConfig({ status: "disabled", provider: "unknown", model: "unknown", maxBatchSize: 0, estimatedCostNote: "No se pudo leer configuración." }));
  }, []);

  const batchCandidates = useMemo(() => {
    if (!config) return [];
    return leads
      .map((candidate) => ({ lead: candidate, score: scoreLead(candidate) }))
      .filter(({ score }) => score.priority === "A" || score.priority === "B")
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, config.maxBatchSize)
      .map(({ lead: candidate }) => candidate);
  }, [config, leads]);

  const disabled = !config || config.status !== "configured" || isRunning || (mode === "single" && !lead) || (mode === "batch" && batchCandidates.length === 0);

  async function runSingle() {
    if (!lead) return;
    setIsRunning(true);
    setMessage(null);
    try {
      const enriched = await enrichLead(lead);
      onLeadEnriched?.(enriched);
      setMessage("Lead enriquecido con IA. Revisá evidencia antes de usar el argumento.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de enriquecimiento.");
    } finally {
      setIsRunning(false);
    }
  }

  async function runBatch() {
    setIsRunning(true);
    setMessage(null);
    const enrichedLeads: Lead[] = [];
    try {
      for (const candidate of batchCandidates) {
        enrichedLeads.push(await enrichLead(candidate));
      }
      onLeadsEnriched?.(enrichedLeads);
      setMessage(`Enriquecidos ${enrichedLeads.length} leads A/B (lote limitado).`);
    } catch (error) {
      if (enrichedLeads.length > 0) onLeadsEnriched?.(enrichedLeads);
      setMessage(error instanceof Error ? error.message : "Error de enriquecimiento por lote.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{config ? STATUS_LABELS[config.status] : "Leyendo AI Researcher..."}</p>
          {config ? <p className="text-xs opacity-80">{config.provider} · {config.model} · máximo {config.maxBatchSize} por corrida. {config.estimatedCostNote}</p> : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={mode === "single" ? runSingle : runBatch}
          className="rounded-md bg-violet-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "Enriqueciendo..." : mode === "single" ? "Enriquecer con IA" : `Enriquecer top A/B (${batchCandidates.length})`}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  );
}
