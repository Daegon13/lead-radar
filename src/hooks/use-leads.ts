"use client";

import { useMemo, useState } from "react";

import { loadOrInitializeLeads, saveLeads } from "@/lib/storage";
import { scoreLead } from "@/lib/scoring";
import type { Lead } from "@/types/lead";

export type ScoredLead = {
  lead: Lead;
  score: ReturnType<typeof scoreLead>;
};

function loadInitialLeads(): Lead[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  return loadOrInitializeLeads();
}

export function useLeads() {
  const [leads, setLeadsState] = useState<Lead[] | null>(loadInitialLeads);

  const safeLeads = useMemo(() => leads ?? [], [leads]);
  const isLoaded = leads !== null;

  const scoredLeads = useMemo<ScoredLead[]>(
    () =>
      safeLeads
        .map((lead) => ({
          lead,
          score: scoreLead(lead),
        }))
        .sort((a, b) => b.score.total - a.score.total),
    [safeLeads],
  );

  function setLeads(nextLeads: Lead[] | ((currentLeads: Lead[]) => Lead[])) {
    setLeadsState((currentLeads) => {
      const baseLeads = currentLeads ?? [];
      const resolvedLeads =
        typeof nextLeads === "function" ? (nextLeads as (leads: Lead[]) => Lead[])(baseLeads) : nextLeads;

      saveLeads(resolvedLeads);
      return resolvedLeads;
    });
  }

  function addLead(newLead: Lead) {
    setLeads((currentLeads) => [newLead, ...currentLeads]);
  }

  function updateLead(updatedLead: Lead) {
    setLeads((currentLeads) =>
      currentLeads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
    );
  }

  function getLeadById(id: string): Lead | undefined {
    return safeLeads.find((lead) => lead.id === id);
  }

  return {
    leads: safeLeads,
    scoredLeads,
    isLoaded,
    setLeads,
    addLead,
    updateLead,
    getLeadById,
  };
}
