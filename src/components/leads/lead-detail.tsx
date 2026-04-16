"use client";

import Link from "next/link";

import { deservesDemo, scoreLead } from "@/lib/scoring";
import { formatNextAction, formatStatus } from "@/lib/utils";
import type { Lead, LeadFormValues } from "@/types/lead";
import { StatusQuickActions } from "@/components/leads/status-quick-actions";

const DIGITAL_QUALITY_LABELS: Record<Lead["digitalPresenceQuality"], string> = {
  none: "Sin presencia",
  weak: "Débil",
  acceptable: "Aceptable",
  strong: "Fuerte",
};

const COMMERCIAL_POTENTIAL_LABELS: Record<Lead["commercialPotential"], string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

const DECISION_ACCESS_LABELS: Record<Lead["decisionMakerAccess"], string> = {
  none: "Sin acceso",
  gatekeeper: "Con filtro",
  reachable: "Alcanzable",
  direct: "Directo",
};

const URGENCY_LABELS: Record<Lead["urgencySignal"], string> = {
  none: "Nula",
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

const BREAKDOWN_LABELS = {
  visibleDemand: "Demanda visible",
  digitalGap: "Brecha digital",
  commercialPotential: "Potencial comercial",
  decisionMakerAccess: "Acceso al decisor",
  urgencySignals: "Señales de urgencia",
} as const;

type LeadDetailProps = {
  lead: Lead;
  onQuickUpdate: (values: Partial<LeadFormValues>) => void;
};

function formatDate(value?: string): string {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OptionalText({ value }: { value?: string }) {
  if (!value) {
    return <span className="text-zinc-400">No definido</span>;
  }

  return <>{value}</>;
}

export function LeadDetail({ lead, onQuickUpdate }: LeadDetailProps) {
  const score = scoreLead(lead);
  const showDemoIndicator = deservesDemo(lead, score);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{lead.businessName}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {lead.category} · {lead.location}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/leads"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Volver
          </Link>
          <Link
            href={`/leads/${lead.id}/edit`}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Editar lead
          </Link>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Identificación del negocio
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-zinc-500">Nombre</dt><dd className="font-medium text-zinc-900 dark:text-zinc-100">{lead.businessName}</dd></div>
              <div><dt className="text-zinc-500">Rubro</dt><dd><OptionalText value={lead.category} /></dd></div>
              <div><dt className="text-zinc-500">Zona</dt><dd><OptionalText value={lead.location} /></dd></div>
              <div><dt className="text-zinc-500">Dirección</dt><dd><OptionalText value={lead.address} /></dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Presencia pública
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-zinc-500">Rating</dt><dd>{lead.rating ?? "Sin dato"}</dd></div>
              <div><dt className="text-zinc-500">Reseñas</dt><dd>{lead.reviewCount}</dd></div>
              <div><dt className="text-zinc-500">Sitio web</dt><dd>{lead.hasWebsite ? "Sí" : "No"}</dd></div>
              <div>
                <dt className="text-zinc-500">URL sitio</dt>
                <dd>
                  {lead.websiteUrl ? (
                    <a
                      href={lead.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                    >
                      {lead.websiteUrl}
                    </a>
                  ) : (
                    <OptionalText value={lead.websiteUrl} />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Instagram</dt>
                <dd>
                  {lead.instagram ? (
                    <a
                      href={lead.instagram}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
                    >
                      {lead.instagram}
                    </a>
                  ) : (
                    <OptionalText value={lead.instagram} />
                  )}
                </dd>
              </div>
              <div><dt className="text-zinc-500">WhatsApp</dt><dd><OptionalText value={lead.whatsapp} /></dd></div>
              <div><dt className="text-zinc-500">Teléfono</dt><dd><OptionalText value={lead.phone} /></dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Evaluación comercial
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-zinc-500">Calidad digital</dt><dd>{DIGITAL_QUALITY_LABELS[lead.digitalPresenceQuality]}</dd></div>
              <div><dt className="text-zinc-500">Potencial comercial</dt><dd>{COMMERCIAL_POTENTIAL_LABELS[lead.commercialPotential]}</dd></div>
              <div><dt className="text-zinc-500">Acceso al decisor</dt><dd>{DECISION_ACCESS_LABELS[lead.decisionMakerAccess]}</dd></div>
              <div><dt className="text-zinc-500">Señales de urgencia</dt><dd>{URGENCY_LABELS[lead.urgencySignal]}</dd></div>
              <div className="sm:col-span-2"><dt className="text-zinc-500">Observación</dt><dd><OptionalText value={lead.problemObservation} /></dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Estado, próxima acción y seguimiento
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-zinc-500">Estado actual</dt><dd>{formatStatus(lead.status)}</dd></div>
              <div><dt className="text-zinc-500">Próxima acción</dt><dd>{formatNextAction(lead.nextAction)}</dd></div>
              <div><dt className="text-zinc-500">Seguimiento</dt><dd>{formatDate(lead.followUpDate)}</dd></div>
              <div><dt className="text-zinc-500">Demo recomendada</dt><dd>{lead.demoRecommended ? "Sí" : "No"}</dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Notas internas
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              <OptionalText value={lead.notes} />
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Resultado del score
            </h2>
            <div className="flex items-center gap-3">
              <p className="rounded-md bg-zinc-100 px-3 py-1 text-xl font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                {score.total}
              </p>
              <p className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                Prioridad {score.priority}
              </p>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{score.summary}</p>
            {showDemoIndicator ? (
              <p className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm font-medium text-fuchsia-800 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-200">
                🎯 Merece demo: alta prioridad comercial detectada.
              </p>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Explicación del puntaje (breakdown)
              </p>
              <ul className="space-y-1 text-sm">
                {Object.entries(score.breakdown).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between gap-2 text-zinc-700 dark:text-zinc-300">
                    <span>{BREAKDOWN_LABELS[key as keyof typeof BREAKDOWN_LABELS]}</span>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <StatusQuickActions
            status={lead.status}
            nextAction={lead.nextAction}
            followUpDate={lead.followUpDate}
            demoRecommended={lead.demoRecommended}
            onChange={onQuickUpdate}
          />

          <section className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Historial básico
            </h2>
            <p className="text-zinc-600 dark:text-zinc-300">Creado: {formatTimestamp(lead.createdAt)}</p>
            <p className="text-zinc-600 dark:text-zinc-300">Última actualización: {formatTimestamp(lead.updatedAt)}</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
