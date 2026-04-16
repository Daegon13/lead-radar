"use client";

import { useMemo, useState } from "react";

import { loadOrInitializeLeads, resetStoredLeads, saveLeads } from "@/lib/storage";
import { scoreLead } from "@/lib/scoring";
import type { Lead, LeadFormValues } from "@/types/lead";

export type ScoredLead = {
  lead: Lead;
  score: ReturnType<typeof scoreLead>;
};

function normalizeLead(lead: Lead): Lead {
  const fallbackTimestamp = new Date().toISOString();

  return {
    ...lead,
    hasWebsite: lead.hasWebsite ?? Boolean(lead.websiteUrl),
    createdAt: lead.createdAt ?? fallbackTimestamp,
    updatedAt: lead.updatedAt ?? fallbackTimestamp,
  };
}

function loadInitialLeads(): Lead[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  return loadOrInitializeLeads().map(normalizeLead);
}

function createLeadId(): string {
  return `lead-${Math.random().toString(36).slice(2, 10)}`;
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

  function replaceLeads(nextLeads: Lead[]) {
    setLeads(nextLeads.map(normalizeLead));
  }

  function resetLeads() {
    const clearedLeads = resetStoredLeads();
    setLeadsState(clearedLeads);
  }

  function addLead(newLead: Lead) {
    setLeads((currentLeads) => [newLead, ...currentLeads]);
  }

  function createLead(values: LeadFormValues): Lead {
    const now = new Date().toISOString();
    const newLead: Lead = {
      ...values,
      id: createLeadId(),
      createdAt: now,
      updatedAt: now,
    };

    addLead(newLead);
    return newLead;
  }

  function updateLead(updatedLead: Lead) {
    setLeads((currentLeads) =>
      currentLeads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)),
    );
  }

  function updateLeadById(id: string, values: LeadFormValues): Lead | null {
    const currentLead = getLeadById(id);

    if (!currentLead) {
      return null;
    }

    const nextLead: Lead = {
      ...currentLead,
      ...values,
      id: currentLead.id,
      createdAt: currentLead.createdAt,
      updatedAt: new Date().toISOString(),
    };

    updateLead(nextLead);
    return nextLead;
  }

  function getLeadById(id: string): Lead | undefined {
    return safeLeads.find((lead) => lead.id === id);
  }

  return {
    leads: safeLeads,
    scoredLeads,
    isLoaded,
    setLeads,
    replaceLeads,
    resetLeads,
    addLead,
    createLead,
    updateLead,
    updateLeadById,
    getLeadById,
  };
}
