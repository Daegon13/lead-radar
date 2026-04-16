import { NEXT_ACTION_LABELS } from "@/lib/constants";
import type { Lead, LeadScoreResult, NextAction, Priority, ScoreBreakdown } from "@/types/lead";

function scoreVisibleDemand(rating: number | null, reviewCount: number): number {
  const reviewScore = Math.min(15, Math.floor(reviewCount / 20));

  if (rating === null) {
    return Math.min(25, reviewScore + 4);
  }

  if (rating >= 4.6) return Math.min(25, reviewScore + 10);
  if (rating >= 4.2) return Math.min(25, reviewScore + 8);
  if (rating >= 3.8) return Math.min(25, reviewScore + 6);

  return Math.min(25, reviewScore + 3);
}

function scoreDigitalGap(quality: Lead["digitalPresenceQuality"]): number {
  switch (quality) {
    case "none":
      return 30;
    case "weak":
      return 22;
    case "acceptable":
      return 12;
    case "strong":
      return 4;
    default:
      return 0;
  }
}

function scoreCommercialPotential(level: Lead["commercialPotential"]): number {
  switch (level) {
    case "high":
      return 20;
    case "medium":
      return 13;
    case "low":
      return 6;
    default:
      return 0;
  }
}

function scoreDecisionMakerAccess(access: Lead["decisionMakerAccess"]): number {
  switch (access) {
    case "direct":
      return 15;
    case "reachable":
      return 10;
    case "gatekeeper":
      return 6;
    case "none":
      return 2;
    default:
      return 0;
  }
}

function scoreUrgency(signal: Lead["urgencySignal"]): number {
  switch (signal) {
    case "high":
      return 10;
    case "medium":
      return 7;
    case "low":
      return 4;
    case "none":
      return 1;
    default:
      return 0;
  }
}

function resolvePriority(total: number): Priority {
  if (total >= 75) return "A";
  if (total >= 60) return "B";
  if (total >= 45) return "C";
  return "D";
}

function resolveAction(priority: Priority): NextAction {
  switch (priority) {
    case "A":
      return "call_today";
    case "B":
      return "dm_or_whatsapp";
    case "C":
      return "follow_up";
    case "D":
      return "disqualify";
    default:
      return "follow_up";
  }
}

export function scoreLead(lead: Lead): LeadScoreResult {
  const breakdown: ScoreBreakdown = {
    visibleDemand: scoreVisibleDemand(lead.rating, lead.reviewCount),
    digitalGap: scoreDigitalGap(lead.digitalPresenceQuality),
    commercialPotential: scoreCommercialPotential(lead.commercialPotential),
    decisionMakerAccess: scoreDecisionMakerAccess(lead.decisionMakerAccess),
    urgencySignals: scoreUrgency(lead.urgencySignal),
  };

  const total =
    breakdown.visibleDemand +
    breakdown.digitalGap +
    breakdown.commercialPotential +
    breakdown.decisionMakerAccess +
    breakdown.urgencySignals;

  const priority = resolvePriority(total);
  const recommendedAction = resolveAction(priority);

  return {
    total,
    priority,
    breakdown,
    summary: `${priority} (${total}/100): ${NEXT_ACTION_LABELS[recommendedAction]}`,
    recommendedAction,
  };
}

export function deservesDemo(lead: Lead, score: LeadScoreResult = scoreLead(lead)): boolean {
  if (lead.demoRecommended) {
    return true;
  }

  return score.priority === "A" || (score.priority === "B" && lead.urgencySignal === "high");
}
