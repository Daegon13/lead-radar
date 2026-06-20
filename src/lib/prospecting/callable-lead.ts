import type { Lead } from "@/types/lead";

function hasUsefulSocial(lead: Lead): boolean {
  return Boolean(lead.instagram?.trim());
}

function hasWeakWebsiteContact(lead: Lead): boolean {
  return Boolean(lead.websiteUrl?.trim() && (lead.problemObservation?.toLowerCase().includes("contact") || lead.websiteUrl));
}

function looksLikeLargeChain(lead: Lead): boolean {
  const text = `${lead.businessName} ${lead.notes ?? ""} ${(lead.riskFlags ?? []).join(" ")}`.toLowerCase();
  return /franquicia|cadena|chain|sucursal|multinacional|shopping|mall/.test(text);
}

function hasIcpOrPriority(lead: Lead): boolean {
  return lead.commercialPotential === "high" || lead.priority === "A" || lead.priority === "B";
}

function hasClearGap(lead: Lead): boolean {
  return lead.digitalPresenceQuality === "none" || lead.digitalPresenceQuality === "weak" || lead.demoRecommended === true || (lead.gapSignals ?? []).some((signal) => /sin web|missing|weak|débil|debil|brecha|contact/i.test(signal));
}

function hasTraceableProspectingSource(lead: Lead): boolean {
  if (!lead.source && !lead.sourceId && !lead.sourceUrl && !lead.sourceCheckedAt) return true;
  return Boolean(lead.source && lead.sourceCheckedAt && (lead.sourceId || lead.sourceUrl));
}

export function getCallableLeadReasons(lead: Lead): string[] {
  const reasons: string[] = [];
  if (lead.phone?.trim()) reasons.push("tiene teléfono");
  if (lead.whatsapp?.trim()) reasons.push("tiene WhatsApp");
  if (!lead.phone?.trim() && !lead.whatsapp?.trim() && hasUsefulSocial(lead)) reasons.push("solo tiene Instagram");
  if (!lead.phone?.trim() && !lead.whatsapp?.trim() && !(lead as Lead & { email?: string }).email && !hasUsefulSocial(lead) && !hasWeakWebsiteContact(lead)) reasons.push("sin contacto directo");
  if (hasClearGap(lead)) reasons.push("buena brecha digital");
  if (lead.digitalPresenceQuality === "strong") reasons.push("web fuerte, baja urgencia");
  if (!hasTraceableProspectingSource(lead)) reasons.push("source poco confiable");
  if (lead.commercialPotential === "high" || lead.priority === "A") reasons.push("rubro ICP alto");
  if (lead.optOut) reasons.push("opt-out activo");
  if (looksLikeLargeChain(lead)) reasons.push("posible cadena/franquicia grande");
  if (!hasIcpOrPriority(lead)) reasons.push("rubro/prioridad fuera de ICP A/B");
  return reasons;
}

export function isCallableLead(lead: Lead): boolean {
  const hasContact = Boolean(lead.phone?.trim() || lead.whatsapp?.trim() || (lead as Lead & { email?: string }).email || hasUsefulSocial(lead) || hasWeakWebsiteContact(lead));
  return hasContact && !lead.optOut && !looksLikeLargeChain(lead) && hasIcpOrPriority(lead) && hasClearGap(lead) && hasTraceableProspectingSource(lead);
}
