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

| ProspectedLead        | Lead actual                     |
| --------------------- | ------------------------------- |
| `name`                | `businessName`                  |
| `category`            | `category`                      |
| `city`/`neighborhood` | `location`                      |
| `address`             | `address`                       |
| `rating`              | `rating`                        |
| `reviewCount`         | `reviewCount`                   |
| `website`             | `websiteUrl`                    |
| `instagram`           | `instagram`                     |
| `whatsapp`            | `whatsapp`                      |
| `phone`               | `phone`                         |
| `priority`            | calculado por score             |
| `nextAction`          | `nextAction`                    |
| `salesAngle`/signals  | `notes` o campos nuevos futuros |

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

## Fase 7: integración UI en `/prospecting`

La pantalla `/prospecting` mantiene el provider mock para demo/testing y suma una vía local-first para revisar resultados reales: importación manual del JSON generado por `npm run prospect:run`.

Decisión de arquitectura:

- El frontend no intenta leer rutas del filesystem del runner, porque el navegador no tiene acceso directo a archivos locales arbitrarios.
- El usuario carga manualmente `lead-radar-prospects.json` desde la UI.
- El JSON esperado sigue siendo compatible con la salida actual del CLI: una lista de `Lead`/`LeadFormValues` enriquecidos con `priority`, `scoreReasons`, `gapSignals`, `salesAngle`, `callOpening`, `objectionHint` y `nextAction`.
- La UI transforma esos registros en candidatos revisables antes de guardarlos como leads persistidos en `localStorage`.
- La deduplicación reutiliza la clave actual basada en nombre y dirección/ubicación para evitar guardar leads ya existentes o repetidos dentro del lote importado.

Esta fase no introduce scraping, APIs pagas ni lectura automática de directorios; solo conecta el motor local/importado con revisión humana en la pantalla de prospección.

## Fase 10 — providers reales desde archivos abiertos locales

La Fase 10 agrega providers para archivos locales de fuentes abiertas, manteniendo el enfoque local-first y evitando que la app descargue datos automáticamente. El flujo queda:

1. Una persona descarga o convierte datos desde una fuente permitida fuera de Lead Radar.
2. El CLI recibe `--input`, `--format csv|json` y `--provider generic|overture|foursquare|osm`.
3. El provider seleccionado mapea los campos propios de la fuente a `RawProspect`.
4. El pipeline existente normaliza, filtra, deduplica, puntúa, explica la prioridad y exporta JSON/CSV.

Comandos de ejemplo:

```bash
npm run prospect:run -- --provider overture --input data/overture-places.csv --format csv --out exports --country UY --city Montevideo --limit 50
npm run prospect:run -- --provider foursquare --input data/foursquare-os-places.json --format json --out exports --category restaurant
npm run prospect:run -- --provider osm --input data/osm-overpass.json --format json --out exports --city Montevideo
```

Los providers agregados son:

- `src/lib/prospecting/providers/overture-file-provider.ts`
- `src/lib/prospecting/providers/foursquare-file-provider.ts`
- `src/lib/prospecting/providers/osm-file-provider.ts`

Ninguno hace scraping, crawling ni consultas remotas. Todos trabajan sobre archivos locales ya disponibles. Como Overture, Foursquare OS Places y OSM pueden traer campos incompletos, el motor debe aceptar rating, reseñas, teléfono, website y redes como opcionales, reduciendo confianza cuando falten señales críticas en lugar de descartar automáticamente todos los registros.

## Fase 12 — agenda local programada

La Fase 12 agrega una automatización local y programada para generar prospectos recurrentes por rubro/zona sin convertir Lead Radar en una herramienta de contacto automático.

Comando principal:

```bash
npm run prospect:schedule
```

Configuración principal:

```txt
prospecting.config.json
```

Decisiones de implementación:

- La agenda vive en `prospecting.config.json` para que Diego pueda editar jobs sin tocar código.
- Cada job define `day`, `label`, `category`, zona (`city`/`country`), archivo local de entrada, formato, provider y límite.
- La agenda incluida contempla lunes estética premium Montevideo, martes odontología Montevideo, miércoles inmobiliarias, jueves veterinarias y viernes barberías premium.
- Por defecto se ejecutan únicamente los jobs del día local detectado por Node. Para revisión manual o demos se puede usar `npm run prospect:schedule -- --all` o `--day monday`.
- Cada job exporta en un subdirectorio ordenado por fecha, día, rubro y zona dentro de `exports/prospecting-schedule/`.
- Cada subdirectorio contiene JSON importable, CSV de revisión y `lead-radar-prospects.report.md` con encontrados, descartados, duplicados, prioridades A/B/C/D y rutas exportadas.
- La implementación reutiliza el pipeline local existente (`leer → filtrar → normalizar → deduplicar → puntuar → exportar`) y no llama APIs pagas automáticamente.
- La corrida no envía mensajes, no automatiza contacto y deja `doNotCallChecked: false` para mantener revisión humana y compliance antes de llamar.

Ejemplos:

```bash
npm run prospect:schedule
npm run prospect:schedule -- --day tuesday
npm run prospect:schedule -- --all
npm run prospect:schedule -- --config prospecting.config.json
```

## Fase 13 — Prospecting Job Runner UI

La pantalla `/prospecting` puede ejecutar jobs de prospección registrados sin exponer una consola ni aceptar comandos arbitrarios desde el navegador. La UI carga la allowlist desde el registro interno derivado de `prospecting.config.json` y la API local `POST /api/prospecting/jobs/run` acepta únicamente `jobId`.

Cada job registrado define metadatos operativos (`id`, `label`, `description`, `country`, `city`, `categories`, `sources`, `limit`, `minPriority`, `outputName`) y se transforma en opciones del runner local. La ejecución reutiliza el mismo pipeline del CLI: lectura de fuente local permitida, normalización, deduplicación, scoring, generación de razones, señales de brecha, ángulo comercial, apertura de llamada y próxima acción.

La implementación está pensada para funcionamiento local con Node (`runtime = "nodejs"`) porque escribe archivos en `exports/`. En entornos serverless/Vercel la escritura persistente de archivos puede no estar disponible; en ese caso el flujo recomendado sigue siendo local-first o exportar los resultados a almacenamiento explícito antes de usarlos en UI.

## Fase 14 — Capa de adquisición

Los jobs pueden declarar `sources` para ejecutar múltiples providers en una misma corrida. Cada entrada indica el provider (`id`), archivo local o parámetros de consulta, formato, filtros y límite. Si un job antiguo solo define `provider`, `input` y `format`, se mantiene compatibilidad convirtiéndolo internamente a una source única.

El motor combina los `RawProspect[]` de todas las fuentes y recién después aplica normalización, deduplicación, detección de brecha digital, scoring, argumentos comerciales y exportación. Esta separación evita mezclar extracción con UI, cola de llamadas o scoring.

## Fase 15 — AI Lead Researcher opcional

El AI Lead Researcher es una capa server-only y opcional para enriquecer leads ya seleccionados. No recolecta leads, no reemplaza providers determinísticos y no automatiza contacto. Su uso previsto es manual o por lote limitado sobre leads prioridad A/B para mejorar el contexto comercial antes de una llamada humana.

Configuración local en `.env.local`:

```bash
AI_RESEARCHER_ENABLED=false
OPENAI_API_KEY=
AI_RESEARCHER_PROVIDER=openai
AI_RESEARCHER_MODEL=gpt-4.1-mini
AI_RESEARCHER_MAX_BATCH_SIZE=5
AI_RESEARCHER_TIMEOUT_MS=20000
```

Reglas operativas:

- Si `AI_RESEARCHER_ENABLED` no está activo, la UI informa estado `disabled` y la app sigue funcionando.
- Si está activo pero falta `OPENAI_API_KEY`, la UI informa `missing API key` sin exponer secretos al frontend.
- La API key solo se lee en rutas server-side; el frontend recibe estado, proveedor, modelo y límites, nunca credenciales.
- El lote automático está acotado por `AI_RESEARCHER_MAX_BATCH_SIZE` y solo toma leads A/B ordenados por score.
- La respuesta de IA se guarda como metadatos auditables (`aiResearchedAt`, `aiProvider`, `aiModel`, `evidenceUrls`) y no modifica scoring ni datos primarios del lead.

## Fase 16 — Provider Contract Hardening

Antes de conectar fuentes reales grandes, el contrato entre providers, normalización, dedupe, scoring, import/export, UI, métricas y call queue queda validado con fixtures locales. Los fixtures en `tests/fixtures/` cubren CSV, JSON genérico, Overture-like, Foursquare-like y OSM-like con casos A/B, sin contacto, bajo margen, duplicado y presencia web fuerte.

Los jobs registrados siguen siendo allowlisted: la API recibe únicamente `jobId`, resuelve una definición interna habilitada y ejecuta fuentes locales configuradas, sin aceptar comandos arbitrarios desde la UI. El resumen de corrida expone totales encontrados/leídos, deduplicados, descartados, conteo A/B/C/D, errores y paths exportados.

## Fase 17 — Ejecutar datasets locales Uruguay

### Desde la UI

1. Preparar un CSV local bajo `data/sources/uy/<ciudad>/` usando los templates de `data/sources/uy/montevideo/`.
2. Verificar que el job exista en `prospecting.config.json` y esté `enabled: true`.
3. Abrir `/prospecting`.
4. En **Jobs registrados**, ejecutar el job local, por ejemplo `uy-mvd-odontologia-local`.
5. Revisar el resumen: leídos, filtrados, normalizados, duplicados, exportados y conteo A/B/C/D.
6. Importar los resultados a la tabla de revisión y guardar manualmente solo los leads aprobados.

La UI muestra errores legibles cuando el CSV/JSON no existe o no puede parsearse. No ejecuta comandos arbitrarios: solo envía `jobId` a la API allowlisted.

### Desde CLI

Ejecutar un archivo local directo:

```bash
npm run prospect:run -- --input data/sources/uy/montevideo/odontologia.sample.csv --format csv --provider generic --country UY --city Montevideo --category odontologia --limit 50 --out exports/uy-mvd-odontologia-local
```

Ejecutar la agenda configurada, manteniendo demos y locales habilitados:

```bash
npm run prospect:schedule -- --config prospecting.config.json --all
```

El pipeline aplicado es el mismo en UI y CLI: lectura de archivo local, filtrado por país/ciudad/rubro, normalización, deduplicación, scoring, generación de `scoreReasons`, `gapSignals`, `salesAngle`, `callOpening`, `objectionHint` y `nextAction`, y export JSON/CSV para revisión humana.

### Fuera de alcance en Fase 17

- No hay descarga automática de datasets.
- No se implementa Google Places.
- No se implementa scraping.
- No se automatizan contactos.


## Fase 18 — Multisource Acquisition Engine

- Un job de prospección puede declarar varias `sources` allowlisted y ejecutarlas en una única corrida de adquisición.
- Cada corrida genera un `AcquisitionRun` con resumen global y `AcquisitionSourceSummary` por fuente: registros leídos, aceptados, rechazados, warnings, errores y duración.
- Los errores parciales no destruyen la corrida si al menos una fuente entrega resultados válidos; el resumen conserva el error por fuente y continúa con normalización, dedupe global, scoring y export JSON/CSV.
- La deduplicación sigue siendo global entre fuentes. El merge conserva contacto, website y trazabilidad combinada cuando la lógica existente puede hacerlo; enriquecimiento más avanzado de duplicados queda como fase posterior.
- Google Places, scraping, automatización de mensajes y claves API en cliente siguen fuera de alcance.

## Fase 20 — Overture DuckDB Exporter local-first

La Fase 20 agrega un camino reproducible para preparar datasets Overture antes de correr el motor de prospección:

```txt
Overture GeoParquet → scripts/overture-export.ts → JSON/CSV local → provider overture-file → normalización/dedupe/scoring/export
```

Uso recomendado:

```bash
npx jiti scripts/overture-export.ts --country UY --city Montevideo --zone pocitos --bbox -34.928,-56.166,-34.895,-56.132 --category dentist --out data/sources/uy/montevideo/overture/dentists-pocitos.json --limit 50 --format json
npm run prospect:run -- --jobId overture-mvd-odontologia-pocitos-local
```

Reglas operativas:

- El exporter es CLI/local-first; la UI no descarga datasets ni ejecuta consultas arbitrarias.
- Todo job Overture consume archivos locales con `provider: "overture-file"`.
- Los errores de archivo faltante quedan en el resumen por fuente y usan el mensaje legible del provider local.
- El bbox es obligatorio para evitar corridas nacionales o excesivamente amplias.
- Los outputs de Overture son extractos auditables y deben revisarse manualmente antes de habilitar contacto comercial.

## Fase 22: AI Source Scout y AI Researcher con Responses API

La Fase 22 mantiene el pipeline determinístico como camino principal y agrega una capa opcional server-only con OpenAI Responses API para tareas acotadas:

- `src/lib/prospecting/ai-researcher.ts` usa Responses API con herramienta `web_search` por defecto y fallback compatible a `web_search_preview` si el entorno/proyecto todavía lo requiere.
- `src/lib/prospecting/ai-source-scout.ts` implementa AI Source Scout para descubrir posibles fuentes públicas por país, ciudad, zona y rubro. Devuelve sólo fuentes sugeridas con `sourceName`, `sourceUrl`, `sourceType`, `expectedData`, `trustLevel`, `extractionDifficulty`, `notes` y `evidenceUrls`.
- `POST /api/ai-researcher/source-scout` es server-only y responde `missing_api_key`/`disabled` si falta configuración o si la feature no está habilitada.
- `/prospecting` expone el botón opcional “Buscar fuentes públicas con IA”, muestra advertencias de costo y permite copiar URLs/notas. No dispara extracción automática.

Guardrails obligatorios:

1. AI Source Scout no devuelve leads finales ni negocios inventados.
2. AI Researcher enriquece únicamente leads ya seleccionados A/B desde controles explícitos.
3. No se contactan negocios ni se automatiza scraping.
4. Toda sugerencia debe conservar evidencia URL para auditoría humana.
5. `OPENAI_API_KEY` sólo se lee en rutas/módulos server-side y nunca se envía al frontend.

## Fase 24 — Run History & Review Ops

Las corridas generadas por `prospect:run` y `prospect:schedule` se convierten en una unidad operacional auditable. Cada job allowlisted escribe `run-summary.json` junto al JSON/CSV exportado; la UI lee esos summaries desde `/prospecting/runs` y permite abrir el detalle de una corrida sin ejecutar comandos ni leer paths arbitrarios.

### Run History

- El índice local se construye server-side recorriendo el directorio configurado de exports de prospección y buscando `run-summary.json` por job.
- Cada entrada muestra `runId`, `jobId`, etiqueta del job, fechas, duración, status global, fuentes usadas, registros leídos/exportados/duplicados/descartados, conteo A/B/C/D y cantidad de warnings/errors.
- Los statuses de fuente visibles son `success`, `empty_result`, `timeout` y `request_failed`.
- Una corrida multifuente se marca como `partial_success` cuando al menos una fuente aporta resultados y otra falla por timeout o request failure.

### Review Ops e importación por lote

Desde el detalle de una corrida se muestran resumen global, resumen por fuente, warnings/errors, paths relativos seguros, leads exportados y distribución por prioridad. La revisión permite seleccionar leads individuales, seleccionar/importar solo A/B, importar seleccionados y descartar visualmente leads del lote antes de importarlos.

La importación sigue siendo local-first: el browser escribe en el store local de leads y usa la clave de deduplicación existente por nombre + dirección/ubicación. Al repetir una importación, los leads ya existentes se muestran como `ya existente` o `importado` y se saltan para evitar duplicados accidentales.

### Estado de revisión

Cada corrida puede guardar `review-state.json` en su propia carpeta de export. Este archivo registra ids aprobados, descartados e importados, fecha de revisión y notas opcionales. No contiene secretos ni paths absolutos.

## Fase 25 — Real Data Harvesting V1

El motor puede ejecutar jobs reales allowlisted de OSM Overpass y jobs `multisource-real-local`. La entrada OSM exige `bbox`, tags explícitos, `limit <= 100` y `timeoutMs <= 25000`. Los jobs multifuente pasan por normalize → dedupe → scoring → sales angle → review, y escriben `run-summary.json` con source statuses, warnings y errores por fuente. Los archivos locales faltantes no deben bloquear toda la corrida: quedan auditados en el resumen para que Run History los muestre.

La cache OSM vive en `exports/source-cache/osm-overpass/<cacheKey>/latest.json` con TTL por defecto de 24 horas; `--forceRefresh true` fuerza una llamada nueva.

## Fase 26: calibración de yield

El motor calcula métricas de yield por corrida y fuente: leads con teléfono/email/web/social, leads sin web, contacto disponible, callable leads, callable rate, contactability rate, digital gap rate, priority A/B rate, source failure rate, skipped/invalid sources y `sourceYieldScore`. La UI de Run History y Review Ops muestra estas métricas y permite filtrar/importar `callable A/B`.
