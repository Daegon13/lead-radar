"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { useLeads } from "@/hooks/use-leads";
import { ENABLE_EXTERNAL_PROSPECTING_FLOW } from "@/lib/constants";
import {
  buildLeadDedupKey,
  type ExternalProspectResult,
  mapExternalResultToLeadFormValues,
} from "@/lib/prospecting-adapter";
import type { LeadFormValues } from "@/types/lead";

type SearchFormState = {
  lat: string;
  lng: string;
  radio: string;
  rubro: string;
};

type ProspectCandidate = {
  id: string;
  external: ExternalProspectResult;
  values: LeadFormValues;
  duplicateWithExisting: boolean;
};

function createProspectId(index: number): string {
  return `prospect-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildMockExternalResults(form: SearchFormState): ExternalProspectResult[] {
  const areaLabel = `${form.rubro.trim() || "Negocio"} ${form.lat.trim()},${form.lng.trim()}`;

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

export default function ProspectingPage() {
  const { leads, createLead, replaceLeads } = useLeads();
  const [form, setForm] = useState<SearchFormState>({ lat: "", lng: "", radio: "", rubro: "" });
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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.lat.trim() || !form.lng.trim() || !form.radio.trim() || !form.rubro.trim()) {
      setFeedback("Completá lat, lng, radio y rubro para buscar prospectos.");
      return;
    }

    const externalResults = buildMockExternalResults(form);
    const mappedCandidates = externalResults.map((external, index) => {
      const values = mapExternalResultToLeadFormValues(external);
      const duplicateWithExisting = existingKeys.has(
        buildLeadDedupKey({
          businessName: values.businessName,
          address: values.address,
          location: values.location,
        }),
      );

      return {
        id: createProspectId(index),
        external,
        values,
        duplicateWithExisting,
      };
    });

    setCandidates(mappedCandidates);
    setSelectedIds(mappedCandidates.filter((item) => !item.duplicateWithExisting).map((item) => item.id));
    setFeedback(`Se encontraron ${mappedCandidates.length} candidatos simulados para revisar.`);
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
    const dedupedSelected: ProspectCandidate[] = [];
    const seenKeys = new Set(existingKeys);

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
      dedupedSelected.push(candidate);
    }

    if (dedupedSelected.length === 0) {
      setFeedback("No hay candidatos nuevos para agregar (todos estaban duplicados).");
      return;
    }

    if (dedupedSelected.length === 1) {
      createLead(dedupedSelected[0].values);
      setFeedback("Se agregó 1 lead nuevo.");
    } else {
      const now = new Date().toISOString();
      const newLeads = dedupedSelected.map((candidate) => ({
        ...candidate.values,
        id: `lead-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: now,
        updatedAt: now,
      }));

      replaceLeads([...newLeads, ...leads]);
      setFeedback(`Se agregaron ${newLeads.length} leads nuevos.`);
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
                  <th className="px-2 py-2">Negocio</th>
                  <th className="px-2 py-2">Rubro</th>
                  <th className="px-2 py-2">Ubicación</th>
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
                        disabled={candidate.duplicateWithExisting}
                        onChange={(event) => toggleSelection(candidate.id, event.target.checked)}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">{candidate.values.businessName}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.category}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.location}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.rating ?? "-"}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.reviewCount}</td>
                    <td className="px-2 py-2 align-top">{candidate.values.websiteUrl ?? candidate.values.phone ?? "-"}</td>
                    <td className="px-2 py-2 align-top text-xs">
                      {candidate.duplicateWithExisting ? (
                        <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">Duplicado</span>
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
