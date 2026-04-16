import { LEAD_STATUS_LABELS, NEXT_ACTION_LABELS } from "@/lib/constants";
import type { LeadStatus, NextAction, Priority } from "@/types/lead";

export function formatPriority(priority: Priority): string {
  return `Prioridad ${priority}`;
}

export function formatStatus(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status];
}

export function formatNextAction(action: NextAction): string {
  return NEXT_ACTION_LABELS[action];
}
