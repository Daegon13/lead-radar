"use client";

import { useMemo, useState } from "react";

import { LEAD_STATUSES, LEAD_STATUS_LABELS, NEXT_ACTIONS, NEXT_ACTION_LABELS } from "@/lib/constants";
import { scoreLead } from "@/lib/scoring";
import type {
  CommercialPotential,
  DecisionMakerAccess,
  DigitalPresenceQuality,
  Lead,
  LeadFormValues,
  LeadStatus,
  NextAction,
  UrgencySignal,
} from "@/types/lead";
import { LeadScoreCard } from "@/components/leads/lead-score-card";

type LeadFormProps = {
  mode: "create" | "edit";
  initialLead?: Lead;
  onSubmit: (values: LeadFormValues) => void;
  isSaving?: boolean;
};

type FormState = {
  businessName: string;
  category: string;
  location: string;
  address: string;
  rating: string;
  reviewCount: string;
  hasWebsite: boolean;
  websiteUrl: string;
  instagram: string;
  whatsapp: string;
  phone: string;
  digitalPresenceQuality: DigitalPresenceQuality | "";
  commercialPotential: CommercialPotential | "";
  decisionMakerAccess: DecisionMakerAccess | "";
  urgencySignal: UrgencySignal | "";
  problemObservation: string;
  status: LeadStatus;
  nextAction: NextAction;
  followUpDate: string;
  notes: string;
  demoRecommended: boolean;
};

const DIGITAL_QUALITY_OPTIONS: Array<{ value: DigitalPresenceQuality; label: string }> = [
  { value: "none", label: "Sin presencia" },
  { value: "weak", label: "Débil" },
  { value: "acceptable", label: "Aceptable" },
  { value: "strong", label: "Fuerte" },
];

const COMMERCIAL_POTENTIAL_OPTIONS: Array<{ value: CommercialPotential; label: string }> = [
  { value: "low", label: "Bajo" },
  { value: "medium", label: "Medio" },
  { value: "high", label: "Alto" },
];

const DECISION_ACCESS_OPTIONS: Array<{ value: DecisionMakerAccess; label: string }> = [
  { value: "none", label: "Sin acceso" },
  { value: "gatekeeper", label: "Con filtro" },
  { value: "reachable", label: "Alcanzable" },
  { value: "direct", label: "Directo" },
];

const URGENCY_OPTIONS: Array<{ value: UrgencySignal; label: string }> = [
  { value: "none", label: "Nula" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

function buildInitialState(initialLead?: Lead): FormState {
  return {
    businessName: initialLead?.businessName ?? "",
    category: initialLead?.category ?? "",
    location: initialLead?.location ?? "",
    address: initialLead?.address ?? "",
    rating: initialLead?.rating === null || initialLead?.rating === undefined ? "" : String(initialLead.rating),
    reviewCount: String(initialLead?.reviewCount ?? 0),
    hasWebsite: initialLead?.hasWebsite ?? false,
    websiteUrl: initialLead?.websiteUrl ?? "",
    instagram: initialLead?.instagram ?? "",
    whatsapp: initialLead?.whatsapp ?? "",
    phone: initialLead?.phone ?? "",
    digitalPresenceQuality: initialLead?.digitalPresenceQuality ?? "",
    commercialPotential: initialLead?.commercialPotential ?? "",
    decisionMakerAccess: initialLead?.decisionMakerAccess ?? "",
    urgencySignal: initialLead?.urgencySignal ?? "",
    problemObservation: initialLead?.problemObservation ?? "",
    status: initialLead?.status ?? "new",
    nextAction: initialLead?.nextAction ?? "follow_up",
    followUpDate: initialLead?.followUpDate ?? "",
    notes: initialLead?.notes ?? "",
    demoRecommended: initialLead?.demoRecommended ?? false,
  };
}

function parseRating(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(5, parsed)) : null;
}

function parseReviewCount(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.floor(parsed));
}

export function LeadForm({ mode, initialLead, onSubmit, isSaving = false }: LeadFormProps) {
  const [values, setValues] = useState<FormState>(buildInitialState(initialLead));
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(
    () =>
      scoreLead({
        id: initialLead?.id ?? "preview",
        businessName: values.businessName.trim() || "Lead sin nombre",
        category: values.category.trim() || "Sin rubro",
        location: values.location.trim() || "Sin zona",
        address: values.address.trim() || undefined,
        rating: parseRating(values.rating),
        reviewCount: parseReviewCount(values.reviewCount),
        hasWebsite: values.hasWebsite,
        websiteUrl: values.websiteUrl.trim() || undefined,
        instagram: values.instagram.trim() || undefined,
        whatsapp: values.whatsapp.trim() || undefined,
        phone: values.phone.trim() || undefined,
        digitalPresenceQuality: values.digitalPresenceQuality || "none",
        commercialPotential: values.commercialPotential || "low",
        decisionMakerAccess: values.decisionMakerAccess || "none",
        urgencySignal: values.urgencySignal || "none",
        problemObservation: values.problemObservation.trim() || undefined,
        status: values.status,
        nextAction: values.nextAction,
        followUpDate: values.followUpDate || undefined,
        notes: values.notes.trim() || undefined,
        demoRecommended: values.demoRecommended,
        createdAt: initialLead?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    [initialLead?.createdAt, initialLead?.id, values],
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!values.businessName.trim()) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    if (!values.category.trim()) {
      setError("El rubro es obligatorio.");
      return;
    }

    if (!values.location.trim()) {
      setError("La zona/barrio/ciudad es obligatoria.");
      return;
    }

    if (!values.digitalPresenceQuality || !values.commercialPotential || !values.decisionMakerAccess || !values.urgencySignal) {
      setError("Completá las variables comerciales obligatorias para calcular prioridad.");
      return;
    }

    setError(null);

    onSubmit({
      businessName: values.businessName.trim(),
      category: values.category.trim(),
      location: values.location.trim(),
      address: values.address.trim() || undefined,
      rating: parseRating(values.rating),
      reviewCount: parseReviewCount(values.reviewCount),
      hasWebsite: values.hasWebsite,
      websiteUrl: values.websiteUrl.trim() || undefined,
      instagram: values.instagram.trim() || undefined,
      whatsapp: values.whatsapp.trim() || undefined,
      phone: values.phone.trim() || undefined,
      digitalPresenceQuality: values.digitalPresenceQuality,
      commercialPotential: values.commercialPotential,
      decisionMakerAccess: values.decisionMakerAccess,
      urgencySignal: values.urgencySignal,
      problemObservation: values.problemObservation.trim() || undefined,
      status: values.status,
      nextAction: values.nextAction,
      followUpDate: values.followUpDate || undefined,
      notes: values.notes.trim() || undefined,
      demoRecommended: values.demoRecommended,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Negocio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2"><span>Nombre del negocio *</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.businessName} onChange={(e)=>updateField("businessName",e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>Rubro *</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.category} onChange={(e)=>updateField("category",e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>Zona / barrio / ciudad *</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.location} onChange={(e)=>updateField("location",e.target.value)} /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>Dirección (opcional)</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.address} onChange={(e)=>updateField("address",e.target.value)} /></label>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Presencia pública</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Rating</span><input type="number" min="0" max="5" step="0.1" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.rating} onChange={(e)=>updateField("rating",e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>Cantidad de reseñas</span><input type="number" min="0" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.reviewCount} onChange={(e)=>updateField("reviewCount",e.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={values.hasWebsite} onChange={(e)=>updateField("hasWebsite",e.target.checked)} /> Tiene web</label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>URL del sitio</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.websiteUrl} onChange={(e)=>updateField("websiteUrl",e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>Instagram</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.instagram} onChange={(e)=>updateField("instagram",e.target.value)} /></label>
            <label className="space-y-1 text-sm"><span>WhatsApp</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.whatsapp} onChange={(e)=>updateField("whatsapp",e.target.value)} /></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>Teléfono</span><input className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.phone} onChange={(e)=>updateField("phone",e.target.value)} /></label>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Evaluación comercial</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Calidad presencia digital *</span><select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.digitalPresenceQuality} onChange={(e)=>updateField("digitalPresenceQuality",e.target.value as DigitalPresenceQuality | "")}> <option value="">Seleccionar</option>{DIGITAL_QUALITY_OPTIONS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Potencial del rubro *</span><select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.commercialPotential} onChange={(e)=>updateField("commercialPotential",e.target.value as CommercialPotential | "")}> <option value="">Seleccionar</option>{COMMERCIAL_POTENTIAL_OPTIONS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Acceso al decisor *</span><select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.decisionMakerAccess} onChange={(e)=>updateField("decisionMakerAccess",e.target.value as DecisionMakerAccess | "")}> <option value="">Seleccionar</option>{DECISION_ACCESS_OPTIONS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Señales de urgencia *</span><select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.urgencySignal} onChange={(e)=>updateField("urgencySignal",e.target.value as UrgencySignal | "")}> <option value="">Seleccionar</option>{URGENCY_OPTIONS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>Observaciones del problema detectado</span><textarea className="min-h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.problemObservation} onChange={(e)=>updateField("problemObservation",e.target.value)} /></label>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Gestión comercial y notas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Estado del lead</span><select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.status} onChange={(e)=>updateField("status",e.target.value as LeadStatus)}>{LEAD_STATUSES.map((status)=><option key={status} value={status}>{LEAD_STATUS_LABELS[status]}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Próxima acción</span><select className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.nextAction} onChange={(e)=>updateField("nextAction",e.target.value as NextAction)}>{NEXT_ACTIONS.map((action)=><option key={action} value={action}>{NEXT_ACTION_LABELS[action]}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Fecha seguimiento</span><input type="date" className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.followUpDate} onChange={(e)=>updateField("followUpDate",e.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={values.demoRecommended} onChange={(e)=>updateField("demoRecommended",e.target.checked)} /> Demo recomendada</label>
            <label className="space-y-1 text-sm sm:col-span-2"><span>Notas internas</span><textarea className="min-h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={values.notes} onChange={(e)=>updateField("notes",e.target.value)} /></label>
          </div>
        </div>

        {error ? <p className="rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={isSaving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
            {isSaving ? "Guardando..." : mode === "create" ? "Crear lead" : "Guardar cambios"}
          </button>
        </div>
      </div>

      <LeadScoreCard score={score} />
    </form>
  );
}
