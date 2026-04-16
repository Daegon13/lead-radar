"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LeadForm } from "@/components/leads/lead-form";
import { useLeads } from "@/hooks/use-leads";
import type { LeadFormValues } from "@/types/lead";

export default function NewLeadPage() {
  const router = useRouter();
  const { createLead } = useLeads();
  const [isSaving, setIsSaving] = useState(false);

  function handleCreate(values: LeadFormValues) {
    setIsSaving(true);
    const created = createLead(values);
    setIsSaving(false);
    router.push(`/leads/${created.id}/edit`);
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <Link href="/leads" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
          ← Volver a leads
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo lead</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Completá los datos mínimos para crear y priorizar en menos de un minuto.</p>
      </header>

      <LeadForm mode="create" onSubmit={handleCreate} isSaving={isSaving} />
    </section>
  );
}
