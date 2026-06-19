import type { LeadFormValues } from "@/types/lead";

export type ProspectSource = {
  providerId: string;
  providerLabel: string;
  checkedAt: string;
  externalId?: string;
};

export type ProspectGapSignal = {
  type: "missing_website" | "weak_presence" | "missing_contact" | "low_reviews" | "unknown";
  label: string;
  severity: "low" | "medium" | "high";
  evidence?: string;
};

export type ProspectingRunInput = {
  lat: number;
  lng: number;
  radiusMeters: number;
  category: string;
  hotspotId?: string;
  hotspotLabel?: string;
  maxResults?: number;
};

export type RawProspect = {
  id?: string;
  name?: string;
  category?: string;
  country?: string;
  city?: string;
  neighborhood?: string;
  vicinity?: string;
  address?: string;
  rating?: number | null;
  reviewCount?: number;
  website?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  socials?: string[];
  lat?: number;
  lng?: number;
  source?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  confidence?: number;
  operatingStatus?: string;
  sourcePayload?: unknown;
};

export type NormalizedProspect = {
  id: string;
  source: ProspectSource;
  raw: RawProspect;
  leadValues: LeadFormValues;
  gapSignals: ProspectGapSignal[];
};

export type ProspectingRunResult = {
  providerId: string;
  providerLabel: string;
  checkedAt: string;
  input: ProspectingRunInput;
  rawProspects: RawProspect[];
  prospects: NormalizedProspect[];
};

export type ProspectingProvider = {
  id: string;
  label: string;
  run(input: ProspectingRunInput): ProspectingRunResult | Promise<ProspectingRunResult>;
};
