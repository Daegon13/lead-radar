"use client";

import Link from "next/link";
import { use, useState } from "react";

import { LeadForm } from "@/components/leads/lead-form";
import { useLeads } from "@/hooks/use-leads";
import type { LeadFormValues } from "@/types/lead";

type EditLeadPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditLeadPage({ params }: EditLeadPageProps) {
  const { id } = use(params);
  const { isLoaded, getLeadById, updateLeadById } = useLeads();
  const [isSaving, setIsSaving] = useState(false);

  const lead = getLeadById(id);

  function handleUpdate(values: LeadFormValues) {
    setIsSaving(true);
    updateLeadById(id, values);
    setIsSaving(false);
  }

  if (!isLoaded) {
    return <p className="text-sm text-zinc-500">Cargando lead...</p>;
  }

  if (!lead) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lead no encontrado</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No existe un lead con ID {id} en localStorage.</p>
        <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Volver a leads
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Volver a leads
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Editar lead</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Actualizá datos y score manteniendo el histórico temporal del lead.</p>
      </header>

      <LeadForm mode="edit" initialLead={lead} onSubmit={handleUpdate} isSaving={isSaving} />
    </section>
  );
}
