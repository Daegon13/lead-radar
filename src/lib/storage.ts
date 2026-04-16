import { seedLeads } from "@/data/seed-leads";
import type { Lead } from "@/types/lead";

const LEADS_STORAGE_KEY = "lead-radar:leads";

function cloneLeads(leads: Lead[]): Lead[] {
  return leads.map((lead) => ({ ...lead }));
}

export function loadLeads(): Lead[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LEADS_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as Lead[];
  } catch {
    return null;
  }
}

export function saveLeads(leads: Lead[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
}

export function loadOrInitializeLeads(): Lead[] {
  const storedLeads = loadLeads();

  if (storedLeads) {
    return storedLeads;
  }

  const initialLeads = cloneLeads(seedLeads);
  saveLeads(initialLeads);
  return initialLeads;
}
