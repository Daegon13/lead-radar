# Acceptance Criteria — Lead Radar

## Criterios globales

Una tarea del proyecto debe cumplir:

- La app compila.
- Lint pasa.
- No se rompe funcionalidad existente.
- No se rompe import/export.
- No se eliminan mocks sin reemplazo.
- No se agregan dependencias innecesarias.
- La documentación se actualiza si cambian criterios.

## Criterios comerciales

- Cada lead automático debe explicar por qué fue priorizado.
- No se deben generar leads A sin contacto público.
- No se deben incluir cadenas/franquicias como prioridad alta sin revisión.
- Rubros de bajo margen deben quedar máximo C salvo señales excepcionales.
- La prioridad debe reflejar capacidad adquisitiva, brecha digital y contactabilidad.
- La salida debe incluir próxima acción.

## Criterios de datos

- Cada lead automático debe tener `source`.
- Cada lead automático debe tener `sourceCheckedAt`.
- Debe existir `confidence` o criterio equivalente.
- Datos incompletos no deben romper el motor.
- Duplicados obvios deben fusionarse o descartarse.
- No afirmar “no tiene web” si solo se sabe “no se detectó web”.

## Criterios de scoring

- Score total claro.
- Prioridad A/B/C/D.
- `scoreReasons` legibles.
- `gapSignals` legibles.
- Reglas duras aplicadas.
- Ejemplos cubiertos manualmente o con tests futuros.

## Criterios de digital gap

- Diferenciar sin web, solo redes, web débil y web fuerte.
- No depender solo de `hasWebsite`.
- Detectar señales como redes, Linktree, CTA ausente y website roto cuando sea posible.
- La brecha debe alimentar el argumento comercial.

## Criterios de UI

- La UI debe mostrar prioridad y razón.
- El detalle debe permitir entender el lead.
- La cola de llamadas debe mostrar contacto y apertura sugerida.
- Deben existir acciones rápidas para estado/seguimiento.
- No ocultar advertencias de baja confianza.

## Criterios de CLI/prospecting engine

- Debe poder correr con CSV/JSON local.
- Debe exportar JSON compatible con Lead Radar.
- Debe exportar CSV revisable.
- Debe producir reporte de corrida.
- Debe poder limitar cantidad y prioridad mínima.
- No debe requerir API paga para el MVP.

## Criterios de compliance

- No automatizar mensajes masivos.
- No hacer scraping agresivo.
- Guardar fuente y fecha.
- Permitir opt-out/no contactar.
- No insistir a leads marcados como opt-out.
- Mantener contacto humano personalizado.

## Criterios de documentación

- `AGENTS.md` actualizado si cambian reglas de trabajo.
- `docs/SCORING_MODEL.md` actualizado si cambia scoring.
- `docs/IDEAL_CUSTOMER_PROFILE.md` actualizado si cambian rubros.
- `docs/DATA_MODEL.md` actualizado si cambian tipos.
- `docs/ARCHITECTURE.md` actualizado si cambia estructura.

## Definition of Done

Una feature está done cuando:

1. Cumple criterios técnicos.
2. Cumple criterios comerciales.
3. Tiene datos trazables.
4. No genera leads basura como prioridad alta.
5. La UI o export explica el motivo.
6. Lint/build pasan o se documenta error preexistente.
7. La documentación relevante queda actualizada.


## Fase 18 — Multisource Acquisition Engine

- Un job de prospección puede declarar varias `sources` allowlisted y ejecutarlas en una única corrida de adquisición.
- Cada corrida genera un `AcquisitionRun` con resumen global y `AcquisitionSourceSummary` por fuente: registros leídos, aceptados, rechazados, warnings, errores y duración.
- Los errores parciales no destruyen la corrida si al menos una fuente entrega resultados válidos; el resumen conserva el error por fuente y continúa con normalización, dedupe global, scoring y export JSON/CSV.
- La deduplicación sigue siendo global entre fuentes. El merge conserva contacto, website y trazabilidad combinada cuando la lógica existente puede hacerlo; enriquecimiento más avanzado de duplicados queda como fase posterior.
- Google Places, scraping, automatización de mensajes y claves API en cliente siguen fuera de alcance.

## Fase 24 — Run History & Review Ops

- Existe historial navegable de corridas en `/prospecting/runs`.
- `GET /api/prospecting/runs` lista solo corridas bajo el directorio local de exports configurado.
- `GET /api/prospecting/runs/[runId]` abre una corrida por id seguro y devuelve `run-summary.json`, source summaries y leads exportados si existe el JSON.
- La API no acepta paths arbitrarios ni expone paths absolutos en la respuesta.
- El detalle muestra resumen global, resumen por fuente, warnings, errors, paths relativos seguros, top/leads exportados, distribución A/B/C/D y etiquetas de source type.
- La revisión por lote permite seleccionar leads individuales, importar seleccionados, importar solo A/B y descartar visualmente leads.
- La importación reutiliza deduplicación local para no crear duplicados al repetir la acción.
- Las fuentes distinguen `success`, `empty_result`, `timeout`, `request_failed`; corridas multifuente mixtas se muestran como `partial_success`.
- La app sigue local-first y no agrega fuentes, scraping, Google Places ni ejecución arbitraria de comandos.

## Fase 26 — Real Data Quality & Yield Calibration

- Los source statuses distinguen `skipped_source`, `invalid_source`, `request_failed`, `timeout`, `empty_result`, `success` y `partial_success`.
- Los data packs locales faltantes no rompen jobs multisource; los rotos son inválidos.
- Cada corrida nueva escribe métricas de yield y conserva compatibilidad con summaries antiguos.
- Review Ops permite revisar callable/non-callable e importar solo callable A/B.
- `npm run prospect:yield` genera reportes JSON/CSV para decidir qué jobs repetir o ajustar.

## Fase 27 — Outcome calibration

- Outcomes y objeciones tipados y auditables.
- Leads antiguos normalizan campos faltantes y outcome legacy `no_answer`.
- Call Queue y Lead Detail registran outcomes sin automatizar contacto.
- Metrics muestra embudo, tasas, segmentos, objeciones y recomendaciones.
- `npm run prospect:outcomes` genera JSON/CSV aun sin outcomes reales.
- El scoring no cambia pesos automáticamente; solo se proponen ajustes manuales.
