"use client";

import Link from "next/link";

import { deservesDemo } from "@/lib/scoring";
import { formatNextAction, formatStatus } from "@/lib/utils";
import type { ScoredLead } from "@/hooks/use-leads";
import type { LeadStatus, Priority } from "@/types/lead";

type LeadTableProps = {
  leads: ScoredLead[];
};

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
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
    case "contacted":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    case "qualified":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
    case "proposal":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "won":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "lost":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  }
}

export function LeadTable({ leads }: LeadTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3">Negocio</th>
            <th className="px-4 py-3">Rubro</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Prioridad</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Próxima acción</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(({ lead, score }) => (
            <tr key={lead.id} className="border-t border-zinc-100 align-top dark:border-zinc-800">
              <td className="px-4 py-3">
                <Link href={`/leads/${lead.id}`} className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
                  {lead.businessName}
                </Link>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.location}</p>
                {deservesDemo(lead, score) ? (
                  <p className="mt-1 inline-flex rounded-full bg-fuchsia-100 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">
                    Merece demo
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{lead.category}</td>
              <td className="px-4 py-3">
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                  {score.total}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityBadgeClass(score.priority)}`}>
                  {score.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClass(lead.status)}`}>
                  {formatStatus(lead.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{formatNextAction(lead.nextAction)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
                  >
                    Ver
                  </Link>
                  <Link
                    href={`/leads/${lead.id}/edit`}
                    className="text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
                  >
                    Editar
                  </Link>
                </div>
              </td>
            </tr>
          ))}

          {leads.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-zinc-500" colSpan={7}>
                No hay leads que coincidan con los filtros.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
