import { getEffectiveNextAction, getEffectivePriority, hasPublicContact } from "@/lib/scoring";
import type { Lead, LeadScoreResult, LeadStatus, NextAction, Priority } from "@/types/lead";

export type CallQueueAction =
  | "called"
  | "no_answer"
  | "asked_info"
  | "interested"
  | "meeting_scheduled"
  | "proposal_sent"
  | "discarded";

export type CallQueueItem = {
  lead: Lead;
  score: LeadScoreResult;
  effectivePriority: Priority;
  isPrimary: boolean;
  hasPublicContact: boolean;
};

export const CALL_QUEUE_ACTION_LABELS: Record<CallQueueAction, string> = {
  called: "Llamado",
  no_answer: "No contestó",
  asked_info: "Pidió info",
  interested: "Interesado",
  meeting_scheduled: "Reunión agendada",
  proposal_sent: "Propuesta enviada",
  discarded: "Descartado",
};

const PRIORITY_RANK: Record<Priority, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

const ACTION_STATE: Record<CallQueueAction, { status: LeadStatus; nextAction: NextAction }> = {
  called: { status: "contacted", nextAction: "follow_up" },
  no_answer: { status: "contacted", nextAction: "follow_up" },
  asked_info: { status: "contacted", nextAction: "follow_up" },
  interested: { status: "qualified", nextAction: "follow_up" },
  meeting_scheduled: { status: "qualified", nextAction: "follow_up" },
  proposal_sent: { status: "proposal", nextAction: "follow_up" },
  discarded: { status: "lost", nextAction: "disqualify" },
};

export function buildCallQueueItem(lead: Lead, score: LeadScoreResult): CallQueueItem {
  const contactable = hasPublicContact(lead);
  const effectivePriority = getEffectivePriority(lead, score);
  return {
    lead,
    score,
    effectivePriority,
    isPrimary: contactable && (effectivePriority === "A" || effectivePriority === "B") && !lead.optOut,
    hasPublicContact: contactable,
  };
}

export function sortCallQueueItems(items: CallQueueItem[]): CallQueueItem[] {
  return [...items].sort((a, b) => {
    const primaryDelta = Number(b.isPrimary) - Number(a.isPrimary);
    if (primaryDelta !== 0) return primaryDelta;

    const priorityDelta = PRIORITY_RANK[a.effectivePriority] - PRIORITY_RANK[b.effectivePriority];
    if (priorityDelta !== 0) return priorityDelta;

    const scoreDelta = b.score.total - a.score.total;
    if (scoreDelta !== 0) return scoreDelta;

    if (a.lead.nextAction !== b.lead.nextAction) {
      if (getEffectiveNextAction(a.lead, a.score) === "call_today") return -1;
      if (getEffectiveNextAction(b.lead, b.score) === "call_today") return 1;
    }

    return a.lead.businessName.localeCompare(b.lead.businessName);
  });
}

export function applyCallQueueAction(lead: Lead, action: CallQueueAction, note?: string): Lead {
  const now = new Date().toISOString();
  const trimmedNote = note?.trim();
  const actionLabel = CALL_QUEUE_ACTION_LABELS[action];
  const noteLine = trimmedNote ? `[${new Date(now).toLocaleString()}] ${actionLabel}: ${trimmedNote}` : undefined;

  return {
    ...lead,
    ...ACTION_STATE[action],
    notes: noteLine ? [lead.notes, noteLine].filter(Boolean).join("\n") : lead.notes,
    lastContactedAt: now,
    updatedAt: now,
  };
}
