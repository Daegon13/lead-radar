"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

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
import {
  buildLeadDedupKey,
  type ExternalProspectResult,
  mapExternalResultToLeadFormValues,
} from "@/lib/prospecting-adapter";
import type { Lead, LeadFormValues } from "@/types/lead";

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
};

const MANUAL_STRATEGIC_POINT_ID = "manual";

function createProspectId(index: number): string {
  return `prospect-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLeadId(): string {
  return `lead-${Math.random().toString(36).slice(2, 10)}`;
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
  const [hotspotRuns, setHotspotRuns] = useState<HotspotRunRegistry>(() => loadHotspotRunRegistry());
  const [candidates, setCandidates] = useState<ProspectCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const existingKeys = useMemo(() => new Set(leads.map((lead) => buildLeadDedupKey(lead))), [leads]);


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

  function buildCandidatesForSearch(
    searchForm: SearchFormState,
    options?: {
      maxCandidates?: number;
      hotspot?: ProspectingHotspot;
      startIndex?: number;
      batchKeys?: Set<string>;
    },
  ): ProspectCandidate[] {
    const maxCandidates = options?.maxCandidates;
    const externalResults = buildMockExternalResults(searchForm);
    const limitedResults = typeof maxCandidates === "number" ? externalResults.slice(0, maxCandidates) : externalResults;
    const batchKeys = options?.batchKeys ?? new Set<string>();

    return limitedResults.map((external, index) => {
      const values = mapExternalResultToLeadFormValues(external);
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

    const hotspot = form.strategicPointId !== MANUAL_STRATEGIC_POINT_ID ? getProspectingHotspotById(form.strategicPointId) : undefined;
    const mappedCandidates = buildCandidatesForSearch(form, { hotspot });

    if (hotspot) {
      setHotspotRuns(recordHotspotRun(hotspot.id));
    }

    setCandidates(mappedCandidates);
    setSelectedIds(mappedCandidates.filter((item) => item.dedupeReason === null).map((item) => item.id));
    setFeedback(`Se encontraron ${mappedCandidates.length} candidatos simulados para revisar.`);
  }

  function handleSuggestedRun() {
    const limits = DEFAULT_PROSPECTING_EXECUTION_LIMITS;
    const plan = planSuggestedHotspotRun(enabledHotspots, hotspotRuns, limits);

    if (plan.length === 0) {
      setFeedback("No hay hotspots disponibles para corrida sugerida (todos están en enfriamiento).");
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
      const zoneCandidates = buildCandidatesForSearch(searchForm, {
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
      setFeedback("La corrida sugerida no devolvió candidatos dentro de los límites configurados.");
      return;
    }

    setCandidates(aggregated);
    setSelectedIds(aggregated.filter((item) => item.dedupeReason === null).map((item) => item.id));

    const executedHotspotIds = Array.from(new Set(aggregated.flatMap((item) => (item.hotspotId ? [item.hotspotId] : []))));
    if (executedHotspotIds.length > 0) {
      setHotspotRuns(recordHotspotBatchRun(executedHotspotIds));
    }

    setFeedback(`Corrida sugerida generó ${aggregated.length} candidatos en ${executedHotspotIds.length} zonas.`);
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

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold">Estado por hotspot habilitado</h2>
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
                <tr key={hotspot.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                  <td className="px-2 py-2">{hotspot.label}</td>
                  <td className="px-2 py-2">{hotspot.commercialPriority}</td>
                  <td className="px-2 py-2">{formatLastRun(hotspotRuns[hotspot.id]?.lastRunAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form onSubmit={handleSearch} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3">
          <label className="space-y-1 text-sm">
            <span>Punto estratégico</span>
            <select
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={form.strategicPointId}
              onChange={(event) => handleStrategicPointChange(event.target.value)}
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
            onClick={handleSuggestedRun}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Corrida sugerida
          </button>
          <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
            Volver a leads
          </Link>
        </div>
      </form>

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
                    <td className="px-2 py-2 align-top">{candidate.hotspotLabel ?? "Manual"}</td>
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
