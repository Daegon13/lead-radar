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

export type LeadOutcomeType =
  | "not_contacted"
  | "called_no_answer"
  | "wrong_number"
  | "answered_not_interested"
  | "answered_send_info"
  | "interested"
  | "meeting_booked"
  | "proposal_requested"
  | "proposal_sent"
  | "won"
  | "lost"
  | "do_not_contact";

export type LeadObjectionType =
  | "already_has_website"
  | "already_has_provider"
  | "uses_instagram_only"
  | "no_budget"
  | "not_priority"
  | "send_info"
  | "call_later"
  | "not_decision_maker"
  | "bad_timing"
  | "wrong_business"
  | "unknown";

export type CommercialTemperature = "cold" | "warm" | "hot" | "blocked";
export type DealStage = LeadOutcomeType;

export type LeadOutcomeEvent = {
  id: string;
  outcome: LeadOutcomeType;
  occurredAt: string;
  note?: string;
  objection?: LeadObjectionType;
};

export type LeadObjectionEvent = {
  id: string;
  objection: LeadObjectionType;
  occurredAt: string;
  note?: string;
};

export type LeadProspectingMetadata = {
  source?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  confidence?: number;
  priority?: Priority;
  gapSignals?: string[];
  scoreReasons?: string[];
  salesAngle?: string;
  callOpening?: string;
  objectionHint?: string;
  lastContactedAt?: string;
  doNotCallChecked?: boolean;
  optOut?: boolean;
  contactAttempts?: number;
  lastOutcome?: LeadOutcomeEvent;
  outcomeHistory?: LeadOutcomeEvent[];
  nextFollowUpAt?: string;
  lastObjection?: LeadObjectionType;
  objectionHistory?: LeadObjectionEvent[];
  commercialTemperature?: CommercialTemperature;
  estimatedDealValue?: number;
  dealStage?: DealStage;
  dealValueEstimate?: number;
  researchSummary?: string;
  verifiedWebsite?: string;
  verifiedSocials?: string[];
  businessSignals?: string[];
  riskFlags?: string[];
  improvedSalesAngle?: string;
  improvedCallOpening?: string;
  citations?: string[];
  evidenceUrls?: string[];
  aiResearchedAt?: string;
  aiProvider?: string;
  aiModel?: string;
};

export type ScoreBreakdown = {
  visibleDemand: number;
  digitalGap: number;
  commercialPotential: number;
  decisionMakerAccess: number;
  urgencySignals: number;
};

export type Lead = LeadProspectingMetadata & {
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
