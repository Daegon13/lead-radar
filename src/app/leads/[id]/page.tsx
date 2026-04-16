"use client";

import Link from "next/link";
import { use } from "react";

import { LeadDetail } from "@/components/leads/lead-detail";
import { useLeads } from "@/hooks/use-leads";
import type { LeadFormValues } from "@/types/lead";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = use(params);
  const { isLoaded, getLeadById, updateLead } = useLeads();

  const lead = getLeadById(id);

  function handleQuickUpdate(values: Partial<LeadFormValues>) {
    if (!lead) {
      return;
    }

    updateLead({
      ...lead,
      ...values,
      updatedAt: new Date().toISOString(),
    });
  }

  if (!isLoaded) {
    return <p className="text-sm text-zinc-500">Cargando lead...</p>;
  }

  if (!lead) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lead no encontrado</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No existe un lead con ID {id} en localStorage.</p>
        <Link
          href="/leads"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Volver a leads
        </Link>
      </section>
    );
  }

  return <LeadDetail lead={lead} onQuickUpdate={handleQuickUpdate} />;
}
