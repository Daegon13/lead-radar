export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type NextAction =
  | "call_today"
  | "dm_or_whatsapp"
  | "follow_up"
  | "disqualify";

export type Priority = "A" | "B" | "C" | "D";

export type DigitalPresenceQuality = "none" | "weak" | "acceptable" | "strong";

export type CommercialPotential = "low" | "medium" | "high";

export type DecisionMakerAccess = "none" | "gatekeeper" | "reachable" | "direct";

export type UrgencySignal = "none" | "low" | "medium" | "high";

export type ScoreBreakdown = {
  visibleDemand: number;
  digitalGap: number;
  commercialPotential: number;
  decisionMakerAccess: number;
  urgencySignals: number;
};

export type Lead = {
  id: string;
  businessName: string;
  category: string;
  location: string;
  address?: string;
  rating: number | null;
  reviewCount: number;
  hasWebsite: boolean;
  websiteUrl?: string;
  instagram?: string;
  whatsapp?: string;
  phone?: string;
  digitalPresenceQuality: DigitalPresenceQuality;
  commercialPotential: CommercialPotential;
  decisionMakerAccess: DecisionMakerAccess;
  urgencySignal: UrgencySignal;
  problemObservation?: string;
  status: LeadStatus;
  nextAction: NextAction;
  followUpDate?: string;
  notes?: string;
  demoRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LeadScoreResult = {
  total: number;
  priority: Priority;
  breakdown: ScoreBreakdown;
  summary: string;
  recommendedAction: NextAction;
};

export type LeadFormValues = Omit<Lead, "id" | "createdAt" | "updatedAt">;
