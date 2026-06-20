# Roadmap — Lead Radar

## Fase 0 — Documentación y criterios

### Objetivo

Dejar clara la visión del producto, ICP, scoring, arquitectura y límites.

### Entregables

- `AGENTS.md`.
- Documentación en `docs/`.
- README actualizado con enlaces.

### Criterios de aceptación

- Documentación en español.
- Criterios comerciales accionables.
- Roadmap implementable.
- No cambios funcionales innecesarios.

### Riesgos

- Documentar demasiado genérico.
- No reflejar el repo real.

## Fase 1 — Refactor de prospecting mock a provider interface

### Objetivo

Separar UI de generación de datos.

### Entregables

- `src/lib/prospecting/types.ts`.
- `mockProspectingProvider`.
- `/prospecting` usando interfaz provider.

### Criterios de aceptación

- UI sigue funcionando igual.
- Mock encapsulado.
- `page.tsx` no contiene lógica mock pesada.
- Lint/build pasan.

### Riesgos

- Romper experiencia actual.
- Sobrediseñar tipos.

## Fase 2 — CLI local con CSV/JSON

### Objetivo

Generar leads desde archivos locales sin backend.

### Entregables

- `scripts/prospect.ts`.
- Comando `npm run prospect:run`.
- Provider CSV/JSON.
- Export JSON/CSV.

### Criterios de aceptación

- Ejecuta con archivo local.
- Exporta leads importables.
- No requiere API paga.

### Riesgos

- Formatos CSV inconsistentes.
- Falta de campos útiles.

## Fase 3 — Normalización, dedupe y scoring

### Objetivo

Evitar basura y priorizar calidad.

### Entregables

- `normalize.ts`.
- `dedupe.ts`.
- `fit-score.ts`.
- Score con razones.

### Criterios de aceptación

- Duplicados obvios se fusionan.
- Leads A/B tienen explicación.
- Sin contacto no puede ser A.

### Riesgos

- Dedupe demasiado agresivo.
- Score opaco.

## Fase 4 — Detector de brecha digital

### Objetivo

Detectar oportunidad digital real.

### Entregables

- `digital-gap.ts`.
- Niveles 0-5.
- `gapSignals`.
- Chequeo inicial de website si aplica.

### Criterios de aceptación

- No se limita a `hasWebsite`.
- Diferencia sin web, solo redes y web débil.
- Genera señales usables en venta.

### Riesgos

- Falsos positivos por fuentes incompletas.
- Chequeos web lentos.

## Fase 5 — Integración UI `/prospecting`

### Objetivo

Usar resultados reales del motor en la app.

### Entregables

- Filtros por ciudad/rubro/fuente.
- Vista de resultados.
- Guardar en leads.
- Exportar.

### Criterios de aceptación

- El usuario puede generar/revisar/importar leads sin salir del flujo.
- Resultados muestran razones de score.

### Riesgos

- UI compleja.
- Confundir corrida con base permanente.

## Fase 6 — Call Queue

### Objetivo

Convertir leads en llamadas accionables.

### Entregables

- Vista de cola de llamadas.
- Apertura sugerida.
- Objeción probable.
- Botones de estado.
- Seguimiento.

### Criterios de aceptación

- Diego puede abrir la herramienta y saber a quién llamar.
- Cada llamada tiene argumento.

### Riesgos

- Ser otra tabla más sin acción clara.

## Fase 7 — Feedback loop

### Objetivo

Aprender de resultados reales.

### Entregables

- Registro de outcome.
- Métricas por rubro/zona/prioridad.
- Ajustes de scoring.

### Criterios de aceptación

- Se puede medir tasa de interés/cierre.
- El score puede mejorar con evidencia.

### Riesgos

- Pocos datos iniciales.
- Sesgo manual.

## Fase 8 — Automatización programada

### Objetivo

Generar listas recurrentes.

### Entregables

- Corridas programadas locales.
- Configuración por rubro/día.
- Reportes automáticos.

### Criterios de aceptación

- La herramienta produce cola nueva sin búsqueda manual.
- No contacta automáticamente.

### Riesgos

- Generar demasiados leads.
- Datos repetidos.

## Fase 9 — Fuentes avanzadas/API opcional

### Objetivo

Mejorar enriquecimiento con APIs oficiales o datasets más complejos.

### Entregables

- Provider Overture/Foursquare directo.
- Google Places opcional.
- Verificador web avanzado.

### Criterios de aceptación

- API keys seguras.
- Costos controlados.
- Mejoras medibles en calidad.

### Riesgos

- Dependencia de pagos.
- Términos de uso restrictivos.
- Complejidad innecesaria.

## Secuencia recomendada inmediata

1. Aplicar documentación.
2. PR pequeño: provider interface para mock.
3. PR pequeño: CLI CSV/JSON.
4. PR: scoring explicable.
5. PR: digital gap.
6. PR: UI de resultados reales.

## Fase 8 — Cola diaria de llamadas

### Objetivo

Crear una vista de trabajo para que Diego abra una pantalla y sepa a quién llamar primero sin automatizar contactos.

### Entregables

- Ruta `/call-queue` integrada en la navegación principal.
- Cola principal con leads A/B contactables primero.
- Acciones rápidas manuales para registrar resultado de llamada.
- Notas y actualización de `lastContactedAt` en el lead existente.

### Criterios de aceptación

- Los leads sin teléfono, WhatsApp o Instagram no entran en la cola principal aunque tengan score alto.
- Las acciones rápidas actualizan `status`, `nextAction`, `notes`, `lastContactedAt` y `updatedAt` sin crear un modelo paralelo.
- La pantalla mantiene el enfoque local-first y no dispara llamadas ni mensajes automáticos.


## Fase 18 — Multisource Acquisition Engine

- Un job de prospección puede declarar varias `sources` allowlisted y ejecutarlas en una única corrida de adquisición.
- Cada corrida genera un `AcquisitionRun` con resumen global y `AcquisitionSourceSummary` por fuente: registros leídos, aceptados, rechazados, warnings, errores y duración.
- Los errores parciales no destruyen la corrida si al menos una fuente entrega resultados válidos; el resumen conserva el error por fuente y continúa con normalización, dedupe global, scoring y export JSON/CSV.
- La deduplicación sigue siendo global entre fuentes. El merge conserva contacto, website y trazabilidad combinada cuando la lógica existente puede hacerlo; enriquecimiento más avanzado de duplicados queda como fase posterior.
- Google Places, scraping, automatización de mensajes y claves API en cliente siguen fuera de alcance.

## Fase 23 — Operational Readiness

Objetivo: convertir la prospección multifuente de demo avanzada a operación auditable y confiable, manteniendo revisión humana y evitando automatización de contacto.

Alcance operativo:

- Corridas CLI y programadas deben usar el registry allowlisted como fuente canónica de jobs.
- Cada corrida debe exportar JSON/CSV y un `run-summary.json` con opciones, fuentes, métricas, warnings, errores parciales y duración.
- Los providers reales o semi-reales deben reportar estado distinguible por fuente (`success`, `empty_result`, `timeout`, `request_failed`).
- La UI `/prospecting` debe separar visualmente mocks/demo, archivos locales, OSM real, Overture/Foursquare locales, multifuente y asistencia IA.
- Un resultado real con 0 leads no debe interpretarse automáticamente como “no hay negocios”: debe revisarse contra source summaries, warnings/errors y conectividad.

Guardrails:

- No scraping, no Google Places obligatorio y no automatización de contacto.
- OSM Overpass sólo con `bbox` allowlisted, límite máximo 100 y timeout máximo 25s.
- Las fuentes locales operativas sólo pueden apuntar a `samples/`, `data/sources/` o fixtures de validación.
