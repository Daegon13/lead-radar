"use client";

import { useState } from "react";

import type { Lead, LeadFormValues, LeadOutcomeType } from "@/types/lead";

const OUTCOME_LABELS: Record<LeadOutcomeType, string> = {
  no_answer: "No atendió",
  answered_not_interested: "Atendió, sin interés",
  interested: "Interesado",
  meeting_booked: "Reunión agendada",
  proposal_requested: "Pidió propuesta",
  won: "Ganado",
  lost: "Perdido",
};

const OUTCOME_STATUS: Partial<Record<LeadOutcomeType, Lead["status"]>> = {
  no_answer: "contacted",
  answered_not_interested: "lost",
  interested: "qualified",
  meeting_booked: "qualified",
  proposal_requested: "proposal",
  won: "won",
  lost: "lost",
};

const OUTCOME_OPTIONS = Object.entries(OUTCOME_LABELS) as Array<[LeadOutcomeType, string]>;

type CommercialFeedbackPanelProps = {
  lead: Lead;
  onChange: (values: Partial<LeadFormValues>) => void;
};

function formatCurrency(value?: number): string {
  if (value === undefined) {
    return "Sin estimar";
  }

  return new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(value);
}

function formatEventDate(value: string): string {
  return new Date(value).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommercialFeedbackPanel({ lead, onChange }: CommercialFeedbackPanelProps) {
  const [outcome, setOutcome] = useState<LeadOutcomeType>("no_answer");
  const [note, setNote] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(lead.nextFollowUpAt ?? "");
  const [dealValueEstimate, setDealValueEstimate] = useState(
    lead.dealValueEstimate === undefined ? "" : String(lead.dealValueEstimate),
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const now = new Date().toISOString();
    const newOutcome = {
      id: `outcome-${Math.random().toString(36).slice(2, 10)}`,
      outcome,
      occurredAt: now,
      note: note.trim() || undefined,
    };
    const parsedDealValue = Number(dealValueEstimate);

    onChange({
      contactAttempts: (lead.contactAttempts ?? 0) + 1,
      lastOutcome: newOutcome,
      outcomeHistory: [newOutcome, ...(lead.outcomeHistory ?? [])],
      nextFollowUpAt: nextFollowUpAt || undefined,
      dealValueEstimate: Number.isFinite(parsedDealValue) && dealValueEstimate.trim() ? Math.max(0, parsedDealValue) : undefined,
      status: OUTCOME_STATUS[outcome] ?? lead.status,
      nextAction: nextFollowUpAt ? "follow_up" : lead.nextAction,
      followUpDate: nextFollowUpAt || lead.followUpDate,
      lastContactedAt: now,
    });
    setNote("");
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Feedback comercial
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Registra cada llamada sin alterar el scoring automático todavía.
        </p>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-zinc-500">Intentos</dt><dd>{lead.contactAttempts ?? 0}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-zinc-500">Último resultado</dt><dd>{lead.lastOutcome ? OUTCOME_LABELS[lead.lastOutcome.outcome] : "Sin resultado"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-zinc-500">Próximo follow-up</dt><dd>{lead.nextFollowUpAt || "Sin fecha"}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-zinc-500">Valor estimado</dt><dd>{formatCurrency(lead.dealValueEstimate)}</dd></div>
      </dl>

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <label className="block space-y-1 text-sm">
          <span>Resultado de la llamada</span>
          <select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={outcome} onChange={(event) => setOutcome(event.target.value as LeadOutcomeType)}>
            {OUTCOME_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Nota / objeción</span>
          <textarea className="min-h-16 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Próximo follow-up</span>
          <input type="date" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={nextFollowUpAt} onChange={(event) => setNextFollowUpAt(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Valor estimado del deal (UYU)</span>
          <input type="number" min="0" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={dealValueEstimate} onChange={(event) => setDealValueEstimate(event.target.value)} />
        </label>
        <button className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900" type="submit">
          Registrar resultado
        </button>
      </form>

      {lead.outcomeHistory?.length ? (
        <ol className="space-y-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
          {lead.outcomeHistory.slice(0, 5).map((event) => (
            <li key={event.id} className="rounded-md bg-zinc-50 p-2 dark:bg-zinc-900">
              <p className="font-medium text-zinc-800 dark:text-zinc-100">{OUTCOME_LABELS[event.outcome]}</p>
              <p className="text-zinc-500">{formatEventDate(event.occurredAt)}</p>
              {event.note ? <p className="mt-1 text-zinc-600 dark:text-zinc-300">{event.note}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
