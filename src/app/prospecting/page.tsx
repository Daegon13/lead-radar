"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { useLeads } from "@/hooks/use-leads";
import { ENABLE_EXTERNAL_PROSPECTING_FLOW } from "@/lib/constants";
import {
  DEFAULT_PROSPECTING_EXECUTION_LIMITS,
  type HotspotRunRegistry,
  loadHotspotRunRegistry,
  planSuggestedHotspotRun,
  recordHotspotBatchRun,
  recordHotspotRun,
} from "@/lib/prospecting-execution-policy";
import {
  getEnabledProspectingHotspots,
  getProspectingFormDefaults,
  getProspectingHotspotById,
  type ProspectingHotspot,
} from "@/lib/prospecting-hotspots";
import { buildLeadDedupKey } from "@/lib/prospecting-adapter";
import { scoreLead } from "@/lib/scoring";
import { mockProspectingProvider } from "@/lib/prospecting/providers/mock-provider";
import type { ProspectingRunInput } from "@/lib/prospecting/types";
import type { Lead, LeadFormValues } from "@/types/lead";


type ProspectingJobDefinition = {
  id: string;
  label: string;
  description: string;
  country?: string;
  city?: string;
  categories: string[];
  sourceType: string;
  sources: Array<{ id?: string; type?: string; input?: string; format?: string; bbox?: number[]; tags?: unknown }>;
  limit: number;
  minPriority: string;
  outputName: string;
};

type AcquisitionSourceSummary = {
  sourceId: string;
  sourceLabel: string;
  recordsRead: number;
  recordsAccepted: number;
  recordsRejected: number;
  warnings: string[];
  errors: string[];
  durationMs: number;
  status?: "request_failed" | "timeout" | "empty_result" | "success";
};

type JobRunSummary = {
  recordsRead: number;
  totalRecordsRead?: number;
  filtered: number;
  normalized: number;
  totalNormalized?: number;
  duplicateCount: number;
  totalDuplicates?: number;
  exported: number;
  totalExported?: number;
  discarded: number;
  sourcesUsed?: string[];
  priorityCounts: Record<"A" | "B" | "C" | "D", number>;
  jsonPath: string;
  csvPath: string;
  runSummaryPath?: string;
  sources?: AcquisitionSourceSummary[];
  errors?: string[];
  warnings?: string[];
  leads: Lead[];
};

type JobRunState = {
  status: "idle" | "running" | "success" | "error";
  summary?: JobRunSummary;
  error?: string;
};

type AiSourceScoutSuggestion = {
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  expectedData: string[];
  trustLevel: string;
  extractionDifficulty: string;
  notes: string;
  evidenceUrls: string[];
};

type AiSourceScoutState = {
  status: "idle" | "running" | "success" | "error";
  sources: AiSourceScoutSuggestion[];
  error?: string;
  costWarning?: string;
  guardrails?: string[];
};

type SearchFormState = {
  strategicPointId: string;
  lat: string;
  lng: string;
  radio: string;
  rubro: string;
};

type ProspectCandidate = {
  id: string;
  hotspotId?: string;
  hotspotLabel?: string;
  values: LeadFormValues;
  dedupeReason: "existing" | "batch" | null;
  origin: "mock" | "json";
};

function jobBadges(job: ProspectingJobDefinition): string[] {
  const sourceIds = job.sources.map((source) => source.id ?? source.type ?? "");
  const badges = new Set<string>();
  if (job.sourceType.includes("demo") || job.id.includes("demo") || job.sources.some((source) => source.input?.startsWith("samples/"))) badges.add("DEMO");
  if (job.sourceType.includes("local") || job.sources.some((source) => source.input?.startsWith("data/sources/"))) badges.add("LOCAL FILE");
  if (sourceIds.includes("osm-overpass")) badges.add("OSM REAL");
  if (sourceIds.includes("overture-file")) badges.add("OVERTURE LOCAL");
  if (sourceIds.includes("foursquare-file")) badges.add("FOURSQUARE LOCAL");
  if (job.sources.length > 1 || job.sourceType.includes("multisource")) badges.add("MULTISOURCE");
  if (job.sourceType.includes("ai") || job.id.includes("ai")) badges.add("AI ASSISTED");
  return Array.from(badges);
}

function isRealJob(job: ProspectingJobDefinition): boolean {
  return jobBadges(job).some((badge) => ["OSM REAL", "OVERTURE LOCAL", "FOURSQUARE LOCAL", "MULTISOURCE"].includes(badge));
}

const MANUAL_STRATEGIC_POINT_ID = "manual";

function createProspectId(index: number): string {
  return `prospect-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLeadId(): string {
  return `lead-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isLeadLike(value: unknown): value is Lead | LeadFormValues {
  return (
    isRecord(value) &&
    typeof value.businessName === "string" &&
    typeof value.category === "string" &&
    typeof value.location === "string" &&
    typeof value.hasWebsite === "boolean" &&
    typeof value.reviewCount === "number" &&
    typeof value.digitalPresenceQuality === "string" &&
    typeof value.commercialPotential === "string" &&
    typeof value.decisionMakerAccess === "string" &&
    typeof value.urgencySignal === "string" &&
    typeof value.status === "string" &&
    typeof value.nextAction === "string"
  );
}

function leadLikeToFormValues(value: Lead | LeadFormValues): LeadFormValues {
  const leadRecord = value as Lead;
  const values = { ...leadRecord };
  delete (values as Partial<Lead>).id;
  delete (values as Partial<Lead>).createdAt;
  delete (values as Partial<Lead>).updatedAt;
  return {
    ...values,
    hasWebsite: values.hasWebsite ?? Boolean(values.websiteUrl),
    gapSignals: asStringArray(values.gapSignals),
    scoreReasons: asStringArray(values.scoreReasons),
  };
}

function materializeLead(values: LeadFormValues): Lead {
  const now = new Date().toISOString();

  return {
    ...values,
    id: createLeadId(),
    createdAt: now,
    updatedAt: now,
  };
}

function formatLastRun(lastRunAt?: string): string {
  if (!lastRunAt) {
    return "Sin corridas registradas";
  }

  const timestamp = Date.parse(lastRunAt);
  if (Number.isNaN(timestamp)) {
    return "Sin corridas registradas";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function ProspectingPage() {
  const { leads, createLead, replaceLeads } = useLeads();
  const enabledHotspots = useMemo(() => getEnabledProspectingHotspots(), []);
  const [form, setForm] = useState<SearchFormState>({
    strategicPointId: MANUAL_STRATEGIC_POINT_ID,
    lat: "",
    lng: "",
    radio: "",
    rubro: "",
  });
  const [hotspotRuns, setHotspotRuns] = useState<HotspotRunRegistry>({});
  const [candidates, setCandidates] = useState<ProspectCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ProspectingJobDefinition[]>([]);
  const [jobListError, setJobListError] = useState<string | null>(null);
  const [jobRuns, setJobRuns] = useState<Record<string, JobRunState>>({});
  const [sourceScout, setSourceScout] = useState<AiSourceScoutState>({ status: "idle", sources: [] });

  useEffect(() => {
    setHotspotRuns(loadHotspotRunRegistry());
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/prospecting/jobs")
      .then(async (response) => {
        const payload = (await response.json()) as { jobs?: ProspectingJobDefinition[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el registro de jobs.");
        if (!cancelled) setJobs(payload.jobs ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setJobListError(error instanceof Error ? error.message : "No se pudo cargar el registro de jobs.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const existingKeys = useMemo(
    () => new Set(leads.map((lead) => buildLeadDedupKey(lead))),
    [leads],
  );

  if (!ENABLE_EXTERNAL_PROSPECTING_FLOW) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Prospección externa
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Este flujo está deshabilitado por política del proyecto.
          </p>
        </header>
        <Link
          href="/leads"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Volver a leads
        </Link>
      </section>
    );
  }

  function updateField(field: keyof SearchFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleStrategicPointChange(value: string) {
    if (value === MANUAL_STRATEGIC_POINT_ID) {
      updateField("strategicPointId", value);
      return;
    }

    const defaults = getProspectingFormDefaults(value);
    if (!defaults.lat || !defaults.lng) {
      updateField("strategicPointId", MANUAL_STRATEGIC_POINT_ID);
      return;
    }

    setForm((current) => ({
      ...current,
      strategicPointId: value,
      lat: defaults.lat,
      lng: defaults.lng,
      radio: defaults.radio,
      rubro: defaults.rubro || current.rubro,
    }));
  }

  async function buildCandidatesForSearch(
    searchForm: SearchFormState,
    options?: {
      maxCandidates?: number;
      hotspot?: ProspectingHotspot;
      startIndex?: number;
      batchKeys?: Set<string>;
    },
  ): Promise<ProspectCandidate[]> {
    const batchKeys = options?.batchKeys ?? new Set<string>();
    const runInput: ProspectingRunInput = {
      lat: Number(searchForm.lat),
      lng: Number(searchForm.lng),
      radiusMeters: Number(searchForm.radio),
      category: searchForm.rubro,
      hotspotId: options?.hotspot?.id,
      hotspotLabel: options?.hotspot?.label,
      maxResults: options?.maxCandidates,
    };
    const result = await mockProspectingProvider.run(runInput);

    return result.prospects.map((prospect, index) => {
      const values = prospect.leadValues;
      const key = buildLeadDedupKey({
        businessName: values.businessName,
        address: values.address,
        location: values.location,
      });

      let dedupeReason: ProspectCandidate["dedupeReason"] = null;
      if (existingKeys.has(key)) {
        dedupeReason = "existing";
      } else if (batchKeys.has(key)) {
        dedupeReason = "batch";
      }

      batchKeys.add(key);

      return {
        id: createProspectId((options?.startIndex ?? 0) + index),
        hotspotId: options?.hotspot?.id,
        hotspotLabel: options?.hotspot?.label,
        values,
        dedupeReason,
        origin: "mock",
      };
    });
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const radius = Number(form.radio);

    if (
      !form.rubro.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(radius)
    ) {
      setFeedback(
        "Completá lat/lng/radio numéricos y rubro para buscar prospectos.",
      );
      return;
    }

    const hotspot =
      form.strategicPointId !== MANUAL_STRATEGIC_POINT_ID
        ? getProspectingHotspotById(form.strategicPointId)
        : undefined;
    const mappedCandidates = await buildCandidatesForSearch(form, { hotspot });

    if (hotspot) {
      setHotspotRuns(recordHotspotRun(hotspot.id));
    }

    setCandidates(mappedCandidates);
    setSelectedIds(
      mappedCandidates
        .filter((item) => item.dedupeReason === null)
        .map((item) => item.id),
    );
    setFeedback(
      `Se encontraron ${mappedCandidates.length} candidatos simulados para revisar.`,
    );
  }

  async function handleSuggestedRun() {
    const limits = DEFAULT_PROSPECTING_EXECUTION_LIMITS;
    const plan = planSuggestedHotspotRun(enabledHotspots, hotspotRuns, limits);

    if (plan.length === 0) {
      setFeedback(
        "No hay hotspots disponibles para corrida sugerida (todos están en enfriamiento).",
      );
      return;
    }

    let indexOffset = 0;
    let remainingForRun = limits.maxCandidatesPerRun;
    const batchKeys = new Set<string>();
    const aggregated: ProspectCandidate[] = [];

    for (const entry of plan) {
      if (remainingForRun <= 0) {
        break;
      }

      const defaults = getProspectingFormDefaults(entry.hotspot.id);
      const searchForm: SearchFormState = {
        strategicPointId: entry.hotspot.id,
        lat: defaults.lat,
        lng: defaults.lng,
        radio: defaults.radio,
        rubro: defaults.rubro,
      };

      const maxForZone = Math.min(limits.maxCandidatesPerZone, remainingForRun);
      const zoneCandidates = await buildCandidatesForSearch(searchForm, {
        maxCandidates: maxForZone,
        hotspot: entry.hotspot,
        startIndex: indexOffset,
        batchKeys,
      });

      aggregated.push(...zoneCandidates);
      indexOffset += zoneCandidates.length;
      remainingForRun -= zoneCandidates.length;
    }

    if (aggregated.length === 0) {
      setFeedback(
        "La corrida sugerida no devolvió candidatos dentro de los límites configurados.",
      );
      return;
    }

    setCandidates(aggregated);
    setSelectedIds(
      aggregated
        .filter((item) => item.dedupeReason === null)
        .map((item) => item.id),
    );

    const executedHotspotIds = Array.from(
      new Set(
        aggregated.flatMap((item) => (item.hotspotId ? [item.hotspotId] : [])),
      ),
    );
    if (executedHotspotIds.length > 0) {
      setHotspotRuns(recordHotspotBatchRun(executedHotspotIds));
    }

    setFeedback(
      `Corrida sugerida generó ${aggregated.length} candidatos en ${executedHotspotIds.length} zonas.`,
    );
  }

  function toggleSelection(candidateId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, candidateId]));
      }

      return current.filter((id) => id !== candidateId);
    });
  }

  async function handleRunRegisteredJob(jobId: string) {
    setJobRuns((current) => ({
      ...current,
      [jobId]: { status: "running" },
    }));

    try {
      const response = await fetch("/api/prospecting/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const payload = (await response.json()) as { summary?: JobRunSummary; error?: string };
      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "No se pudo ejecutar el job.");
      }

      setJobRuns((current) => ({
        ...current,
        [jobId]: { status: "success", summary: payload.summary },
      }));
      setFeedback(`Job ejecutado: ${payload.summary.exported} leads exportados. Podés importar los resultados a la tabla de revisión.`);
    } catch (error) {
      setJobRuns((current) => ({
        ...current,
        [jobId]: {
          status: "error",
          error: error instanceof Error ? error.message : "No se pudo ejecutar el job.",
        },
      }));
    }
  }

  async function handleAiSourceScout() {
    if (!form.rubro.trim()) {
      setFeedback("Indicá un rubro antes de buscar fuentes públicas con IA.");
      return;
    }

    const hotspot = form.strategicPointId !== MANUAL_STRATEGIC_POINT_ID
      ? getProspectingHotspotById(form.strategicPointId)
      : undefined;

    setSourceScout({ status: "running", sources: [] });

    try {
      const response = await fetch("/api/ai-researcher/source-scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: "Uruguay",
          city: "Montevideo",
          zone: hotspot?.label ?? "zona manual",
          category: form.rubro,
          maxSources: 5,
        }),
      });
      const payload = (await response.json()) as {
        result?: {
          sources?: AiSourceScoutSuggestion[];
          costWarning?: string;
          guardrails?: string[];
        };
        error?: string;
      };
      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "No se pudo buscar fuentes públicas con IA.");
      }

      setSourceScout({
        status: "success",
        sources: payload.result.sources ?? [],
        costWarning: payload.result.costWarning,
        guardrails: payload.result.guardrails,
      });
      setFeedback("AI Source Scout devolvió fuentes sugeridas para revisión manual. No se extrajeron leads.");
    } catch (error) {
      setSourceScout({
        status: "error",
        sources: [],
        error: error instanceof Error ? error.message : "No se pudo buscar fuentes públicas con IA.",
      });
    }
  }

  async function copySourceText(source: AiSourceScoutSuggestion) {
    const text = [
      `${source.sourceName}: ${source.sourceUrl}`,
      `Tipo: ${source.sourceType}`,
      `Datos esperados: ${source.expectedData.join(", ") || "sin detalle"}`,
      `Confianza: ${source.trustLevel}`,
      `Dificultad: ${source.extractionDifficulty}`,
      `Notas: ${source.notes}`,
      `Evidencia: ${source.evidenceUrls.join(", ")}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setFeedback(`Se copiaron notas de ${source.sourceName}.`);
  }

  function importJobRunResults(jobId: string) {
    const summary = jobRuns[jobId]?.summary;
    if (!summary) return;

    const batchKeys = new Set<string>();
    const importedCandidates = summary.leads.map((lead, index) => {
      const values = leadLikeToFormValues(lead);
      const key = buildLeadDedupKey({
        businessName: values.businessName,
        address: values.address,
        location: values.location,
      });

      let dedupeReason: ProspectCandidate["dedupeReason"] = null;
      if (existingKeys.has(key)) {
        dedupeReason = "existing";
      } else if (batchKeys.has(key)) {
        dedupeReason = "batch";
      }

      batchKeys.add(key);

      return {
        id: createProspectId(index),
        hotspotLabel: "Job registrado",
        values,
        dedupeReason,
        origin: "json" as const,
      };
    });

    setCandidates(importedCandidates);
    setSelectedIds(importedCandidates.filter((item) => item.dedupeReason === null).map((item) => item.id));
    setFeedback(`Se cargaron ${importedCandidates.length} resultados del job en la tabla de revisión.`);
  }

  async function handleImportJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const records = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.leads)
          ? parsed.leads
          : isRecord(parsed) && Array.isArray(parsed.records)
            ? parsed.records
            : [];
      const batchKeys = new Set<string>();
      const importedCandidates = records
        .filter(isLeadLike)
        .map((record, index) => {
          const values = leadLikeToFormValues(record);
          const key = buildLeadDedupKey({
            businessName: values.businessName,
            address: values.address,
            location: values.location,
          });

          let dedupeReason: ProspectCandidate["dedupeReason"] = null;
          if (existingKeys.has(key)) {
            dedupeReason = "existing";
          } else if (batchKeys.has(key)) {
            dedupeReason = "batch";
          }

          batchKeys.add(key);

          return {
            id: createProspectId(index),
            hotspotLabel: "JSON importado",
            values,
            dedupeReason,
            origin: "json" as const,
          };
        });

      setCandidates(importedCandidates);
      setSelectedIds(
        importedCandidates
          .filter((item) => item.dedupeReason === null)
          .map((item) => item.id),
      );
      setFeedback(
        `Se importaron ${importedCandidates.length} prospectos desde ${file.name}. ${records.length - importedCandidates.length} registros no tenían formato compatible.`,
      );
    } catch (error) {
      setFeedback(
        `No se pudo importar el JSON: ${error instanceof Error ? error.message : "archivo inválido"}.`,
      );
    }
  }

  function handleAddCandidate(candidateId: string) {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return;

    const key = buildLeadDedupKey({
      businessName: candidate.values.businessName,
      address: candidate.values.address,
      location: candidate.values.location,
    });

    if (existingKeys.has(key) || candidate.dedupeReason !== null) {
      setFeedback(
        "Este prospecto ya existe como lead o está duplicado en el lote.",
      );
      return;
    }

    createLead(candidate.values);
    setCandidates((current) =>
      current.map((item) =>
        item.id === candidateId ? { ...item, dedupeReason: "existing" } : item,
      ),
    );
    setSelectedIds((current) => current.filter((id) => id !== candidateId));
    setFeedback(`Se guardó ${candidate.values.businessName} como lead.`);
  }

  function handleAddSelected() {
    const selectedCandidates = candidates.filter((candidate) =>
      selectedIds.includes(candidate.id),
    );
    const seenKeys = new Set(existingKeys);
    const selectedLeads: Lead[] = [];
    let singleLeadValues: LeadFormValues | null = null;

    for (const candidate of selectedCandidates) {
      const key = buildLeadDedupKey({
        businessName: candidate.values.businessName,
        address: candidate.values.address,
        location: candidate.values.location,
      });

      if (seenKeys.has(key)) {
        continue;
      }

      seenKeys.add(key);
      if (!singleLeadValues) {
        singleLeadValues = candidate.values;
      }
      selectedLeads.push(materializeLead(candidate.values));
    }

    if (selectedLeads.length === 0) {
      setFeedback(
        "No hay candidatos nuevos para agregar (todos estaban duplicados).",
      );
      return;
    }

    if (selectedLeads.length === 1 && singleLeadValues) {
      createLead(singleLeadValues);
      setFeedback("Se agregó 1 lead nuevo.");
    } else {
      replaceLeads([...selectedLeads, ...leads]);
      setFeedback(`Se agregaron ${selectedLeads.length} leads nuevos.`);
    }

    setCandidates([]);
    setSelectedIds([]);
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Prospección externa
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Buscá con el mock, importá JSON generado por prospect:run, revisá
          candidatos y guardalos en el pipeline local.
        </p>
      </header>


      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Jobs registrados</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Ejecutá solamente jobs allowlisted por configuración interna. La API recibe jobId, no comandos arbitrarios.
          </p>
          {jobListError ? <p className="mt-2 text-sm text-red-600">{jobListError}</p> : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => {
            const run = jobRuns[job.id] ?? { status: "idle" as const };
            const isRunning = run.status === "running";
            const isOsmOverpass = job.sourceType === "osm-overpass" || job.sources.some((source) => (source.id ?? source.type) === "osm-overpass");
            const badges = jobBadges(job);
            const realZeroResults = run.status === "success" && run.summary && isRealJob(job) && run.summary.exported === 0;
            return (
              <article key={job.id} className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{job.label}</h3>
                    <div className="flex flex-wrap gap-1">
                      {badges.map((badge) => (
                        <span key={badge} className="rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">{badge}</span>
                      ))}
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">{job.description}</p>
                    <p className="text-xs text-zinc-500">
                      {job.city ?? "Sin ciudad"}, {job.country ?? "sin país"} · Categorías: {job.categories.join(", ")} · Tipo: {job.sourceType} · Fuentes: {job.sources.map((source) => source.id ?? source.type ?? source.input ?? "local").join(", ")} · Límite: {job.limit} · Mín. prioridad: {job.minPriority}
                    </p>
                    {isOsmOverpass ? (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                        Fuente real: OSM Overpass. Se ejecuta sólo con acción explícita, por bbox allowlisted y límite bajo/moderado; la cobertura comunitaria puede estar incompleta (teléfono/web/dirección/rubro).
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => handleRunRegisteredJob(job.id)}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    {isRunning ? "Ejecutando…" : "Ejecutar job"}
                  </button>
                </div>
                {run.status === "success" && run.summary ? (
                  <div className="mt-3 rounded-md bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                    <p>Leídos: {run.summary.totalRecordsRead ?? run.summary.recordsRead}. Normalizados: {run.summary.totalNormalized ?? run.summary.normalized}. Duplicados: {run.summary.totalDuplicates ?? run.summary.duplicateCount}. Exportados: {run.summary.totalExported ?? run.summary.exported}. Descartados: {run.summary.discarded}.</p>
                    <p>A/B/C/D: {run.summary.priorityCounts.A}/{run.summary.priorityCounts.B}/{run.summary.priorityCounts.C}/{run.summary.priorityCounts.D}</p>
                    {run.summary.sourcesUsed?.length ? <p>Fuentes con datos: {run.summary.sourcesUsed.join(", ")}</p> : null}
                    <p className="break-all">JSON generado: {run.summary.jsonPath}</p>
                    <p className="break-all">CSV revisión: {run.summary.csvPath}</p>
                    {run.summary.runSummaryPath ? <p className="break-all">Run summary auditable: {run.summary.runSummaryPath}</p> : null}
                    {realZeroResults ? (
                      <p className="mt-2 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-50">
                        Warning operacional: este job real exportó 0 leads. Revisá source summaries, warnings/errors y run-summary.json antes de asumir que no hay negocios.
                      </p>
                    ) : null}
                    {run.summary.sources?.length ? (
                      <div className="mt-2 overflow-x-auto rounded border border-emerald-200 bg-white/60 dark:border-emerald-800 dark:bg-emerald-950/50">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-emerald-200 dark:border-emerald-800">
                              <th className="px-2 py-1">Fuente</th>
                              <th className="px-2 py-1">Status</th>
                              <th className="px-2 py-1">Leídos</th>
                              <th className="px-2 py-1">Aceptados</th>
                              <th className="px-2 py-1">Rechazados</th>
                              <th className="px-2 py-1">Duración</th>
                              <th className="px-2 py-1">Avisos/errores</th>
                            </tr>
                          </thead>
                          <tbody>
                            {run.summary.sources.map((source) => (
                              <tr key={`${source.sourceId}-${source.sourceLabel}`} className="border-b border-emerald-100 last:border-0 dark:border-emerald-900">
                                <td className="px-2 py-1">{source.sourceLabel} <span className="text-emerald-700 dark:text-emerald-300">({source.sourceId})</span></td>
                                <td className="px-2 py-1">{source.status ?? "—"}</td>
                                <td className="px-2 py-1">{source.recordsRead}</td>
                                <td className="px-2 py-1">{source.recordsAccepted}</td>
                                <td className="px-2 py-1">{source.recordsRejected}</td>
                                <td className="px-2 py-1">{source.durationMs} ms</td>
                                <td className="px-2 py-1">
                                  {[...source.warnings, ...source.errors].length ? [...source.warnings, ...source.errors].join(" · ") : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {run.summary.warnings?.length ? <p className="mt-2">Warnings: {run.summary.warnings.join(" · ")}</p> : null}
                    {run.summary.errors?.length ? <p className="mt-2 text-amber-700 dark:text-amber-200">Errores parciales: {run.summary.errors.join(" · ")}</p> : null}
                    <button type="button" onClick={() => importJobRunResults(job.id)} className="mt-2 rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium">
                      Importar resultados a revisión
                    </button>
                  </div>
                ) : null}
                {run.status === "error" ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{run.error}</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold">
          Estado por hotspot habilitado
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-2 py-2">Hotspot</th>
                <th className="px-2 py-2">Prioridad comercial</th>
                <th className="px-2 py-2">Última prospección</th>
              </tr>
            </thead>
            <tbody>
              {enabledHotspots.map((hotspot) => (
                <tr
                  key={hotspot.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                >
                  <td className="px-2 py-2">{hotspot.label}</td>
                  <td className="px-2 py-2">{hotspot.commercialPriority}</td>
                  <td className="px-2 py-2">
                    {formatLastRun(hotspotRuns[hotspot.id]?.lastRunAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form
        onSubmit={handleSearch}
        className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mb-3">
          <label className="space-y-1 text-sm">
            <span>Punto estratégico</span>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.strategicPointId}
              onChange={(event) =>
                handleStrategicPointChange(event.target.value)
              }
            >
              <option value={MANUAL_STRATEGIC_POINT_ID}>Manual</option>
              {enabledHotspots.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.label} (prioridad {point.commercialPriority})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span>Lat *</span>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.lat}
              onChange={(event) => updateField("lat", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Lng *</span>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.lng}
              onChange={(event) => updateField("lng", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Radio (m) *</span>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.radio}
              onChange={(event) => updateField("radio", event.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Rubro *</span>
            <input
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.rubro}
              onChange={(event) => updateField("rubro", event.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Buscar candidatos
          </button>
          <button
            type="button"
            onClick={handleSuggestedRun}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Corrida sugerida
          </button>
          <button
            type="button"
            disabled={sourceScout.status === "running"}
            onClick={handleAiSourceScout}
            className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-950"
          >
            {sourceScout.status === "running" ? "Buscando fuentes…" : "Buscar fuentes públicas con IA"}
          </button>
          <Link
            href="/leads"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Volver a leads
          </Link>
        </div>
      </form>

      <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-blue-950 dark:text-blue-100">AI Source Scout opcional</h2>
          <p className="text-sm text-blue-900 dark:text-blue-200">
            Usa IA con web search para sugerir fuentes públicas auditables por rubro/zona. No genera leads, no extrae datos automáticamente y puede consumir costo de API.
          </p>
          {sourceScout.costWarning ? <p className="text-xs text-blue-800 dark:text-blue-300">{sourceScout.costWarning}</p> : null}
          {sourceScout.guardrails?.length ? (
            <ul className="list-disc pl-5 text-xs text-blue-800 dark:text-blue-300">
              {sourceScout.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
            </ul>
          ) : null}
          {sourceScout.status === "error" ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {sourceScout.error}
            </p>
          ) : null}
        </div>
        {sourceScout.sources.length > 0 ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {sourceScout.sources.map((source) => (
              <article key={`${source.sourceName}-${source.sourceUrl}`} className="rounded-md border border-blue-200 bg-white p-3 text-sm dark:border-blue-900 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{source.sourceName}</h3>
                    <a className="break-all text-blue-700 hover:underline dark:text-blue-300" href={source.sourceUrl} target="_blank" rel="noreferrer">
                      {source.sourceUrl}
                    </a>
                  </div>
                  <button type="button" onClick={() => copySourceText(source)} className="rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:text-blue-200">
                    Copiar URL/notas
                  </button>
                </div>
                <dl className="mt-2 grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                  <div><dt className="inline font-semibold">Tipo:</dt> <dd className="inline">{source.sourceType}</dd></div>
                  <div><dt className="inline font-semibold">Datos esperados:</dt> <dd className="inline">{source.expectedData.join(", ") || "Sin detalle"}</dd></div>
                  <div><dt className="inline font-semibold">Confianza:</dt> <dd className="inline">{source.trustLevel}</dd></div>
                  <div><dt className="inline font-semibold">Dificultad:</dt> <dd className="inline">{source.extractionDifficulty}</dd></div>
                  <div><dt className="inline font-semibold">Notas:</dt> <dd className="inline">{source.notes}</dd></div>
                </dl>
                <div className="mt-2 text-xs">
                  <span className="font-semibold">Evidencia: </span>
                  {source.evidenceUrls.map((url, index) => (
                    <a key={url} className="break-all text-blue-700 hover:underline dark:text-blue-300" href={url} target="_blank" rel="noreferrer">
                      {index > 0 ? ", " : ""}{url}
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Importar resultados reales
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              El navegador no puede leer directamente el filesystem del runner.
              Cargá manualmente el archivo{" "}
              <code>lead-radar-prospects.json</code> generado por{" "}
              <code>npm run prospect:run</code>.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">
            Importar JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportJson}
            />
          </label>
        </div>
      </section>

      {feedback ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {feedback}
        </p>
      ) : null}

      {candidates.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-2 py-2">Sel.</th>
                  <th className="px-2 py-2">Hotspot</th>
                  <th className="px-2 py-2">Negocio</th>
                  <th className="px-2 py-2">Rubro</th>
                  <th className="px-2 py-2">Ubicación</th>
                  <th className="px-2 py-2">Dirección</th>
                  <th className="px-2 py-2">Contacto</th>
                  <th className="px-2 py-2">Website</th>
                  <th className="px-2 py-2">Priority</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Diagnóstico</th>
                  <th className="px-2 py-2">Acción</th>
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const leadForScore = materializeLead(candidate.values);
                  const score = scoreLead(leadForScore);
                  const contact = [
                    candidate.values.phone,
                    candidate.values.whatsapp,
                    candidate.values.instagram,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const priority = candidate.values.priority ?? score.priority;

                  return (
                    <tr
                      key={candidate.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                    >
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(candidate.id)}
                          disabled={candidate.dedupeReason !== null}
                          onChange={(event) =>
                            toggleSelection(candidate.id, event.target.checked)
                          }
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        {candidate.hotspotLabel ??
                          (candidate.origin === "mock" ? "Mock" : "JSON")}
                      </td>
                      <td className="px-2 py-2 align-top font-medium">
                        {candidate.values.businessName}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {candidate.values.category}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {candidate.values.location}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {candidate.values.address ?? "-"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {contact || "Sin contacto público"}
                      </td>
                      <td className="px-2 py-2 align-top">
                        {candidate.values.websiteUrl ? (
                          <a
                            className="text-blue-600 hover:underline"
                            href={candidate.values.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Detectado
                          </a>
                        ) : (
                          "Sin website"
                        )}
                      </td>
                      <td className="px-2 py-2 align-top font-semibold">
                        {priority}
                      </td>
                      <td className="px-2 py-2 align-top">{score.total}/100</td>
                      <td className="min-w-80 px-2 py-2 align-top text-xs text-zinc-600 dark:text-zinc-300">
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold">Score:</span>{" "}
                            {(candidate.values.scoreReasons?.length
                              ? candidate.values.scoreReasons
                              : [score.summary]
                            ).join(" | ")}
                          </div>
                          <div>
                            <span className="font-semibold">Brecha:</span>{" "}
                            {(candidate.values.gapSignals?.length
                              ? candidate.values.gapSignals
                              : [
                                  candidate.values.problemObservation ??
                                    "Sin señales específicas",
                                ]
                            ).join(" | ")}
                          </div>
                          <div>
                            <span className="font-semibold">Ángulo:</span>{" "}
                            {candidate.values.salesAngle ??
                              candidate.values.notes ??
                              "Revisar manualmente antes de contactar."}
                          </div>
                          <div>
                            <span className="font-semibold">
                              Próxima acción:
                            </span>{" "}
                            {candidate.values.nextAction}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <button
                          type="button"
                          disabled={candidate.dedupeReason !== null}
                          onClick={() => handleAddCandidate(candidate.id)}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
                        >
                          Guardar como lead
                        </button>
                      </td>
                      <td className="px-2 py-2 align-top text-xs">
                        {candidate.dedupeReason === "existing" ? (
                          <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                            Duplicado existente
                          </span>
                        ) : candidate.dedupeReason === "batch" ? (
                          <span className="rounded bg-orange-100 px-2 py-1 text-orange-700">
                            Duplicado en lote
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">
                            Nuevo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={handleAddSelected}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Agregar seleccionados
          </button>
        </div>
      ) : null}
    </section>
  );
}
