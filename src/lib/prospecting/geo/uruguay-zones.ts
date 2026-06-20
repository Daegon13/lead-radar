export type UruguayZoneId =
  | "montevideo-general"
  | "pocitos-punta-carretas"
  | "cordon-centro"
  | "buceo-malvin"
  | "carrasco"
  | "parque-rodo"
  | "tres-cruces"
  | "mercedes-soriano";

export type BoundingBox = [south: number, west: number, north: number, east: number];

export type UruguayZone = {
  id: UruguayZoneId;
  label: string;
  city: string;
  department: string;
  country: "UY";
  bbox: BoundingBox;
  notes: string;
};

/**
 * Bbox aproximados para jobs focalizados de OSM/Overpass.
 * Son límites operativos y ajustables: deben revisarse con mapa antes de subir límites
 * o usarse para decisiones comerciales sensibles.
 */
export const uruguayZones: Record<UruguayZoneId, UruguayZone> = {
  "montevideo-general": { id: "montevideo-general", label: "Montevideo general", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.936, -56.286, -34.748, -56.029], notes: "BBox amplio aproximado para Montevideo; usar con límites moderados y rubro específico." },
  "pocitos-punta-carretas": { id: "pocitos-punta-carretas", label: "Pocitos / Punta Carretas", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.928, -56.166, -34.895, -56.132], notes: "Zona comercial premium aproximada; ajustar bordes según validación manual." },
  "cordon-centro": { id: "cordon-centro", label: "Cordón / Centro", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.915, -56.203, -34.889, -56.168], notes: "BBox aproximado para Cordón, Centro y eje comercial cercano." },
  "buceo-malvin": { id: "buceo-malvin", label: "Buceo / Malvín", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.909, -56.142, -34.879, -56.086], notes: "BBox aproximado para Buceo y Malvín, enfocado en avenidas y costa." },
  carrasco: { id: "carrasco", label: "Carrasco", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.902, -56.079, -34.858, -56.015], notes: "Zona premium aproximada de Carrasco; no implica cobertura completa." },
  "parque-rodo": { id: "parque-rodo", label: "Parque Rodó", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.92, -56.174, -34.905, -56.154], notes: "BBox pequeño aproximado para consultas puntuales." },
  "tres-cruces": { id: "tres-cruces", label: "Tres Cruces", city: "Montevideo", department: "Montevideo", country: "UY", bbox: [-34.898, -56.176, -34.882, -56.158], notes: "BBox aproximado alrededor de terminal, Bv. Artigas y avenidas cercanas." },
  "mercedes-soriano": { id: "mercedes-soriano", label: "Mercedes / Soriano", city: "Mercedes", department: "Soriano", country: "UY", bbox: [-33.274, -58.06, -33.228, -57.995], notes: "Zona futura aproximada; incluida para expansión fuera de Montevideo sin búsqueda nacional." },
};
