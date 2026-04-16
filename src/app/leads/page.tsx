"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadTable } from "@/components/leads/lead-table";
import { useLeads } from "@/hooks/use-leads";
import type { LeadStatus, Priority } from "@/types/lead";

export default function LeadsPage() {
  const { scoredLeads, isLoaded } = useLeads();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState<"all" | Priority>("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | LeadStatus>("all");

  const categories = useMemo(
    () => Array.from(new Set(scoredLeads.map(({ lead }) => lead.category))).sort(),
    [scoredLeads],
  );

  const filteredLeads = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return scoredLeads.filter(({ lead, score }) => {
      const matchesName =
        normalizedSearch.length === 0 || lead.businessName.toLowerCase().includes(normalizedSearch);
      const matchesCategory = selectedCategory === "all" || lead.category === selectedCategory;
      const matchesPriority = selectedPriority === "all" || score.priority === selectedPriority;
      const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;

      return matchesName && matchesCategory && matchesPriority && matchesStatus;
    });
  }, [scoredLeads, search, selectedCategory, selectedPriority, selectedStatus]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Lista operativa persistida en localStorage para priorizar oportunidades.
          </p>
        </div>

        <Link
          href="/leads/new"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Nuevo lead
        </Link>
      </header>

      <LeadFilters
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        categories={categories}
      />

      {!isLoaded ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Cargando leads...
        </div>
      ) : (
        <LeadTable leads={filteredLeads} />
      )}
    </section>
  );
}
