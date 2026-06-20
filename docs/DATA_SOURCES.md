# Data Sources

## Objetivo

Este documento define fuentes de datos posibles para el motor de prospección. La estrategia es empezar con fuentes libres o archivos locales y dejar APIs pagas como enriquecimiento futuro.

Principio:

> No diseñar el MVP dependiendo exclusivamente de Google Places.

## Estrategia general

Flujo recomendado:

```txt
Fuentes → Ingesta → Normalización → Deduplicación → Brecha digital → Scoring → Export → Lead Radar
```

El sistema debe aceptar datos incompletos. No todas las fuentes traen teléfono, rating, reseñas o WhatsApp.

## Fuente 1 — Overture Places

### Qué aporta

- Lugares/POIs a escala global.
- Categorías.
- Ubicación.
- Direcciones cuando están disponibles.
- Websites o redes en algunos casos.
- Datos pensados para uso abierto.

### Campos esperables

- Nombre.
- Categoría.
- Coordenadas.
- País/región/localidad.
- Dirección.
- Website/socials si existen en el dataset.
- Identificador de fuente.

### Ventajas

- Buena base para descubrimiento masivo.
- No depende de Google.
- Útil para filtrar por país, ciudad y categoría.
- Encaja con un motor local/CLI.

### Limitaciones

- Puede no traer teléfono.
- Puede no traer rating/reseñas.
- Puede requerir trabajar con archivos grandes.
- Puede requerir conversión desde GeoParquet o procesamiento previo.

### Uso recomendado

Fase 2/3. Comenzar con extractos convertidos a CSV/JSON antes de procesar GeoParquet directamente.

## Fuente 2 — Foursquare OS Places

### Qué aporta

- POIs abiertos.
- Nombre.
- Coordenadas.
- Dirección/localidad/región/país.
- Categorías.
- Fechas de creación/refresco según schema.

### Ventajas

- Buena fuente complementaria.
- Útil para cruzar datos y aumentar confianza.
- Sirve para detectar negocios que aparecen en más de una fuente.

### Limitaciones

- Datos comerciales avanzados pueden ser limitados.
- Puede requerir procesamiento local de datasets.
- No asumir teléfono, rating o reseñas completos.

### Uso recomendado

Fase 3/4 como provider adicional o fuente de deduplicación/confianza.

## Fuente 3 — OpenStreetMap / Overpass

### Qué aporta

- POIs mantenidos por comunidad.
- Etiquetas como `shop`, `amenity`, `office`, `healthcare`, `craft`.
- Dirección, website, phone, opening_hours cuando están cargados.
- Coordenadas.

### Ventajas

- Muy útil para búsquedas locales y rubros concretos.
- Puede traer website/teléfono en algunos casos.
- Fuente abierta.

### Limitaciones

- Cobertura variable por zona.
- Etiquetado no siempre consistente.
- No usar servicios públicos para scraping pesado.
- Overpass requiere consultas cuidadosas y límites.

### Uso recomendado

Fase 3/4 para consultas por rubro/zona y enriquecimiento puntual.

## Fuente 4 — CSV/JSON manual

### Qué aporta

- Control total.
- Rápido para MVP.
- Permite importar datos de cualquier origen lícito.
- Evita complejidad inicial de APIs/datasets pesados.

### Ventajas

- Ideal para validar scoring y pipeline.
- No requiere dependencias nuevas.
- Permite generar muestras manuales.
- Compatible con el flujo actual de import/export.

### Limitaciones

- No automatiza descubrimiento por sí solo.
- Depende de preparación previa.

### Uso recomendado

Fase 1/2. Debe ser el primer provider real después del mock.

## Fuente 5 — Google Places API opcional

### Qué aporta

- Rating.
- Reseñas o resumen de reseñas según endpoint/campos.
- Teléfono.
- Website.
- Horarios.
- Dirección.
- Categorías.
- Estado operativo.

### Ventajas

- Datos comerciales de alta utilidad.
- Muy bueno para validación/enriquecimiento.
- Puede mejorar contactabilidad y demanda visible.

### Limitaciones

- Es pago o sujeto a billing/cuotas.
- Tiene términos de uso estrictos.
- No debe ser dependencia central del MVP.
- Requiere manejo seguro de API keys.

### Uso recomendado

Fase 9. Enriquecimiento opcional para leads ya filtrados, no búsqueda masiva inicial.

## Fuente 6 — Verificador web propio

No es una fuente de leads, pero sí de señales.

### Qué chequea

- Si la URL responde.
- HTTP status.
- HTTPS.
- Title.
- Meta description.
- Presencia de WhatsApp/teléfono.
- Texto de ciudad/rubro.
- Señales de web abandonada.

### Ventajas

- Mejora la detección de brecha digital.
- Puede generar argumentos de venta concretos.

### Limitaciones

- Debe respetar robots/rate limits.
- No debe convertirse en crawler agresivo.
- Debe consultar pocas URLs por corrida.

## Matriz de fuentes

| Fuente | Libre | Teléfono | Rating/reseñas | Website | Ideal para MVP |
|---|---|---:|---:|---:|---:|
| CSV/JSON | Sí | Depende | Depende | Depende | Sí |
| Overture Places | Sí | Variable | No asumir | Variable | Sí, con extractos |
| Foursquare OS Places | Sí | Variable | No asumir | Variable | Sí, con extractos |
| OSM/Overpass | Sí | Variable | No | Variable | Sí, puntual |
| Google Places API | No/mixta | Sí | Sí | Sí | No inicial |
| Verificador web | Propio | Detectable | No | Sí | Sí, después |

## Campos mínimos para un lead útil

Mínimo absoluto:

- `businessName`
- `category`
- `location` o coordenadas
- `source`
- al menos un contacto o canal público para ser A/B

Mínimo para prioridad alta:

- nombre;
- rubro ICP;
- ubicación;
- teléfono/WhatsApp/red;
- brecha digital;
- fuente;
- razón comercial.

## Diseño de providers

Interfaz sugerida:

```ts
type ProspectingProvider = {
  id: string;
  label: string;
  run(input: ProspectingRunInput): Promise<RawProspect[]>;
};
```

Providers iniciales:

```txt
mockProspectingProvider
csvProspectingProvider
jsonProspectingProvider
overtureCsvProvider
foursquareCsvProvider
osmOverpassProvider
```

## Política de datos incompletos

- No descartar automáticamente por falta de rating.
- No subir a A si falta contacto.
- No afirmar “no tiene web”; usar “no se detectó web”.
- Guardar `confidence`.
- Guardar `sourceCheckedAt`.
- Permitir revisión manual.

### Estado Fase 3

CSV/JSON manual ya cuenta con un runner local mínimo mediante `npm run prospect:run`. El flujo está pensado para archivos preparados o extractos lícitos de fuentes abiertas; no ejecuta scraping ni consume APIs reales.

Campos aceptados inicialmente por alias:

- Nombre: `businessName`, `name`, `business`, `nombre`.
- Rubro: `category`, `rubro`, `type`, `amenity`.
- País: `country`, `pais`, `addr:country`.
- Ciudad: `city`, `location`, `localidad`, `addr:city`, `town`.
- Contacto/presencia: `website`, `websiteUrl`, `instagram`, `whatsapp`, `phone`, `telefono`.
- Trazabilidad: `id`, `sourceId`, `externalId`, `providerId`, `source`, `sourceUrl`.

Los datos incompletos siguen siendo válidos, pero reducen la confianza y dejan la próxima acción como seguimiento o revisión manual cuando no hay contacto público.

## Fase 10 — providers de archivos locales de datos abiertos

La primera integración con fuentes abiertas reales se hace sin llamadas online desde la app. Lead Radar espera archivos locales previamente descargados y, si hace falta, convertidos por una persona fuera del producto. El CLI puede leerlos con `--provider overture`, `--provider foursquare` u `--provider osm`, y cada provider mapea el archivo a `RawProspect` para reutilizar el pipeline común de normalización, deduplicación, scoring y exportación.

Providers iniciales:

- `overture-file`: lee exportaciones locales de Overture Places en JSON/CSV y toma, cuando existen, identificador, nombre principal, categoría primaria, dirección, ciudad, país, coordenadas, teléfono, email y website.
- `foursquare-file`: lee exportaciones locales de Foursquare OS Places en JSON/CSV y toma, cuando existen, `fsq_place_id`, nombre, categoría, ubicación, coordenadas, teléfono y website.
- `osm-file`: lee archivos locales JSON/CSV derivados de OpenStreetMap/Overpass y soporta tags habituales como `name`, `amenity`, `shop`, `tourism`, `addr:*`, `phone`, `contact:phone`, `website` y `contact:website`.

Limitaciones esperadas de estas fuentes libres:

- No siempre hay teléfono público.
- No siempre hay rating ni cantidad de reseñas.
- No siempre hay website.
- No siempre hay redes sociales.
- Las categorías pueden venir como taxonomías técnicas, tags libres o texto poco homogéneo.
- La presencia de cadenas/franquicias puede requerir revisión manual antes de asignar prioridad alta.

Estas integraciones no reemplazan el juicio comercial: aumentan trazabilidad y volumen inicial, pero la prioridad sigue dependiendo de contactabilidad, brecha digital y explicación del score.

## Fase 14 — Data Acquisition Layer multifuente

Lead Radar separa la adquisición de datos del resto del pipeline. Las fuentes implementan una interfaz común (`DataSourceProvider`) y siempre devuelven `RawProspect[]`; ninguna fuente crea leads finales ni ejecuta scoring. El flujo formal queda: provider → normalize → dedupe → gap detection → scoring → sales angle → export/call queue.

Fuentes disponibles en esta fase:

- `csv-local`: archivo CSV manual/local.
- `json-local`: archivo JSON manual/local.
- `overture-file`: export local de Overture Places; también es el punto de integración previsto para consultas DuckDB que materialicen un archivo local.
- `foursquare-file`: export local de Foursquare OS Places.
- `osm-file`: export local de OpenStreetMap.
- `osm-overpass`: provider opcional para consultas focalizadas a Overpass con `bbox`, timeout y límite conservador.

Los resultados deben preservar trazabilidad con `source`, `sourceId`, `sourceUrl`, `sourceCheckedAt` y `confidence` cuando la fuente lo provea o el mapeo pueda inferirlo. Google Places queda documentado como integración futura/opcional y no es dependencia del MVP. AI Enricher queda fuera de fuentes primarias: podrá enriquecer prospectos ya adquiridos, sin reemplazar trazabilidad de origen.

Overpass solo debe usarse con consultas acotadas por `bbox` o query explícita revisada manualmente, límite máximo conservador y timeout. No debe usarse para búsquedas masivas, scraping agresivo ni evasión de rate limits.

## Fase 17 — Data Intake Real Uruguay mediante archivos locales

Lead Radar puede recibir datasets reales locales sin descargas automáticas, scraping ni Google Places. La estructura recomendada es:

```text
data/sources/uy/
  README.md
  montevideo/
    estetica-premium.sample.csv
    odontologia.sample.csv
    inmobiliarias.sample.csv
    veterinarias.sample.csv
    barberias-premium.sample.csv
  mercedes/
    .gitkeep
```

Los archivos `.sample.csv` son templates seguros. Para operar con datos reales, copiar un template a un archivo sin `.sample`, por ejemplo `data/sources/uy/montevideo/odontologia.csv`, completar únicamente datos comerciales públicos y trazables, y apuntar un job local a ese path.

### Columnas esperadas para CSV local

Columnas mínimas recomendadas:

- `id`: identificador estable de la fuente o del archivo manual.
- `name`: nombre comercial público.
- `category`: rubro normalizado (`estetica`, `odontologia`, `inmobiliaria`, `veterinaria`, `barberia`, etc.).
- `country`: código país, por ejemplo `UY`.
- `city`: ciudad, por ejemplo `Montevideo`.
- `address`: dirección comercial pública, si existe.
- `website`: sitio web público, si existe.
- `instagram`: usuario o URL pública, si existe.
- `whatsapp`: WhatsApp comercial público, si existe.
- `phone`: teléfono comercial público, si existe.
- `rating` y `reviews`: métricas públicas opcionales si la fuente permite reutilizarlas.
- `source`: nombre de la fuente o método manual.
- `sourceUrl`: URL pública trazable de la fuente, si existe.

Ejemplo:

```csv
id,name,category,country,city,address,website,instagram,whatsapp,phone,rating,reviews,source,sourceUrl
uy-mvd-odo-001,Clínica Pública de Ejemplo,odontologia,UY,Montevideo,"Dirección comercial pública 123",,@clinicaejemplo,59899111222,24001234,4.5,25,Directorio público revisado,https://example.local/fuente
```

### Reglas de uso de datos

- Usar solo datos comerciales públicos.
- No incluir datos personales sensibles ni información privada.
- Mantener `source` y `sourceUrl` para auditoría.
- No automatizar contacto masivo a partir de estos archivos.
- Si una fuente no trae teléfono, rating o reviews, dejar la celda vacía; el pipeline reduce la confianza y ajusta la prioridad.

### Jobs locales Uruguay

`prospecting.config.json` mantiene los jobs demo basados en `samples/prospects-sample.csv` y agrega jobs locales para Montevideo con `sourceType: local-file`, `input`, `city`, `country`, `categories`, `minPriority` y `limit` declarados explícitamente. También puede incluir placeholders deshabilitados para archivos reales aún no creados.

Si un archivo configurado no existe, el runner devuelve un error legible indicando el path faltante. La API de jobs captura el error y responde JSON sin crashear la app.
