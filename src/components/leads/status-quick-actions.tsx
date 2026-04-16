"use client";

import { LEAD_STATUSES, LEAD_STATUS_LABELS, NEXT_ACTIONS, NEXT_ACTION_LABELS } from "@/lib/constants";
import type { LeadFormValues, LeadStatus, NextAction } from "@/types/lead";

type StatusQuickActionsProps = {
  status: LeadStatus;
  nextAction: NextAction;
  followUpDate?: string;
  demoRecommended?: boolean;
  onChange: (values: Partial<LeadFormValues>) => void;
};

export function StatusQuickActions({
  status,
  nextAction,
  followUpDate,
  demoRecommended,
  onChange,
}: StatusQuickActionsProps) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Acciones rápidas
      </h2>

      <label className="space-y-1 text-sm">
        <span>Estado</span>
        <select
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={status}
          onChange={(event) => onChange({ status: event.target.value as LeadStatus })}
        >
          {LEAD_STATUSES.map((item) => (
            <option key={item} value={item}>
              {LEAD_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span>Próxima acción</span>
        <select
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={nextAction}
          onChange={(event) => onChange({ nextAction: event.target.value as NextAction })}
        >
          {NEXT_ACTIONS.map((item) => (
            <option key={item} value={item}>
              {NEXT_ACTION_LABELS[item]}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-sm">
        <span>Fecha de seguimiento</span>
        <input
          type="date"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          value={followUpDate ?? ""}
          onChange={(event) => onChange({ followUpDate: event.target.value || undefined })}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(demoRecommended)}
          onChange={(event) => onChange({ demoRecommended: event.target.checked })}
        />
        Demo recomendada
      </label>
    </section>
  );
}
