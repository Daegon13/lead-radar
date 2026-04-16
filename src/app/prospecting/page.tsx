"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { useLeads } from "@/hooks/use-leads";
import { ENABLE_EXTERNAL_PROSPECTING_FLOW } from "@/lib/constants";
import {
  DEFAULT_PROSPECTING_EXECUTION_POLICY,
  type HotspotRunMetadataMap,
  loadHotspotRunMetadata,
  planProspectingRun,
  registerHotspotRun,
  registerHotspotRuns,
} from "@/lib/prospecting-execution-policy";
import {
  getEnabledProspectingHotspots,
  getProspectingFormDefaults,
} from "@/lib/prospecting-hotspots";
import {
  buildLeadDedupKey,
  type ExternalProspectResult,
  mapExternalResultToLeadFormValues,
} from "@/lib/prospecting-adapter";
import type { Lead, LeadFormValues } from "@/types/lead";

type SearchFormState = {
  lat: string;
  lng: string;
  radio: string;
  rubro: string;
  hotspotId: string;
};

type ProspectCandidate = {
  id: string;
  values: LeadFormValues;
  dedupeReason: "existing" | "batch" | null;
};

function createProspectId(index: number): string {
  return `prospect-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLeadId(): string {
  return `lead-${Math.random().toString(36).slice(2, 10)}`;
}

function loadInitialHotspotRunMetadata(): HotspotRunMetadataMap {
  if (typeof window === "undefined") {
    return {};
  }

  return loadHotspotRunMetadata();
}

function formatHotspotLastRun(value?: string): string {
  if (!value) {
    return "Nunca";
  }

  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) {
    return "Sin fecha válida";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(asDate);
}

function buildMockExternalResults(form: SearchFormState): ExternalProspectResult[] {
  const areaLabel = `${form.rubro.trim() || "Negocio"} (${form.lat.trim()}, ${form.lng.trim()})`;

  return [
    {
      nombre: `${areaLabel} Norte`,
      tipo: form.rubro.trim() || "Comercio",
      vicinity: "Zona Norte",
      address: "Av. Principal 123",
      rating: 4.4,
      user_ratings_total: 82,
      website: "https://ejemplo-negocio-norte.com",
      phone: "+54 11 4000-1111",
    },
    {
      nombre: `${areaLabel} Centro`,
      tipo: form.rubro.trim() || "Comercio",
      vicinity: "Centro",
      address: "Calle 9 de Julio 550",
      rating: 3.9,
      user_ratings_total: 27,
      phone: "+54 11 4555-2020",
    },
    {
      nombre: `${areaLabel} Sur`,
      tipo: form.rubro.trim() || "Comercio",
      vicinity: "Zona Sur",
      address: "Mitre 920",
      rating: null,
      user_ratings_total: 0,
    },
  ];
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

export default function ProspectingPage() {
  const { leads, createLead, replaceLeads } = useLeads();
  const [form, setForm] = useState<SearchFormState>({ lat: "", lng: "", radio: "", rubro: "", hotspotId: "" });
  const [candidates, setCandidates] = useState<ProspectCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hotspotRunMetadata, setHotspotRunMetadata] = useState<HotspotRunMetadataMap>(loadInitialHotspotRunMetadata);

  const existingKeys = useMemo(() => new Set(leads.map((lead) => buildLeadDedupKey(lead))), [leads]);
  const enabledHotspots = useMemo(() => getEnabledProspectingHotspots(), []);

  if (!ENABLE_EXTERNAL_PROSPECTING_FLOW) {
    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Prospección externa</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Este flujo está deshabilitado por política del proyecto.
          </p>
        </header>
        <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Volver a leads
        </Link>
      </section>
    );
  }

  function updateField(field: keyof SearchFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function mapExternalResultsToCandidates(
    externalResults: ExternalProspectResult[],
    knownKeys: Set<string>,
    batchKeys: Set<string>,
    idPrefix: string,
  ): ProspectCandidate[] {
    return externalResults.map((external, index) => {
      const values = mapExternalResultToLeadFormValues(external);
      const key = buildLeadDedupKey({
        businessName: values.businessName,
        address: values.address,
        location: values.location,
      });

      let dedupeReason: ProspectCandidate["dedupeReason"] = null;
      if (knownKeys.has(key)) {
        dedupeReason = "existing";
      } else if (batchKeys.has(key)) {
        dedupeReason = "batch";
      }

      batchKeys.add(key);

      return {
        id: `${idPrefix}-${createProspectId(index)}`,
        values,
        dedupeReason,
      };
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const radius = Number(form.radio);

    if (!form.rubro.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
      setFeedback("Completá lat/lng/radio numéricos y rubro para buscar prospectos.");
      return;
    }

    const externalResults = buildMockExternalResults(form).slice(
      0,
      DEFAULT_PROSPECTING_EXECUTION_POLICY.maxCandidatesPerZone,
    );
    const batchKeys = new Set<string>();
    const mappedCandidates = mapExternalResultsToCandidates(externalResults, existingKeys, batchKeys, "manual");

    setCandidates(mappedCandidates);
    setSelectedIds(mappedCandidates.filter((item) => item.dedupeReason === null).map((item) => item.id));
    setFeedback(`Se encontraron ${mappedCandidates.length} candidatos simulados para revisar.`);

    if (form.hotspotId) {
      const nextMetadata = registerHotspotRun(form.hotspotId);
      setHotspotRunMetadata(nextMetadata);
    }
  }

  function handleRunHotspotPolicy() {
    const runPlan = planProspectingRun(enabledHotspots, hotspotRunMetadata, DEFAULT_PROSPECTING_EXECUTION_POLICY);

    if (runPlan.hotspots.length === 0) {
      setFeedback("No hay zonas habilitadas para correr ahora (revisá el cooldown por hotspot).");
      return;
    }

    const allCandidates: ProspectCandidate[] = [];
    const batchKeys = new Set<string>();
    let remainingCandidates = DEFAULT_PROSPECTING_EXECUTION_POLICY.maxCandidatesPerRun;

    for (const hotspot of runPlan.hotspots) {
      if (remainingCandidates <= 0) {
        break;
      }

      const defaults = getProspectingFormDefaults(hotspot.id);
      const hotspotForm: SearchFormState = { ...defaults, hotspotId: hotspot.id };
      const capByZone = Math.min(
        DEFAULT_PROSPECTING_EXECUTION_POLICY.maxCandidatesPerZone,
        remainingCandidates,
      );
      const mapped = mapExternalResultsToCandidates(
        buildMockExternalResults(hotspotForm).slice(0, capByZone),
        existingKeys,
        batchKeys,
        hotspot.id,
      );

      remainingCandidates -= mapped.length;
      allCandidates.push(...mapped);
    }

    const nowIso = new Date().toISOString();
    const nextMetadata = registerHotspotRuns(runPlan.hotspots.map((item) => item.id), nowIso);

    setHotspotRunMetadata(nextMetadata);
    setCandidates(allCandidates);
    setSelectedIds(allCandidates.filter((item) => item.dedupeReason === null).map((item) => item.id));
    setFeedback(
      `Corrida aplicada en ${runPlan.hotspots.length} zonas (límite ${DEFAULT_PROSPECTING_EXECUTION_POLICY.maxZonesPerRun}) con ${allCandidates.length} candidatos.`,
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

  function handleAddSelected() {
    const selectedCandidates = candidates.filter((candidate) => selectedIds.includes(candidate.id));
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
      setFeedback("No hay candidatos nuevos para agregar (todos estaban duplicados).");
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
        <h1 className="text-2xl font-semibold tracking-tight">Prospección externa</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Buscá por geolocalización y rubro, revisá candidatos y agregá los seleccionados al pipeline local.
        </p>
      </header>

      <form onSubmit={handleSearch} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span>Zona / hotspot</span>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.hotspotId}
              onChange={(event) => {
                const hotspotId = event.target.value;
                const defaults = getProspectingFormDefaults(hotspotId);
                setForm((current) => ({
                  ...current,
                  ...defaults,
                  hotspotId,
                }));
              }}
            >
              <option value="">Manual (sin zona predefinida)</option>
              {enabledHotspots.map((hotspot) => (
                <option key={hotspot.id} value={hotspot.id}>
                  P{hotspot.commercialPriority} · {hotspot.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Lat *</span>
            <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.lat} onChange={(event) => updateField("lat", event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Lng *</span>
            <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.lng} onChange={(event) => updateField("lng", event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Radio (m) *</span>
            <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.radio} onChange={(event) => updateField("radio", event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Rubro *</span>
            <input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={form.rubro} onChange={(event) => updateField("rubro", event.target.value)} />
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
            onClick={handleRunHotspotPolicy}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Ejecutar corrida sugerida
          </button>
          <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
            Volver a leads
          </Link>
        </div>
      </form>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Zonas habilitadas y última prospección
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-2 py-2">Prioridad</th>
                <th className="px-2 py-2">Zona</th>
                <th className="px-2 py-2">Sugerido</th>
                <th className="px-2 py-2">Última prospección</th>
              </tr>
            </thead>
            <tbody>
              {enabledHotspots
                .slice()
                .sort((a, b) => a.commercialPriority - b.commercialPriority)
                .map((hotspot) => (
                  <tr key={hotspot.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-2 py-2 align-top">P{hotspot.commercialPriority}</td>
                    <td className="px-2 py-2 align-top">{hotspot.label}</td>
                    <td className="px-2 py-2 align-top">{hotspot.rubroSugerido ?? "-"}</td>
                    <td className="px-2 py-2 align-top">
                      {formatHotspotLastRun(hotspotRunMetadata[hotspot.id]?.lastRunAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
                  <th className="px-2 py-2">Negocio</th>
                  <th className="px-2 py-2">Rubro</th>
                  <th className="px-2 py-2">Ubicación</th>
                  <th className="px-2 py-2">Dirección</th>
                  <th className="px-2 py-2">Rating</th>
                  <th className="px-2 py-2">Reseñas</th>
                  <th className="px-2 py-2">Contacto</th>
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(candidate.id)}
                        disabled={candidate.dedupeReason !== null}
                        onChange={(event) => toggleSelection(candidate.id, event.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">{candidate.values.businessName}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.category}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.location}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.address ?? "-"}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.rating ?? "-"}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.reviewCount}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.websiteUrl ?? candidate.values.phone ?? "-"}</td>
                    <td className="px-2 py-2 align-top text-xs">
                      {candidate.dedupeReason === "existing" ? (
                        <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">Duplicado existente</span>
                      ) : candidate.dedupeReason === "batch" ? (
                        <span className="rounded bg-orange-100 px-2 py-1 text-orange-700">Duplicado en lote</span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Nuevo</span>
                      )}
                    </td>
                  </tr>
                ))}
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
