import type { RawProspect } from "./types";

export type ProspectSocials = {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
  other: string[];
};

export type NormalizedProspectRecord = {
  sourceId?: string;
  name: string;
  normalizedName: string;
  category: string;
  country?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  normalizedAddress?: string;
  phone?: string;
  normalizedPhone?: string;
  email?: string;
  website?: string;
  websiteKey?: string;
  socials: ProspectSocials;
  lat?: number;
  lng?: number;
  rating: number | null;
  reviewCount: number;
  source: string;
  sourceUrl?: string;
  sourceCheckedAt: string;
  confidence?: number;
  raw: RawProspect | Record<string, unknown>;
};

export type NormalizeProspectOptions = {
  defaultSource?: string;
  checkedAt?: string;
};

export function normalizeText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > 0 ? text : undefined;
}

export function normalizeForKey(value: unknown): string {
  return normalizeText(value)?.toLocaleLowerCase("es-UY").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim() ?? "";
}

function titleCase(value: string): string {
  return value.toLocaleLowerCase("es-UY").replace(/\p{L}+/gu, (word) => `${word.charAt(0).toLocaleUpperCase("es-UY")}${word.slice(1)}`);
}

export function normalizeName(value: unknown): string | undefined {
  const text = normalizeText(value)?.replace(/[★☆•|]+/g, "").replace(/\s+-\s+$/g, "").trim();
  return text ? titleCase(text) : undefined;
}

export function normalizeCategory(value: unknown): string {
  const key = normalizeForKey(value);
  if (!key) return "Sin categoría";
  if (/dent|odont|dental/.test(key)) return "Odontología";
  if (/beauty|belleza|estetica|spa|salon/.test(key)) return "Estética premium";
  if (/real estate|inmobiliaria/.test(key)) return "Inmobiliaria";
  if (/restaurant|restaurante|comida|food/.test(key)) return "Restaurante";
  if (/hotel|alojamiento|lodging/.test(key)) return "Hotel/Alojamiento";
  return titleCase(key);
}

export function normalizePhone(value: unknown): { display?: string; key?: string } {
  const text = normalizeText(value);
  if (!text) return {};
  const hasPlus = text.trim().startsWith("+");
  const digits = text.replace(/\D/g, "");
  if (digits.length < 6) return { display: text };
  return { display: `${hasPlus ? "+" : ""}${digits}`, key: digits };
}

export function normalizeEmail(value: unknown): string | undefined {
  const text = normalizeText(value)?.toLocaleLowerCase("es-UY");
  return text && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : undefined;
}

export function normalizeWebsite(value: unknown): { display?: string; key?: string } {
  const text = normalizeText(value);
  if (!text) return {};
  if (/^(mailto:|tel:)/i.test(text)) return {};
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;

  try {
    const url = new URL(withProtocol);
    url.hash = "";
    url.search = "";
    url.hostname = url.hostname.toLocaleLowerCase("es-UY").replace(/^www\./, "");
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
    const display = `${url.protocol}//${url.hostname}${pathname}`;
    return { display, key: `${url.hostname}${pathname}`.toLocaleLowerCase("es-UY") };
  } catch {
    return {};
  }
}

function normalizeCoordinate(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSocialUrl(value: unknown): string | undefined {
  return normalizeWebsite(value).display ?? normalizeText(value);
}

function compactSocials(raw: RawProspect | Record<string, unknown>): ProspectSocials {
  const socials: ProspectSocials = { other: [] };
  const read = (key: string) => (raw as Record<string, unknown>)[key];
  socials.instagram = normalizeSocialUrl(read("instagram"));
  socials.facebook = normalizeSocialUrl(read("facebook"));
  socials.linkedin = normalizeSocialUrl(read("linkedin"));
  socials.whatsapp = normalizePhone(read("whatsapp")).display;

  const rawSocials = read("socials");
  if (Array.isArray(rawSocials)) {
    for (const social of rawSocials) {
      const normalized = normalizeSocialUrl(social);
      if (normalized) socials.other.push(normalized);
    }
  }

  return socials;
}

export function normalizeProspect(raw: RawProspect | Record<string, unknown>, options: NormalizeProspectOptions = {}): NormalizedProspectRecord | null {
  const record = raw as Record<string, unknown>;
  const name = normalizeName(record.name ?? record.businessName ?? record.nombre ?? record.business);
  if (!name) return null;

  const phone = normalizePhone(record.phone ?? record.telefono ?? record["contact:phone"]);
  const website = normalizeWebsite(record.website ?? record.websiteUrl ?? record.sitioWeb ?? record.url);
  const address = normalizeText(record.address ?? record.direccion ?? record["addr:full"] ?? record["addr:street"]);
  const city = normalizeText(record.city ?? record.location ?? record.localidad ?? record["addr:city"] ?? record.town);
  const country = normalizeText(record.country ?? record.pais ?? record["addr:country"]);
  const neighborhood = normalizeText(record.neighborhood ?? record.barrio ?? record.vicinity ?? record.locality);
  const rating = normalizeCoordinate(record.rating);
  const reviewCount = normalizeCoordinate(record.reviewCount ?? record.reviews ?? record.review_count);

  return {
    sourceId: normalizeText(record.id ?? record.sourceId ?? record.externalId ?? record.providerId ?? record.osm_id),
    name,
    normalizedName: normalizeForKey(name),
    category: normalizeCategory(record.category ?? record.rubro ?? record.type ?? record.amenity),
    country,
    city,
    neighborhood,
    address,
    normalizedAddress: normalizeForKey([address, neighborhood, city, country].filter(Boolean).join(" ")),
    phone: phone.display,
    normalizedPhone: phone.key,
    email: normalizeEmail(record.email ?? record.mail ?? record["contact:email"]),
    website: website.display,
    websiteKey: website.key,
    socials: compactSocials(record),
    lat: normalizeCoordinate(record.lat ?? record.latitude),
    lng: normalizeCoordinate(record.lng ?? record.lon ?? record.longitude),
    rating: rating === undefined ? null : Math.max(0, Math.min(5, rating)),
    reviewCount: Math.max(0, Math.floor(reviewCount ?? 0)),
    source: normalizeText(record.source ?? record.fuente) ?? options.defaultSource ?? "Archivo local",
    sourceUrl: normalizeWebsite(record.sourceUrl ?? record.urlFuente).display,
    sourceCheckedAt: normalizeText(record.sourceCheckedAt) ?? options.checkedAt ?? new Date().toISOString(),
    confidence: normalizeCoordinate(record.confidence),
    raw,
  };
}

export function normalizeProspects(rawProspects: Array<RawProspect | Record<string, unknown>>, options: NormalizeProspectOptions = {}): NormalizedProspectRecord[] {
  return rawProspects.map((raw) => normalizeProspect(raw, options)).filter((prospect): prospect is NormalizedProspectRecord => prospect !== null);
}
