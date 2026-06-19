"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  applyCallQueueAction,
  buildCallQueueItem,
  CALL_QUEUE_ACTION_LABELS,
  sortCallQueueItems,
  type CallQueueAction,
  type CallQueueItem,
} from "@/lib/call-queue";
import { AiResearcherControls } from "@/components/leads/ai-researcher-controls";
import { useLeads } from "@/hooks/use-leads";
import { formatNextAction } from "@/lib/utils";
import type { Lead, Priority } from "@/types/lead";

const ACTIONS = Object.keys(CALL_QUEUE_ACTION_LABELS) as CallQueueAction[];

function priorityBadgeClass(priority: Priority): string {
  switch (priority) {
    case "A":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "B":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "C":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "D":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
  }
}

function contactLabel(lead: Lead): string {
  return lead.phone ?? lead.whatsapp ?? lead.instagram ?? "Sin contacto público";
}

function opportunityReason(lead: Lead, fallback: string): string {
  return lead.scoreReasons?.[0] ?? lead.problemObservation ?? lead.salesAngle ?? fallback;
}

function CallQueueCard({ item, note, onNoteChange, onApplyAction }: {
  item: CallQueueItem;
  note: string;
  onNoteChange: (value: string) => void;
  onApplyAction: (action: CallQueueAction) => void;
}) {
  const { lead, score, effectivePriority } = item;

  return (
    <article className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/leads/${lead.id}`} className="text-lg font-semibold text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
              {lead.businessName}
            </Link>
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityBadgeClass(effectivePriority)}`}>
              Prioridad {effectivePriority}
            </span>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              Score {score.total}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{lead.category} · {lead.location}</p>
          <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">Contacto: {contactLabel(lead)}</p>
          {lead.lastContactedAt ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Último contacto: {new Date(lead.lastContactedAt).toLocaleString()}</p>
          ) : null}
        </div>
        <p className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Próxima acción: <span className="font-medium">{formatNextAction(lead.nextAction)}</span>
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Motivo de oportunidad</h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{opportunityReason(lead, score.summary)}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Apertura de llamada</h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{lead.callOpening ?? "Abrir con diagnóstico breve sobre presencia digital y demanda visible."}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Próxima acción</h2>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{formatNextAction(lead.nextAction)}</p>
        </div>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Nota de la llamada</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Ej.: atiende dueño, prefiere WhatsApp, llamar mañana 10:00..."
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => onApplyAction(action)}
          >
            {CALL_QUEUE_ACTION_LABELS[action]}
          </button>
        ))}
      </div>
    </article>
  );
}

export default function CallQueuePage() {
  const { scoredLeads, leads, isLoaded, updateLead, setLeads } = useLeads();
  const [notesByLeadId, setNotesByLeadId] = useState<Record<string, string>>({});

  const items = useMemo(
    () => sortCallQueueItems(scoredLeads.map(({ lead, score }) => buildCallQueueItem(lead, score))),
    [scoredLeads],
  );
  const primaryItems = items.filter((item) => item.isPrimary);
  const secondaryItems = items.filter((item) => !item.isPrimary && !item.lead.optOut);

  function applyAction(lead: Lead, action: CallQueueAction) {
    updateLead(applyCallQueueAction(lead, action, notesByLeadId[lead.id]));
    setNotesByLeadId((current) => ({ ...current, [lead.id]: "" }));
  }

  function applyBatchEnrichment(enrichedLeads: Lead[]) {
    const enrichedById = new Map(enrichedLeads.map((lead) => [lead.id, lead]));
    setLeads((currentLeads) => currentLeads.map((lead) => enrichedById.get(lead.id) ?? lead));
  }

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Call Queue</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Cola diaria local-first: primero aparecen leads A/B con contacto público, score alto y acción pendiente. No automatiza llamadas ni mensajes.
        </p>
      </header>

      {isLoaded ? (
        <AiResearcherControls mode="batch" leads={leads} onLeadsEnriched={applyBatchEnrichment} />
      ) : null}

      {!isLoaded ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">Cargando cola...</div>
      ) : primaryItems.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No hay llamadas prioritarias</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Agregá teléfono, WhatsApp o Instagram a leads A/B para que entren en la cola principal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {primaryItems.map((item) => (
            <CallQueueCard
              key={item.lead.id}
              item={item}
              note={notesByLeadId[item.lead.id] ?? ""}
              onNoteChange={(value) => setNotesByLeadId((current) => ({ ...current, [item.lead.id]: value }))}
              onApplyAction={(action) => applyAction(item.lead, action)}
            />
          ))}
        </div>
      )}

      {secondaryItems.length > 0 ? (
        <details className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">Leads secundarios o sin contacto público ({secondaryItems.length})</summary>
          <div className="mt-3 space-y-2">
            {secondaryItems.map(({ lead, score, effectivePriority, hasPublicContact }) => (
              <div key={lead.id} className="flex flex-col justify-between gap-2 rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900 md:flex-row md:items-center">
                <div>
                  <Link href={`/leads/${lead.id}`} className="font-medium underline-offset-2 hover:underline">{lead.businessName}</Link>
                  <p className="text-zinc-500 dark:text-zinc-400">{lead.category} · Prioridad {effectivePriority} · Score {score.total} · {hasPublicContact ? contactLabel(lead) : "sin contacto público"}</p>
                </div>
                <Link href={`/leads/${lead.id}/edit`} className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300">Completar contacto</Link>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
