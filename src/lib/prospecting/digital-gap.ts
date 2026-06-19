import type { NormalizedProspectRecord } from "./normalize";

export type DigitalGapLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type WebsiteHealthResult = {
  isReachable?: boolean;
  hasHttps?: boolean;
  isStrong?: boolean;
  issues: string[];
};

export type DigitalGapResult = {
  level: DigitalGapLevel;
  label: string;
  signals: string[];
  summary: string;
  confidence: number;
};

const SOCIAL_OR_BOOKING_DOMAINS = /(instagram\.com|facebook\.com|fb\.com|linktr\.ee|beacons\.ai|carrd\.co|fresha\.com|booksy\.com|calendly\.com|wa\.me|whatsapp\.com)/i;

function normalizeKey(value: string): string {
  return value.toLocaleLowerCase("es-UY").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hasPublicContact(prospect: NormalizedProspectRecord): boolean {
  return Boolean(prospect.phone || prospect.socials.whatsapp || prospect.email || prospect.socials.instagram || prospect.socials.facebook || prospect.socials.linkedin || prospect.socials.other.length > 0);
}

function isStrongCategory(category: string): boolean {
  return /odont|dental|estetica|spa|clinica|inmobiliaria|construct|arquitect|interior|abog|contador|gestoria/i.test(normalizeKey(category));
}

function hasOnlySocialWebsite(website?: string): boolean {
  return Boolean(website && SOCIAL_OR_BOOKING_DOMAINS.test(website));
}

export function buildGapSignals(prospect: NormalizedProspectRecord, health?: WebsiteHealthResult): string[] {
  const signals: string[] = [];
  const websiteIsSocial = hasOnlySocialWebsite(prospect.website);

  if (!prospect.website) signals.push("No se detectó website propio en la fuente normalizada");
  if (websiteIsSocial) signals.push("La URL informada parece red social, agenda externa o micrositio, no dominio propio");
  if (prospect.socials.instagram) signals.push("Tiene Instagram como canal comercial visible");
  if (prospect.socials.facebook) signals.push("Tiene Facebook como canal comercial visible");
  if (prospect.socials.whatsapp) signals.push("WhatsApp público disponible");
  if (prospect.phone) signals.push("Teléfono público disponible");
  if (!hasPublicContact(prospect)) signals.push("No se detectó contacto público claro");
  if (isStrongCategory(prospect.category)) signals.push(`Rubro de alto valor o confianza: ${prospect.category}`);
  if (prospect.reviewCount >= 20 || (prospect.rating ?? 0) >= 4.3) signals.push("Demanda/reputación visible en rating o reseñas");

  if (health) {
    if (health.hasHttps === false) signals.push("Website informado sin HTTPS validado");
    if (health.isReachable === false) signals.push("Website informado no resolvió correctamente");
    signals.push(...health.issues);
  }

  if (signals.length === 0 && prospect.website) signals.push("Tiene website informado; revisar calidad manualmente");
  return signals;
}

export function detectDigitalGap(prospect: NormalizedProspectRecord, health?: WebsiteHealthResult): DigitalGapResult {
  const hasContact = hasPublicContact(prospect);
  const hasWebsite = Boolean(prospect.website);
  const socialWebsite = hasOnlySocialWebsite(prospect.website);
  const strongCategory = isStrongCategory(prospect.category);
  const demand = prospect.reviewCount >= 20 || (prospect.rating ?? 0) >= 4.3;
  const signals = buildGapSignals(prospect, health);

  let level: DigitalGapLevel = 1;
  let label = "Web aceptable";
  let summary = "Tiene presencia digital informada, pero requiere revisión de conversión.";
  let confidence = 0.55;

  if (health?.isStrong) {
    level = 0;
    label = "Presencia sólida";
    summary = "Website informado con señales suficientes para no priorizar venta inicial de web básica.";
    confidence = 0.7;
  } else if (!hasWebsite && hasContact && strongCategory && demand) {
    level = 5;
    label = "Sin web + rubro fuerte + demanda";
    summary = "Brecha clara: rubro de alto valor con contacto y señales de demanda, sin website detectado.";
    confidence = 0.82;
  } else if (!hasWebsite && hasContact) {
    level = 4;
    label = "Sin web + contacto";
    summary = "No se detecta website y existe un canal público para validar oportunidad.";
    confidence = 0.76;
  } else if (socialWebsite || (!hasWebsite && (prospect.socials.instagram || prospect.socials.facebook || prospect.socials.other.length > 0))) {
    level = 3;
    label = "Solo redes";
    summary = "La presencia visible depende de redes, agenda externa o micrositio, sin dominio propio claro.";
    confidence = 0.72;
  } else if (hasWebsite && (health?.isReachable === false || health?.hasHttps === false)) {
    level = 2;
    label = "Web débil";
    summary = "Website informado con señales técnicas iniciales de debilidad.";
    confidence = 0.68;
  } else if (hasWebsite) {
    level = 1;
    label = "Web aceptable";
    summary = "Tiene website informado; la brecha requiere auditoría manual antes de priorizar.";
    confidence = 0.58;
  } else {
    level = 2;
    label = "Brecha no validada";
    summary = "No hay website ni contacto suficiente; oportunidad comercial incierta.";
    confidence = 0.42;
  }

  return { level, label, signals, summary, confidence };
}

export function checkWebsiteHealth(url: string): WebsiteHealthResult {
  const hasHttps = /^https:\/\//i.test(url);
  return { hasHttps, issues: hasHttps ? [] : ["URL informada no usa HTTPS"] };
}
