import type { NextAction, Priority } from "@/types/lead";
import type { DigitalGapResult } from "./digital-gap";
import type { NormalizedProspectRecord } from "./normalize";

export type SalesAngleResult = {
  salesAngle: string;
  callOpening: string;
  objectionHint: string;
  nextAction: NextAction;
};

type RubroKey =
  | "estetica"
  | "odontologia"
  | "inmobiliaria"
  | "construccion_arquitectura"
  | "profesionales"
  | "veterinarias"
  | "barberias_premium"
  | "academias"
  | "tatuajes"
  | "gimnasios_boutique"
  | "generico";

type RubroTemplate = {
  label: string;
  valueFocus: string;
  webAsset: string;
  trustNeed: string;
  specificBenefit: string;
};

const TEMPLATES: Record<RubroKey, RubroTemplate> = {
  estetica: {
    label: "centros de estética",
    valueFocus: "tratamientos, fotos, ubicación y WhatsApp",
    webAsset: "una landing visual de tratamientos",
    trustNeed: "la confianza visual pesa mucho antes de consultar",
    specificBenefit: "convertir interés desde redes y Google en consultas más ordenadas por WhatsApp",
  },
  odontologia: {
    label: "clínicas odontológicas",
    valueFocus: "servicios, equipo, ubicación y formas de consulta",
    webAsset: "una web profesional de servicios y equipo",
    trustNeed: "la confianza antes del primer contacto es clave",
    specificBenefit: "explicar tratamientos y reducir fricción para pedir una consulta",
  },
  inmobiliaria: {
    label: "inmobiliarias",
    valueFocus: "propiedades, captación de propietarios y consultas",
    webAsset: "un catálogo propio con formularios y WhatsApp",
    trustNeed: "una sola oportunidad puede justificar una presencia digital más clara",
    specificBenefit: "centralizar consultas de compradores y propietarios sin depender solo de portales o redes",
  },
  construccion_arquitectura: {
    label: "arquitectura, construcción o interiorismo",
    valueFocus: "proyectos, servicios, casos y contacto directo",
    webAsset: "un portfolio propio de proyectos",
    trustNeed: "la confianza visual vende mucho antes de la primera reunión",
    specificBenefit: "mostrar trabajos y filtrar consultas de proyectos con mejor encaje",
  },
  profesionales: {
    label: "servicios profesionales",
    valueFocus: "servicios, especialidades, ubicación y formas de consulta",
    webAsset: "una web sobria de servicios profesionales",
    trustNeed: "la claridad y autoridad ayudan antes del primer contacto",
    specificBenefit: "transmitir confianza y ordenar consultas sin sonar invasivo",
  },
  veterinarias: {
    label: "veterinarias",
    valueFocus: "servicios, horarios, ubicación, urgencias y contacto directo",
    webAsset: "una web local clara de servicios y horarios",
    trustNeed: "las familias con mascotas necesitan encontrar información rápido",
    specificBenefit: "hacer más fácil que los clientes encuentren horarios, servicios y WhatsApp",
  },
  barberias_premium: {
    label: "barberías o peluquerías premium",
    valueFocus: "servicios, fotos, ubicación, reservas y contacto directo",
    webAsset: "una presencia propia conectada a reservas o WhatsApp",
    trustNeed: "la marca visual y la reserva simple influyen mucho",
    specificBenefit: "complementar Instagram o agenda externa con una base propia encontrable en Google",
  },
  academias: {
    label: "academias privadas",
    valueFocus: "cursos, horarios, metodología, ubicación y consultas",
    webAsset: "una web clara de cursos y consultas",
    trustNeed: "familias y alumnos comparan confianza antes de consultar",
    specificBenefit: "convertir búsquedas de cursos en consultas concretas y fáciles de responder",
  },
  tatuajes: {
    label: "estudios de tatuaje",
    valueFocus: "portfolio, estilos, cuidados, ubicación y reservas",
    webAsset: "un portfolio propio conectado a reservas",
    trustNeed: "el portfolio y la higiene/confianza pesan antes de reservar",
    specificBenefit: "ordenar estilos, trabajos y reservas sin depender únicamente de Instagram",
  },
  gimnasios_boutique: {
    label: "gimnasios boutique, pilates o yoga",
    valueFocus: "clases, horarios, propuesta, ubicación y consultas",
    webAsset: "una web de clases, comunidad y contacto",
    trustNeed: "la propuesta diferencial se entiende mejor cuando está ordenada",
    specificBenefit: "convertir búsquedas locales en consultas sobre clases, horarios y planes",
  },
  generico: {
    label: "negocios locales de servicios",
    valueFocus: "servicios, ubicación, confianza y contacto directo",
    webAsset: "una web simple y profesional",
    trustNeed: "la claridad online ayuda antes de escribir o llamar",
    specificBenefit: "ordenar la presencia digital y facilitar consultas desde Google o WhatsApp",
  },
};

function key(value: string): string {
  return value.toLocaleLowerCase("es-UY").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function classifySalesRubro(category: string): RubroKey {
  const c = key(category);
  if (/estetica|spa|belleza|cosmet|depilacion|salon/.test(c)) return "estetica";
  if (/odont|dental|dentista/.test(c)) return "odontologia";
  if (/inmobiliaria|real estate/.test(c)) return "inmobiliaria";
  if (/construct|arquitect|interior|obra|diseno/.test(c)) return "construccion_arquitectura";
  if (/abog|contador|gestoria|escriban|consultor/.test(c)) return "profesionales";
  if (/veterin/.test(c)) return "veterinarias";
  if (/barber|peluquer/.test(c)) return "barberias_premium";
  if (/academ|instituto|curso|idioma|escuela/.test(c)) return "academias";
  if (/tatu|tattoo/.test(c)) return "tatuajes";
  if (/gimnas|fitness|pilates|yoga|box|crossfit/.test(c)) return "gimnasios_boutique";
  return "generico";
}

function zone(prospect: NormalizedProspectRecord): string {
  return prospect.neighborhood ?? prospect.city ?? prospect.address ?? "su zona";
}

function presenceSignal(prospect: NormalizedProspectRecord, gap: DigitalGapResult): string {
  if (prospect.socials.instagram) return "tienen Instagram como canal visible";
  if (prospect.socials.facebook) return "tienen Facebook como canal visible";
  if (prospect.website && gap.level <= 2) return "tienen una web informada que puede revisarse para mejorar conversión";
  if (prospect.phone || prospect.socials.whatsapp) return "hay un canal de contacto público disponible";
  return "aparecen en una fuente pública local";
}

function gapPhrase(gap: DigitalGapResult): string {
  if (gap.level >= 4) return "no encontré una web propia clara para ordenar esa consulta";
  if (gap.level === 3) return "la presencia parece depender de redes, agenda externa o micrositio";
  if (gap.level === 2) return "vi señales de que la web podría estar perdiendo claridad o contacto directo";
  return "podría valer la pena revisar si la web está convirtiendo bien esas consultas";
}

function objectionHint(prospect: NormalizedProspectRecord, gap: DigitalGapResult): string {
  if (prospect.socials.instagram || gap.level === 3) return "Si responden que ya usan Instagram o agenda externa, aclarar que la web no reemplaza esos canales: los ordena y los conecta con búsquedas de Google y WhatsApp.";
  if (prospect.website) return "Si responden que ya tienen web, ofrecer primero una revisión puntual de claridad, servicios, CTA y WhatsApp antes de hablar de rediseño.";
  if (!prospect.phone && !prospect.socials.whatsapp) return "Como el contacto es limitado, priorizar mensaje breve por el canal disponible y validar quién decide antes de proponer una llamada.";
  return "Si dicen que no es prioridad, proponer una versión simple enfocada en servicios, confianza y contacto; no un proyecto grande.";
}

export function generateSalesAngle(prospect: NormalizedProspectRecord, gap: DigitalGapResult, priority: Priority): SalesAngleResult {
  const template = TEMPLATES[classifySalesRubro(prospect.category)];
  const sourceSignal = presenceSignal(prospect, gap);
  const location = zone(prospect);

  const salesAngle = `Proponer ${template.webAsset} para ${template.specificBenefit}. Basar el diagnóstico en señales observadas: ${sourceSignal}, ${gapPhrase(gap)} y ${gap.signals.slice(0, 2).join("; ") || "hay datos públicos para revisar"}.`;

  const callOpening = `Hola, ¿cómo estás? Soy Diego. Estoy relevando ${template.label} en ${location} y me llamó la atención ${prospect.name}: vi que ${sourceSignal}, pero ${gapPhrase(gap)}. En este rubro, ${template.trustNeed}. Trabajo webs simples enfocadas en ${template.valueFocus}. ¿Te puedo comentar en 30 segundos qué vi?`;

  const nextAction: NextAction = priority === "A"
    ? "call_today"
    : priority === "B"
      ? (prospect.phone || prospect.socials.whatsapp ? "call_today" : "dm_or_whatsapp")
      : priority === "C"
        ? "follow_up"
        : "disqualify";

  return {
    salesAngle,
    callOpening,
    objectionHint: objectionHint(prospect, gap),
    nextAction,
  };
}
