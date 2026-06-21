"use client";

import { useState } from "react";

import { applyOutcomeToLead, OBJECTION_DEFINITIONS, OUTCOME_DEFINITIONS } from "@/lib/outcomes";
import type { Lead, LeadObjectionType, LeadOutcomeType } from "@/types/lead";

const QUICK_OUTCOMES: LeadOutcomeType[] = ["called_no_answer", "answered_send_info", "interested", "meeting_booked", "proposal_requested", "proposal_sent", "won", "lost", "do_not_contact", "wrong_number"];
const ALL_OUTCOMES = Object.keys(OUTCOME_DEFINITIONS) as LeadOutcomeType[];
const ALL_OBJECTIONS = Object.keys(OBJECTION_DEFINITIONS) as LeadObjectionType[];

export function OutcomeLogger({ lead, onLeadChange, compact = false }: { lead: Lead; onLeadChange: (lead: Lead) => void; compact?: boolean }) {
  const [outcome, setOutcome] = useState<LeadOutcomeType>("called_no_answer");
  const [objection, setObjection] = useState<"" | LeadObjectionType>("");
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(lead.nextFollowUpAt ?? "");
  const [estimatedDealValue, setEstimatedDealValue] = useState(lead.estimatedDealValue ?? lead.dealValueEstimate ? String(lead.estimatedDealValue ?? lead.dealValueEstimate) : "");

  function submit(selectedOutcome = outcome) {
    const parsedValue = Number(estimatedDealValue);
    onLeadChange(applyOutcomeToLead(lead, {
      outcome: selectedOutcome,
      objection: objection || undefined,
      note,
      followUpDate: followUpDate || undefined,
      estimatedDealValue: Number.isFinite(parsedValue) && estimatedDealValue.trim() ? Math.max(0, parsedValue) : undefined,
    }));
    setNote("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_OUTCOMES.map((item) => (
          <button key={item} type="button" className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900" onClick={() => submit(item)}>
            {OUTCOME_DEFINITIONS[item].label}
          </button>
        ))}
      </div>
      <div className={compact ? "grid gap-2 md:grid-cols-4" : "space-y-3"}>
        <label className="block space-y-1 text-sm"><span>Outcome</span><select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={outcome} onChange={(event) => setOutcome(event.target.value as LeadOutcomeType)}>{ALL_OUTCOMES.map((item) => <option key={item} value={item}>{OUTCOME_DEFINITIONS[item].label}</option>)}</select></label>
        <label className="block space-y-1 text-sm"><span>Objeción</span><select className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={objection} onChange={(event) => setObjection(event.target.value as "" | LeadObjectionType)}><option value="">Sin objeción</option>{ALL_OBJECTIONS.map((item) => <option key={item} value={item}>{OBJECTION_DEFINITIONS[item].label}</option>)}</select></label>
        <label className="block space-y-1 text-sm"><span>Follow-up</span><input type="date" className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Valor estimado</span><input type="number" min="0" className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={estimatedDealValue} onChange={(event) => setEstimatedDealValue(event.target.value)} /></label>
      </div>
      <label className="block space-y-1 text-sm"><span>Nota</span><textarea className="min-h-16 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: pidió info por WhatsApp, proveedor actual, llamar martes..." /></label>
      <button type="button" onClick={() => submit()} className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">Registrar outcome</button>
    </div>
  );
}
