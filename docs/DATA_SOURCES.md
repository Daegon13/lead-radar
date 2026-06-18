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
