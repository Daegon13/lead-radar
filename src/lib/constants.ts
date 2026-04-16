import type { LeadStatus, NextAction } from "@/types/lead";

export const APP_NAME = "Lead Radar";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export const NEXT_ACTIONS: NextAction[] = [
  "call_today",
  "dm_or_whatsapp",
  "follow_up",
  "disqualify",
];

export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  call_today: "Llamar hoy",
  dm_or_whatsapp: "Contactar por DM o WhatsApp",
  follow_up: "Guardar para follow-up",
  disqualify: "No priorizar",
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  won: "Ganado",
  lost: "Perdido",
};

export const ENABLE_EXTERNAL_PROSPECTING_FLOW = true;
