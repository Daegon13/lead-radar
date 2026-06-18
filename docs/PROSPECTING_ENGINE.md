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
