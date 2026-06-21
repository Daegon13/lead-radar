import type { Lead, LeadObjectionType, LeadOutcomeEvent, LeadOutcomeType, LeadStatus, NextAction } from "../types/lead";

export type OutcomeDefinition = {
  outcome: LeadOutcomeType;
  label: string;
  description: string;
  countsAsAnswered: boolean;
  countsAsInterest: boolean;
  countsAsCommercialProgress: boolean;
  blocksFutureContact: boolean;
};

export type ObjectionDefinition = { objection: LeadObjectionType; label: string; description: string };

export const OUTCOME_DEFINITIONS: Record<LeadOutcomeType, OutcomeDefinition> = {
  not_contacted: { outcome: "not_contacted", label: "Sin contactar", description: "Lead todavía no trabajado comercialmente.", countsAsAnswered: false, countsAsInterest: false, countsAsCommercialProgress: false, blocksFutureContact: false },
  called_no_answer: { outcome: "called_no_answer", label: "No contestó", description: "Se hizo un intento humano pero nadie respondió.", countsAsAnswered: false, countsAsInterest: false, countsAsCommercialProgress: false, blocksFutureContact: false },
  wrong_number: { outcome: "wrong_number", label: "Número equivocado", description: "El contacto público no corresponde al negocio.", countsAsAnswered: false, countsAsInterest: false, countsAsCommercialProgress: false, blocksFutureContact: true },
  answered_not_interested: { outcome: "answered_not_interested", label: "Respondió sin interés", description: "Hubo conversación pero el negocio no mostró interés.", countsAsAnswered: true, countsAsInterest: false, countsAsCommercialProgress: false, blocksFutureContact: false },
  answered_send_info: { outcome: "answered_send_info", label: "Pidió info", description: "Respondió y pidió recibir más información.", countsAsAnswered: true, countsAsInterest: true, countsAsCommercialProgress: false, blocksFutureContact: false },
  interested: { outcome: "interested", label: "Interesado", description: "Mostró interés explícito en resolver la brecha o escuchar propuesta.", countsAsAnswered: true, countsAsInterest: true, countsAsCommercialProgress: true, blocksFutureContact: false },
  meeting_booked: { outcome: "meeting_booked", label: "Reunión agendada", description: "Se coordinó reunión o llamada de diagnóstico.", countsAsAnswered: true, countsAsInterest: true, countsAsCommercialProgress: true, blocksFutureContact: false },
  proposal_requested: { outcome: "proposal_requested", label: "Propuesta solicitada", description: "Pidió cotización o propuesta formal.", countsAsAnswered: true, countsAsInterest: true, countsAsCommercialProgress: true, blocksFutureContact: false },
  proposal_sent: { outcome: "proposal_sent", label: "Propuesta enviada", description: "La propuesta fue enviada manualmente.", countsAsAnswered: true, countsAsInterest: true, countsAsCommercialProgress: true, blocksFutureContact: false },
  won: { outcome: "won", label: "Ganado", description: "El lead convirtió en cliente.", countsAsAnswered: true, countsAsInterest: true, countsAsCommercialProgress: true, blocksFutureContact: false },
  lost: { outcome: "lost", label: "Perdido", description: "Oportunidad cerrada como perdida.", countsAsAnswered: true, countsAsInterest: false, countsAsCommercialProgress: false, blocksFutureContact: false },
  do_not_contact: { outcome: "do_not_contact", label: "No contactar", description: "Pidió no ser contactado o debe bloquearse por compliance.", countsAsAnswered: true, countsAsInterest: false, countsAsCommercialProgress: false, blocksFutureContact: true },
};

export const OBJECTION_DEFINITIONS: Record<LeadObjectionType, ObjectionDefinition> = {
  already_has_website: { objection: "already_has_website", label: "Ya tiene web", description: "Considera que su sitio actual es suficiente." },
  already_has_provider: { objection: "already_has_provider", label: "Ya tiene proveedor", description: "Trabaja con agencia, freelancer o proveedor interno." },
  uses_instagram_only: { objection: "uses_instagram_only", label: "Usa solo Instagram", description: "Prefiere resolver presencia digital solo con redes sociales." },
  no_budget: { objection: "no_budget", label: "Sin presupuesto", description: "No dispone de presupuesto o no quiere invertir ahora." },
  not_priority: { objection: "not_priority", label: "No es prioridad", description: "Reconoce el tema pero no lo prioriza." },
  send_info: { objection: "send_info", label: "Mandar info", description: "Pidió información antes de decidir." },
  call_later: { objection: "call_later", label: "Llamar después", description: "Solicitó retomar en otro momento." },
  not_decision_maker: { objection: "not_decision_maker", label: "No decide", description: "La persona contactada no toma la decisión." },
  bad_timing: { objection: "bad_timing", label: "Mal momento", description: "Hay interés potencial pero timing desfavorable." },
  wrong_business: { objection: "wrong_business", label: "Negocio equivocado", description: "El contacto o registro no corresponde al negocio buscado." },
  unknown: { objection: "unknown", label: "Desconocida", description: "Objeción no clasificada todavía." },
};

const OUTCOME_STATUS: Record<LeadOutcomeType, { status?: LeadStatus; nextAction?: NextAction; defaultFollowUpDays?: number }> = {
  not_contacted: {},
  called_no_answer: { status: "contacted", nextAction: "follow_up", defaultFollowUpDays: 2 },
  wrong_number: { status: "lost", nextAction: "disqualify" },
  answered_not_interested: { status: "lost", nextAction: "disqualify" },
  answered_send_info: { status: "contacted", nextAction: "follow_up", defaultFollowUpDays: 3 },
  interested: { status: "qualified", nextAction: "follow_up", defaultFollowUpDays: 2 },
  meeting_booked: { status: "qualified", nextAction: "follow_up", defaultFollowUpDays: 1 },
  proposal_requested: { status: "proposal", nextAction: "follow_up", defaultFollowUpDays: 2 },
  proposal_sent: { status: "proposal", nextAction: "follow_up", defaultFollowUpDays: 5 },
  won: { status: "won", nextAction: "follow_up" },
  lost: { status: "lost", nextAction: "disqualify" },
  do_not_contact: { status: "lost", nextAction: "disqualify" },
};

export function isValidOutcome(value: unknown): value is LeadOutcomeType { return typeof value === "string" && value in OUTCOME_DEFINITIONS; }
export function isValidObjection(value: unknown): value is LeadObjectionType { return typeof value === "string" && value in OBJECTION_DEFINITIONS; }
export function getOutcomeEvents(lead: Lead): LeadOutcomeEvent[] { return lead.outcomeHistory?.length ? lead.outcomeHistory : lead.lastOutcome ? [lead.lastOutcome] : []; }
export function outcomeCountsAsAttempt(outcome: LeadOutcomeType): boolean { return outcome !== "not_contacted"; }
export function outcomeCountsAsAnswered(outcome: LeadOutcomeType): boolean { return OUTCOME_DEFINITIONS[outcome].countsAsAnswered; }
export function outcomeCountsAsInterest(outcome: LeadOutcomeType): boolean { return OUTCOME_DEFINITIONS[outcome].countsAsInterest; }
export function outcomeCountsAsProgress(outcome: LeadOutcomeType): boolean { return OUTCOME_DEFINITIONS[outcome].countsAsCommercialProgress; }

function addDays(date: Date, days: number): string { const next = new Date(date); next.setDate(next.getDate() + days); return next.toISOString().slice(0, 10); }

export function applyOutcomeToLead(lead: Lead, input: { outcome: LeadOutcomeType; objection?: LeadObjectionType; note?: string; followUpDate?: string; estimatedDealValue?: number; occurredAt?: string }): Lead {
  const now = input.occurredAt ?? new Date().toISOString();
  const state = OUTCOME_STATUS[input.outcome];
  const note = input.note?.trim();
  const event: LeadOutcomeEvent = { id: `outcome-${Math.random().toString(36).slice(2, 10)}`, outcome: input.outcome, occurredAt: now, note: note || undefined, objection: input.objection };
  const followUpDate = input.followUpDate || (state.defaultFollowUpDays ? addDays(new Date(now), state.defaultFollowUpDays) : undefined);
  const nextAttempts = (lead.contactAttempts ?? getOutcomeEvents(lead).filter((item) => outcomeCountsAsAttempt(item.outcome)).length) + (outcomeCountsAsAttempt(input.outcome) ? 1 : 0);
  const notesLine = note ? `[${new Date(now).toLocaleString()}] ${OUTCOME_DEFINITIONS[input.outcome].label}${input.objection ? ` (${OBJECTION_DEFINITIONS[input.objection].label})` : ""}: ${note}` : undefined;
  return {
    ...lead,
    status: state.status ?? lead.status,
    nextAction: state.nextAction ?? lead.nextAction,
    notes: notesLine ? [lead.notes, notesLine].filter(Boolean).join("\n") : lead.notes,
    contactAttempts: nextAttempts,
    lastContactedAt: outcomeCountsAsAttempt(input.outcome) ? now : lead.lastContactedAt,
    lastOutcome: event,
    outcomeHistory: [event, ...getOutcomeEvents(lead)],
    lastObjection: input.objection ?? lead.lastObjection,
    objectionHistory: input.objection ? [{ id: `objection-${Math.random().toString(36).slice(2, 10)}`, objection: input.objection, occurredAt: now, note: note || undefined }, ...(lead.objectionHistory ?? [])] : lead.objectionHistory,
    nextFollowUpAt: followUpDate ?? lead.nextFollowUpAt,
    followUpDate: followUpDate ?? lead.followUpDate,
    estimatedDealValue: input.estimatedDealValue ?? lead.estimatedDealValue,
    dealValueEstimate: input.estimatedDealValue ?? lead.dealValueEstimate,
    commercialTemperature: input.outcome === "won" || input.outcome === "proposal_sent" || input.outcome === "proposal_requested" ? "hot" : input.outcome === "interested" || input.outcome === "meeting_booked" || input.outcome === "answered_send_info" ? "warm" : input.outcome === "do_not_contact" || input.outcome === "wrong_number" || input.outcome === "lost" ? "blocked" : lead.commercialTemperature ?? "cold",
    dealStage: input.outcome,
    optOut: input.outcome === "do_not_contact" ? true : lead.optOut,
    updatedAt: now,
  };
}
