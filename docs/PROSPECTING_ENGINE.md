# Prospecting Engine

## Objetivo

El Prospecting Engine es el módulo encargado de convertir fuentes de datos en leads priorizados, explicables y accionables.

Debe responder:

> ¿Qué negocios vale la pena contactar hoy, por qué y con qué argumento?

## Input esperado

La corrida debe aceptar:

```ts
type ProspectingRunInput = {
  country?: string;
  city?: string;
  neighborhood?: string;
  category?: string;
  categories?: string[];
  radiusKm?: number;
  centerLat?: number;
  centerLng?: number;
  provider?: string;
  inputFile?: string;
  limit?: number;
  minPriority?: "A" | "B" | "C" | "D";
  requireContact?: boolean;
  onlyDigitalGap?: boolean;
};
```

Ejemplos:

```bash
npm run prospect:run -- --input ./data/uy-pois.csv --city Montevideo --category odontologia --limit 50
npm run prospect:run -- --input ./data/pois.json --country UY --category estetica --min-priority B
npm run prospect:montevideo -- --category inmobiliaria
```

## Output esperado

El motor debe producir:

1. JSON compatible con Lead Radar.
2. CSV para revisión manual.
3. Reporte de corrida.

Ejemplo de archivos:

```txt
exports/prospects-2026-06-18.json
exports/prospects-2026-06-18.csv
exports/prospects-2026-06-18.report.md
```

## Flujo interno

```txt
1. Leer fuente
2. Filtrar por país/ciudad/rubro
3. Normalizar
4. Deduplicar
5. Validar contacto
6. Detectar brecha digital
7. Puntuar
8. Aplicar reglas duras
9. Generar argumento comercial
10. Exportar
```

## RawProspect

Dato crudo del provider.

```ts
type RawProspect = {
  source: string;
  sourceId?: string;
  name?: string;
  category?: string;
  categories?: string[];
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  email?: string;
  website?: string;
  socials?: string[];
  rating?: number;
  reviewCount?: number;
  operatingStatus?: string;
  raw?: unknown;
};
```

## NormalizedProspect

Formato intermedio limpio.

```ts
type NormalizedProspect = {
  name: string;
  normalizedName: string;
  category: string;
  categoryTier: 1 | 2 | 3 | 4;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  socials: string[];
  rating?: number;
  reviewCount?: number;
  source: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceCheckedAt: string;
  confidence: number;
};
```

## ProspectedLead

Formato final enriquecido.

```ts
type ProspectedLead = NormalizedProspect & {
  digitalGapLevel: 0 | 1 | 2 | 3 | 4 | 5;
  gapSignals: string[];
  score: number;
  priority: "A" | "B" | "C" | "D";
  scoreReasons: string[];
  salesAngle: string;
  callOpening: string;
  objectionHint: string;
  nextAction: "call_today" | "dm_or_whatsapp" | "follow_up" | "disqualify";
};
```

## Conversión a Lead existente

El export final debe poder mapear a `Lead` actual:

| ProspectedLead | Lead actual |
|---|---|
| `name` | `businessName` |
| `category` | `category` |
| `city`/`neighborhood` | `location` |
| `address` | `address` |
| `rating` | `rating` |
| `reviewCount` | `reviewCount` |
| `website` | `websiteUrl` |
| `instagram` | `instagram` |
| `whatsapp` | `whatsapp` |
| `phone` | `phone` |
| `priority` | calculado por score |
| `nextAction` | `nextAction` |
| `salesAngle`/signals | `notes` o campos nuevos futuros |

## Provider mock

El mock actual debe conservarse, pero encapsulado.

Objetivo:

```txt
src/lib/prospecting/providers/mock.ts
```

No debe quedar lógica mock dispersa en `page.tsx`.

## Provider CSV/JSON

Debe ser el primer provider real.

Ventajas:

- No agrega dependencias.
- Permite probar rápido.
- Usa datos exportados/preparados manualmente.
- Evita trabarse con GeoParquet al inicio.

## Reglas de deduplicación

Comparar:

- nombre normalizado;
- dirección;
- teléfono;
- website;
- coordenadas próximas;
- redes.

Si dos fuentes coinciden, aumentar confianza en vez de crear duplicado.

## Reglas de exportación

- No exportar leads D por defecto salvo `--include-low-priority`.
- No exportar leads sin nombre.
- No marcar A sin contacto.
- Incluir fuente y fecha.
- Incluir motivo de score.
- Incluir brecha digital.

## Reporte de corrida

El `.report.md` debe incluir:

```txt
Fecha
Input
Provider
Registros leídos
Registros descartados
Duplicados fusionados
Leads A/B/C/D
Top categorías
Top zonas
Advertencias
```

## Criterios de aceptación del motor

- Puede correr con CSV/JSON local.
- Exporta JSON importable por Lead Radar.
- Exporta CSV legible.
- Deduplica duplicados obvios.
- Ningún lead A carece de contacto.
- Cada lead A/B tiene `scoreReasons` y `gapSignals`.
- No requiere API paga.
- No modifica UI en la primera fase.

## Fase 3 — CLI local CSV/JSON

La Fase 3 agrega un primer motor local ejecutable sin APIs reales ni scraping. El comando disponible es:

```bash
npm run prospect:run -- --input samples/prospects-sample.csv --format csv --country UY --city Montevideo --category cafe --limit 10 --out exports/demo
```

Decisiones de implementación:

- El runner vive en `scripts/prospect.ts` para mantenerlo separado de la UI.
- El proyecto no declara `tsx`; como alternativa mínima se usa el binario `jiti` ya presente en `node_modules/.bin` por la toolchain instalada.
- La entrada inicial soporta CSV simple y JSON con array raíz, `{ "records": [] }` o `{ "items": [] }`.
- El filtro inicial compara país, ciudad y rubro con matching case-insensitive y tolerante a tildes.
- La salida siempre genera dos archivos dentro del directorio indicado por `--out`:
  - `lead-radar-prospects.json`: array de `Lead` compatible con la importación actual de Lead Radar.
  - `lead-radar-prospects.csv`: CSV de revisión manual con datos y razones principales.
- Los leads generados incluyen `source`, `sourceId`, `sourceCheckedAt`, `confidence`, `gapSignals`, `scoreReasons`, `salesAngle`, `callOpening`, `objectionHint` y `nextAction` para conservar trazabilidad y explicación comercial.
- El motor no conecta APIs reales, no scrapea sitios y marca `doNotCallChecked: false` para obligar a validación manual antes de campañas telefónicas.

Alcance pendiente para fases posteriores:

- Deduplicación entre archivos y leads existentes.
- Reporte `.report.md` de corrida.
- Scoring más fino como función pura reutilizable.
- Providers específicos para Overture/Foursquare/OSM.

## Fase 4: normalización y deduplicación implementadas

La Fase 4 agrega dos módulos puros en `src/lib/prospecting/`:

- `normalize.ts`: convierte registros crudos CSV/JSON o de providers en `NormalizedProspectRecord` con nombre, categoría, ubicación, contacto, website, redes, coordenadas y fuente en formato consistente.
- `dedupe.ts`: compara prospectos normalizados y fusiona duplicados por identificadores fuertes o coincidencias suficientemente confiables.

### Normalización aplicada

- Nombres: trim, colapso de espacios, remoción de caracteres decorativos y generación de `normalizedName` sin acentos para matching.
- Categorías: mapeo inicial a rubros comerciales (`Odontología`, `Estética premium`, `Inmobiliaria`, `Restaurante`, `Hotel/Alojamiento`) y fallback title case.
- Ubicación: país, ciudad, barrio/localidad y dirección se conservan por separado cuando existen.
- Teléfonos: se eliminan separadores visuales para producir formato consistente y una clave interna de dedupe.
- Emails: se guardan en minúsculas solo si tienen forma válida.
- Websites: se agrega protocolo si falta, se normaliza host sin `www`, se eliminan query/hash y trailing slash.
- Redes: se separan Instagram, Facebook, LinkedIn, WhatsApp y otras URLs sociales.
- Coordenadas: se aceptan `lat/lng`, `latitude/longitude` y `lon`; se parsean números con coma o punto decimal.
- Fuente: cada prospecto conserva fuente, URL de fuente y fecha de chequeo.

### Deduplicación aplicada

Dos registros se consideran duplicados si cumplen alguno de estos criterios:

1. Mismo teléfono normalizado.
2. Mismo website normalizado.
3. Mismo nombre normalizado y misma dirección normalizada.
4. Coordenadas a menos de 75 metros y además coincidencia por nombre, dirección o identificador fuerte.

Cuando dos registros se fusionan, se conserva el primer registro como base y se completan campos faltantes con el duplicado. Si dos fuentes coinciden, el campo `source` queda combinado para mantener trazabilidad.

### Integración CLI

`scripts/prospect.ts` ahora ejecuta el flujo `leer → filtrar → normalizar → deduplicar → limitar → exportar`. El resumen del CLI informa cuántos registros fueron leídos, filtrados, normalizados, deduplicados y exportados.

## Fase 6: Sales angle generator

La Fase 6 mueve la generación de argumento comercial a `src/lib/prospecting/sales-angle.ts`. El módulo expone funciones puras para clasificar rubro y generar `salesAngle`, `callOpening`, `objectionHint` y `nextAction` desde un `NormalizedProspectRecord`, el resultado de brecha digital y la prioridad calculada.

La integración queda en dos puntos:

- `calculateProspectFitScore` usa el generador para que todo prospecto puntuado tenga pitch determinístico.
- El CLI `npm run prospect:run` y los imports CSV/JSON que no traen pitch propio completan los campos comerciales usando el mismo scoring/generador.

Esto mantiene compatibilidad: si un archivo importado ya trae `salesAngle`, `callOpening` u `objectionHint`, esos textos se preservan.
