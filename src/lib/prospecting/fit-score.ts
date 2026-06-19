import type { NextAction, Priority } from "@/types/lead";
import { detectDigitalGap, type DigitalGapResult } from "./digital-gap";
import { generateSalesAngle } from "./sales-angle";
import type { NormalizedProspectRecord } from "./normalize";

export type ProspectFitScore = {
  total: number;
  priority: Priority;
  breakdown: {
    categoryFit: number;
    digitalGap: number;
    contactability: number;
    visibleDemand: number;
    decisionEase: number;
  };
  gap: DigitalGapResult;
  scoreReasons: string[];
  gapSignals: string[];
  salesAngle: string;
  callOpening: string;
  objectionHint: string;
  nextAction: NextAction;
  manualReview: boolean;
};

function key(value: string): string {
  return value.toLocaleLowerCase("es-UY").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hasAnyContact(p: NormalizedProspectRecord): boolean {
  return Boolean(p.phone || p.socials.whatsapp || p.email || p.socials.instagram || p.socials.facebook || p.socials.linkedin || p.socials.other.length);
}

function isChain(p: NormalizedProspectRecord): boolean {
  const text = key(`${p.name} ${p.category} ${p.website ?? ""}`);
  return /franquicia|franchise|shopping|mcdonald|burger king|starbucks|subway|kfc|tata|disco|devoto|farmashop/.test(text);
}

function isWeakSource(p: NormalizedProspectRecord): boolean {
  const text = key(p.source);
  return /desconoc|unknown|sin fuente/.test(text) && !p.sourceUrl && !p.sourceId;
}

function categoryScore(category: string): { points: number; reason: string; lowMargin: boolean } {
  const c = key(category);
  if (/kiosco|almacen|autoservicio|carniceria|ferreteria|puesto/.test(c)) return { points: 5, reason: `Rubro de bajo margen: ${category}`, lowMargin: true };
  if (/odont|dental|estetica|spa|inmobiliaria|construct|salud|clinica|arquitect|interior/.test(c)) return { points: 25, reason: `Rubro Tier 1 de alto valor: ${category}`, lowMargin: false };
  if (/abog|contador|gestoria|veterinaria|academia/.test(c)) return { points: 20, reason: `Rubro profesional con buen encaje ICP: ${category}`, lowMargin: false };
  if (/barber|peluquer|tatu|fitness|pilates|yoga|gimnasio/.test(c)) return { points: 15, reason: `Rubro visual o boutique que requiere filtrar calidad: ${category}`, lowMargin: false };
  if (/cafe|restaurant|restaurante|tienda|floreria|decoracion/.test(c)) return { points: 10, reason: `Rubro Tier 3: requiere señales comerciales fuertes (${category})`, lowMargin: false };
  return { points: 5, reason: `Rubro genérico o poco probado para el ICP: ${category}`, lowMargin: false };
}

function gapPoints(level: number): number {
  if (level >= 4) return 25;
  if (level === 3) return 22;
  if (level === 2) return 15;
  if (level === 1) return 10;
  return 3;
}

function contactPoints(p: NormalizedProspectRecord): { points: number; reason: string } {
  const hasPhone = Boolean(p.phone);
  const hasWhatsapp = Boolean(p.socials.whatsapp);
  const hasSocialOrEmail = Boolean(p.email || p.socials.instagram || p.socials.facebook || p.socials.linkedin || p.socials.other.length);
  if (hasPhone && hasWhatsapp && hasSocialOrEmail) return { points: 20, reason: "Tiene teléfono, WhatsApp y canal digital adicional" };
  if (hasPhone || hasWhatsapp) return { points: 15, reason: "Tiene teléfono o WhatsApp claro" };
  if (hasSocialOrEmail) return { points: 10, reason: "Tiene red social o email público como canal inicial" };
  if (p.address) return { points: 5, reason: "Solo se detectó dirección física; contacto limitado" };
  return { points: 0, reason: "Sin contacto público detectado" };
}

function demandPoints(p: NormalizedProspectRecord): { points: number; reason: string } {
  if (p.reviewCount >= 50 && (p.rating ?? 0) >= 4.2) return { points: 20, reason: "Muchas reseñas y rating saludable: demanda visible fuerte" };
  if (p.reviewCount >= 15 || (p.rating ?? 0) >= 4.3 || p.socials.instagram) return { points: 15, reason: "Señales activas de demanda o reputación" };
  if (p.reviewCount > 0 || p.address || p.sourceUrl) return { points: 10, reason: "Señales moderadas de actividad local" };
  return { points: 5, reason: "Poca evidencia de demanda visible" };
}

function decisionPoints(p: NormalizedProspectRecord): { points: number; reason: string } {
  if (isChain(p)) return { points: 0, reason: "Cadena/franquicia o marca corporativa: decisor inaccesible" };
  if (p.phone || p.socials.whatsapp) return { points: 10, reason: "Negocio probablemente independiente con canal directo" };
  if (p.socials.instagram || p.email) return { points: 7, reason: "Decisión local probable, aunque puede haber gatekeeper" };
  return { points: 4, reason: "Acceso al decisor incierto" };
}

function priorityFromScore(total: number): Priority {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  return "D";
}

function capPriority(priority: Priority, max: Priority): Priority {
  const order: Priority[] = ["A", "B", "C", "D"];
  return order.indexOf(priority) < order.indexOf(max) ? max : priority;
}

export function calculateProspectFitScore(prospect: NormalizedProspectRecord): ProspectFitScore {
  const category = categoryScore(prospect.category);
  const gap = detectDigitalGap(prospect);
  const contact = contactPoints(prospect);
  const demand = demandPoints(prospect);
  const decision = decisionPoints(prospect);
  const breakdown = { categoryFit: category.points, digitalGap: gapPoints(gap.level), contactability: contact.points, visibleDemand: demand.points, decisionEase: decision.points };
  const total = Math.max(0, Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0)));
  const scoreReasons = [category.reason, `Brecha digital Gap ${gap.level}: ${gap.label}`, contact.reason, demand.reason, decision.reason];
  let priority = priorityFromScore(total);
  let manualReview = false;

  if (!hasAnyContact(prospect)) priority = capPriority(priority, "C");
  if (contact.points < 10) priority = capPriority(priority, "C");
  if (category.lowMargin) priority = capPriority(priority, "C");
  if (gap.level === 0) priority = capPriority(priority, "B");
  if (isChain(prospect)) { priority = capPriority(priority, "C"); manualReview = true; }
  if (isWeakSource(prospect)) { priority = capPriority(priority, "C"); manualReview = true; }

  if (manualReview) scoreReasons.push("Regla dura: requiere revisión manual antes de contactar");
  if (!hasAnyContact(prospect)) scoreReasons.push("Regla dura: sin contacto público nunca puede ser prioridad A");
  if (category.lowMargin) scoreReasons.push("Regla dura: rubro de bajo margen limitado a prioridad C");
  if (gap.level === 0) scoreReasons.push("Regla dura: presencia digital fuerte limitada a prioridad B");

  const salesAngle = generateSalesAngle(prospect, gap, priority);

  return {
    total,
    priority,
    breakdown,
    gap,
    scoreReasons,
    gapSignals: gap.signals,
    salesAngle: salesAngle.salesAngle,
    callOpening: salesAngle.callOpening,
    objectionHint: salesAngle.objectionHint,
    nextAction: salesAngle.nextAction,
    manualReview,
  };
}

export function applyPriorityGuards(score: ProspectFitScore): ProspectFitScore {
  return score;
}

export function buildScoreReasons(prospect: NormalizedProspectRecord): string[] {
  return calculateProspectFitScore(prospect).scoreReasons;
}
