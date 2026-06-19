"use client";

import Link from "next/link";

import { useLeads } from "@/hooks/use-leads";
import { calculateCommercialFeedbackStats } from "@/lib/commercial-feedback";

function MetricCard({ label, value, help }: { label: string; value: string | number; help?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      {help ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{help}</p> : null}
    </div>
  );
}

export default function MetricsPage() {
  const { leads, isLoaded } = useLeads();
  const stats = calculateCommercialFeedbackStats(leads);

  if (!isLoaded) {
    return <p className="text-sm text-zinc-500">Cargando métricas...</p>;
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Métricas comerciales</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Feedback loop local-first para ver qué prioridades, rubros y zonas responden mejor.
          </p>
        </div>
        <Link href="/leads" className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
          Volver a leads
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Llamados realizados" value={stats.totalContactAttempts} help={`${stats.contactedLeads} leads con al menos un intento`} />
        <MetricCard label="Tasa de respuesta" value={`${stats.responseRate}%`} help="Respuestas sobre intentos registrados" />
        <MetricCard label="Tasa de interés" value={`${stats.interestRate}%`} help="Interés, reunión, propuesta o ganado" />
        <MetricCard label="Leads cargados" value={leads.length} help="Persistidos en localStorage" />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Leads por prioridad</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          {Object.entries(stats.leadsByPriority).map(([priority, count]) => (
            <div key={priority} className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
              <p className="text-zinc-500">Prioridad {priority}</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{count}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SegmentTable title="Rubros con mejor respuesta" rows={stats.bestCategories} empty="Registrá llamadas para comparar rubros." />
        <SegmentTable title="Zonas con mejor respuesta" rows={stats.bestLocations} empty="Registrá llamadas para comparar zonas." />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Objeciones frecuentes</h2>
        {stats.frequentObjections.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavía no hay objeciones detectables en notas, hints u outcomes.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {stats.frequentObjections.map((item) => (
              <li key={item.objection} className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {item.objection} · {item.count}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function SegmentTable({ title, rows, empty }: { title: string; rows: Array<{ name: string; attempts: number; responseRate: number; interestRate: number }>; empty: string }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr><th className="py-2">Segmento</th><th className="py-2">Intentos</th><th className="py-2">Respuesta</th><th className="py-2">Interés</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.name}><td className="py-2 font-medium">{row.name}</td><td className="py-2">{row.attempts}</td><td className="py-2">{row.responseRate}%</td><td className="py-2">{row.interestRate}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
