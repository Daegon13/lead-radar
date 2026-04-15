import { seedLeads } from "@/data/seed-leads";
import { scoreLead } from "@/lib/scoring";
import { formatNextAction, formatPriority, formatStatus } from "@/lib/utils";

export default function LeadsPage() {
  const leads = seedLeads
    .map((lead) => ({
      lead,
      score: scoreLead(lead),
    }))
    .sort((a, b) => b.score.total - a.score.total);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Vista inicial en memoria para priorizar oportunidades.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Negocio</th>
              <th className="px-4 py-3">Rubro</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Próxima acción</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(({ lead, score }) => (
              <tr key={lead.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{lead.businessName}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{lead.location}</p>
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{lead.category}</td>
                <td className="px-4 py-3">{formatStatus(lead.status)}</td>
                <td className="px-4 py-3 font-medium">{score.total}</td>
                <td className="px-4 py-3">{formatPriority(score.priority)}</td>
                <td className="px-4 py-3">{formatNextAction(score.recommendedAction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
