export type OsmTag = { key: string; value: string };

export const osmIcpTags = {
  odontologia: [{ key: "amenity", value: "dentist" }, { key: "healthcare", value: "dentist" }],
  estetica: [{ key: "shop", value: "beauty" }, { key: "shop", value: "cosmetics" }, { key: "leisure", value: "spa" }],
  veterinaria: [{ key: "amenity", value: "veterinary" }, { key: "healthcare", value: "veterinary" }],
  barberia: [{ key: "shop", value: "hairdresser" }],
  peluqueria: [{ key: "shop", value: "hairdresser" }],
  inmobiliaria: [{ key: "office", value: "estate_agent" }],
  abogados: [{ key: "office", value: "lawyer" }],
  contadores: [{ key: "office", value: "accountant" }],
  gestorias: [{ key: "office", value: "accountant" }],
  gimnasios: [{ key: "leisure", value: "fitness_centre" }],
  pilates: [{ key: "leisure", value: "fitness_centre" }],
  yoga: [{ key: "leisure", value: "fitness_centre" }, { key: "sport", value: "yoga" }],
  gastronomia: [{ key: "amenity", value: "cafe" }, { key: "amenity", value: "restaurant" }],
  cafes: [{ key: "amenity", value: "cafe" }],
  restaurantes: [{ key: "amenity", value: "restaurant" }],
} as const satisfies Record<string, OsmTag[]>;
