import type { Lead } from "@/types/lead";

export const LEADS_STORAGE_KEY = "lead-radar:leads";

export type LeadStoreBackend = "localStorage";

export type LeadStoreSnapshot = {
  rawLeads: unknown[] | null;
  error?: string;
};

export type LeadStore = {
  backend: LeadStoreBackend;
  loadSnapshot: () => LeadStoreSnapshot;
  saveLeads: (leads: Lead[]) => void;
  clearLeads: () => void;
};

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createLocalStorageLeadStore(storageKey = LEADS_STORAGE_KEY): LeadStore {
  return {
    backend: "localStorage",
    loadSnapshot() {
      if (!canUseBrowserStorage()) {
        return { rawLeads: null, error: "browser-storage-unavailable" };
      }

      const rawValue = window.localStorage.getItem(storageKey);

      if (!rawValue) {
        return { rawLeads: null };
      }

      try {
        const parsedValue: unknown = JSON.parse(rawValue);

        if (!Array.isArray(parsedValue)) {
          return { rawLeads: null, error: "invalid-leads-payload" };
        }

        return { rawLeads: parsedValue };
      } catch {
        return { rawLeads: null, error: "unreadable-leads-payload" };
      }
    },
    saveLeads(leads) {
      if (!canUseBrowserStorage()) {
        return;
      }

      window.localStorage.setItem(storageKey, JSON.stringify(leads));
    },
    clearLeads() {
      if (!canUseBrowserStorage()) {
        return;
      }

      window.localStorage.removeItem(storageKey);
    },
  };
}

export const leadStore = createLocalStorageLeadStore();
