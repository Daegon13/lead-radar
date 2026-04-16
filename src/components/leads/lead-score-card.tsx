import { NEXT_ACTION_LABELS } from "@/lib/constants";
import type { LeadScoreResult } from "@/types/lead";

type LeadScoreCardProps = {
  score: LeadScoreResult;
};

function priorityClass(priority: LeadScoreResult["priority"]) {
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

export function LeadScoreCard({ score }: LeadScoreCardProps) {
  const entries = [
    ["Demanda visible", score.breakdown.visibleDemand],
    ["Brecha digital", score.breakdown.digitalGap],
    ["Potencial comercial", score.breakdown.commercialPotential],
    ["Acceso decisor", score.breakdown.decisionMakerAccess],
    ["Urgencia", score.breakdown.urgencySignals],
  ] as const;

  return (
    <aside className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Score automático</p>
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-zinc-100 px-3 py-1.5 text-xl font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            {score.total}
          </span>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${priorityClass(score.priority)}`}>
            Prioridad {score.priority}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Recomendación: {NEXT_ACTION_LABELS[score.recommendedAction]}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">Breakdown resumido</p>
        <ul className="space-y-1 text-zinc-600 dark:text-zinc-300">
          {entries.map(([label, points]) => (
            <li key={label} className="flex items-center justify-between gap-2">
              <span>{label}</span>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                {points}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
