import { getEffectivePriority, scoreLead } from "@/lib/scoring";
import type { Lead, LeadOutcomeType, Priority } from "@/types/lead";

export const RESPONSE_OUTCOMES = new Set<LeadOutcomeType>([
  "answered_not_interested",
  "interested",
  "meeting_booked",
  "proposal_requested",
  "won",
  "lost",
]);

export const INTEREST_OUTCOMES = new Set<LeadOutcomeType>([
  "interested",
  "meeting_booked",
  "proposal_requested",
  "won",
]);

export type RankedSegment = {
  name: string;
  leads: number;
  attempts: number;
  responses: number;
  interested: number;
  responseRate: number;
  interestRate: number;
};

export type CommercialFeedbackStats = {
  leadsByPriority: Record<Priority, number>;
  totalContactAttempts: number;
  contactedLeads: number;
  responseRate: number;
  interestRate: number;
  bestCategories: RankedSegment[];
  bestLocations: RankedSegment[];
  frequentObjections: Array<{ objection: string; count: number }>;
};

function emptyPriorityCounts(): Record<Priority, number> {
  return { A: 0, B: 0, C: 0, D: 0 };
}

function getOutcomeEvents(lead: Lead) {
  const history = lead.outcomeHistory ?? [];

  if (history.length > 0) {
    return history;
  }

  return lead.lastOutcome ? [lead.lastOutcome] : [];
}

function calculateRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function buildRankedSegments(leads: Lead[], getSegment: (lead: Lead) => string): RankedSegment[] {
  const segments = new Map<string, Omit<RankedSegment, "responseRate" | "interestRate">>();

  for (const lead of leads) {
    const name = getSegment(lead).trim() || "Sin dato";
    const current = segments.get(name) ?? { name, leads: 0, attempts: 0, responses: 0, interested: 0 };
    const outcomeEvents = getOutcomeEvents(lead);
    const attempts = lead.contactAttempts ?? outcomeEvents.length;
    const responses = outcomeEvents.filter((event) => RESPONSE_OUTCOMES.has(event.outcome)).length;
    const interested = outcomeEvents.filter((event) => INTEREST_OUTCOMES.has(event.outcome)).length;

    segments.set(name, {
      ...current,
      leads: current.leads + 1,
      attempts: current.attempts + attempts,
      responses: current.responses + responses,
      interested: current.interested + interested,
    });
  }

  return Array.from(segments.values())
    .map((segment) => ({
      ...segment,
      responseRate: calculateRate(segment.responses, segment.attempts),
      interestRate: calculateRate(segment.interested, segment.attempts),
    }))
    .filter((segment) => segment.attempts > 0)
    .sort((a, b) => b.interestRate - a.interestRate || b.responseRate - a.responseRate || b.attempts - a.attempts)
    .slice(0, 5);
}

function extractFrequentObjections(leads: Lead[]): Array<{ objection: string; count: number }> {
  const counts = new Map<string, number>();
  const patterns = [
    "precio",
    "caro",
    "no tengo tiempo",
    "sin tiempo",
    "ya tengo web",
    "tengo web",
    "no me interesa",
    "no necesita",
    "llamame después",
    "mandame info",
    "presupuesto",
  ];

  for (const lead of leads) {
    const text = [lead.notes, lead.objectionHint, ...(lead.outcomeHistory ?? []).map((event) => event.note)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([objection, count]) => ({ objection, count }))
    .sort((a, b) => b.count - a.count || a.objection.localeCompare(b.objection))
    .slice(0, 6);
}

export function calculateCommercialFeedbackStats(leads: Lead[]): CommercialFeedbackStats {
  const leadsByPriority = emptyPriorityCounts();
  let totalContactAttempts = 0;
  let contactedLeads = 0;
  let responses = 0;
  let interested = 0;

  for (const lead of leads) {
    leadsByPriority[getEffectivePriority(lead, scoreLead(lead))] += 1;

    const outcomeEvents = getOutcomeEvents(lead);
    const attempts = lead.contactAttempts ?? outcomeEvents.length;
    totalContactAttempts += attempts;

    if (attempts > 0) {
      contactedLeads += 1;
    }

    responses += outcomeEvents.filter((event) => RESPONSE_OUTCOMES.has(event.outcome)).length;
    interested += outcomeEvents.filter((event) => INTEREST_OUTCOMES.has(event.outcome)).length;
  }

  return {
    leadsByPriority,
    totalContactAttempts,
    contactedLeads,
    responseRate: calculateRate(responses, totalContactAttempts),
    interestRate: calculateRate(interested, totalContactAttempts),
    bestCategories: buildRankedSegments(leads, (lead) => lead.category),
    bestLocations: buildRankedSegments(leads, (lead) => lead.location),
    frequentObjections: extractFrequentObjections(leads),
  };
}
