export type ProspectingHotspot = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radioDefault: number;
  rubroSugerido?: string;
  enabled: boolean;
  commercialPriority: number;
};

export type ProspectingHotspotToggleConfig = Partial<Record<ProspectingHotspot["id"], boolean>>;

export type ProspectingFormDefaults = {
  lat: string;
  lng: string;
  radio: string;
  rubro: string;
};

export const PROSPECTING_HOTSPOTS: ProspectingHotspot[] = [
  {
    id: "microcentro-caba",
    label: "Microcentro (CABA)",
    lat: -34.6037,
    lng: -58.3816,
    radioDefault: 900,
    rubroSugerido: "Servicios profesionales",
    enabled: true,
    commercialPriority: 1,
  },
  {
    id: "palermo-soho-gastronomico",
    label: "Palermo Soho (Polo gastronómico)",
    lat: -34.5875,
    lng: -58.423,
    radioDefault: 1200,
    rubroSugerido: "Gastronomía",
    enabled: true,
    commercialPriority: 2,
  },
  {
    id: "corredor-cabildo-belgrano",
    label: "Corredor Cabildo (Belgrano)",
    lat: -34.5629,
    lng: -58.4565,
    radioDefault: 1000,
    rubroSugerido: "Retail",
    enabled: true,
    commercialPriority: 3,
  },
  {
    id: "avenida-santa-fe-recoleta",
    label: "Av. Santa Fe (Recoleta)",
    lat: -34.5894,
    lng: -58.3974,
    radioDefault: 950,
    rubroSugerido: "Moda y accesorios",
    enabled: true,
    commercialPriority: 4,
  },
  {
    id: "zona-sur-lanus-centro",
    label: "Lanús Centro (corredor comercial)",
    lat: -34.7036,
    lng: -58.393,
    radioDefault: 1200,
    rubroSugerido: "Comercio de cercanía",
    enabled: false,
    commercialPriority: 5,
  },
];

function applyHotspotConfig(
  hotspots: ProspectingHotspot[],
  config?: ProspectingHotspotToggleConfig,
): ProspectingHotspot[] {
  if (!config) {
    return hotspots;
  }

  return hotspots.map((hotspot) => {
    const enabledOverride = config[hotspot.id];
    if (enabledOverride === undefined) {
      return hotspot;
    }

    return {
      ...hotspot,
      enabled: enabledOverride,
    };
  });
}

export function getEnabledProspectingHotspots(
  config?: ProspectingHotspotToggleConfig,
): ProspectingHotspot[] {
  return applyHotspotConfig(PROSPECTING_HOTSPOTS, config).filter((hotspot) => hotspot.enabled);
}

export function getProspectingHotspotById(
  id: string,
  options?: {
    config?: ProspectingHotspotToggleConfig;
    includeDisabled?: boolean;
  },
): ProspectingHotspot | undefined {
  const hotspots = applyHotspotConfig(PROSPECTING_HOTSPOTS, options?.config);
  const hotspot = hotspots.find((item) => item.id === id);

  if (!hotspot) {
    return undefined;
  }

  if (options?.includeDisabled) {
    return hotspot;
  }

  return hotspot.enabled ? hotspot : undefined;
}

export function getProspectingFormDefaults(
  hotspotId?: string,
  config?: ProspectingHotspotToggleConfig,
): ProspectingFormDefaults {
  if (!hotspotId) {
    return {
      lat: "",
      lng: "",
      radio: "",
      rubro: "",
    };
  }

  const hotspot = getProspectingHotspotById(hotspotId, { config });
  if (!hotspot) {
    return {
      lat: "",
      lng: "",
      radio: "",
      rubro: "",
    };
  }

  return {
    lat: String(hotspot.lat),
    lng: String(hotspot.lng),
    radio: String(hotspot.radioDefault),
    rubro: hotspot.rubroSugerido ?? "",
  };
}
