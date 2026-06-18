<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lead Radar — Agent Instructions

## Propósito del proyecto

Lead Radar es una herramienta local-first para que Diego consiga clientes de desarrollo web mediante prospección comercial de calidad. El producto debe evolucionar desde un CRM/dashboard manual hacia un sistema automático de inteligencia comercial local.

La frase guía del proyecto es:

> Lead Radar no busca negocios sin web; busca negocios con dinero, necesidad comercial y brecha digital detectable.

El objetivo final no es generar miles de contactos. El objetivo es entregar una cola priorizada de negocios contactables, con razón comercial clara, brecha digital explicada, argumento de llamada y próxima acción.

## Principios de producto

1. Calidad sobre cantidad.
2. Diagnóstico antes que pitch.
3. Todo lead automático debe tener fuente, fecha de chequeo, señales y motivo de prioridad.
4. Ningún lead sin contacto público puede ser prioridad A.
5. Ninguna cadena/franquicia grande debe aparecer como prioridad alta sin revisión manual.
6. La herramienta prepara la prospección; no debe convertirse en spammer.
7. Los datos deben ser trazables, importables/exportables y auditables.
8. La automatización debe reducir trabajo manual, no reducir criterio comercial.

## Estado actual del repo

El repo actual contiene una app Next.js con:

- Gestión de leads.
- Alta, edición y detalle.
- Scoring comercial básico.
- Estados comerciales y próximas acciones.
- Import/export JSON/CSV.
- Persistencia local principalmente mediante `localStorage`.
- Página `/prospecting` con lógica de prospección simulada/mock.

La sección `/prospecting` no debe ser tratada todavía como fuente real de datos. Debe refactorizarse hacia providers antes de enchufar datasets o APIs.

## Prioridad de implementación

Cuando haya que avanzar el producto, seguir esta secuencia:

1. Documentar decisiones.
2. Tipar estructuras.
3. Normalizar datos.
4. Deduplicar.
5. Detectar brecha digital.
6. Puntuar y explicar el score.
7. Exportar/importar sin romper compatibilidad.
8. Integrar con UI.
9. Automatizar corridas.
10. Recién al final considerar APIs pagas o enriquecimiento avanzado.

No saltar directo a scraping o automatización de contacto.

## Reglas técnicas

- No romper las rutas actuales.
- No eliminar mocks sin reemplazo compatible.
- No cambiar `package.json` salvo necesidad explícita.
- No agregar dependencias pesadas sin justificar.
- No ejecutar `npm audit fix --force` salvo instrucción explícita.
- Mantener compatibilidad con import/export actual de leads.
- Toda migración de tipos debe ser backward-compatible.
- Preferir módulos pequeños en `src/lib/prospecting/`.
- Toda lógica de scoring debe ser testeable como función pura.
- La UI debe consumir resultados ya normalizados, no datos crudos de providers.

## Comandos de validación

Antes de considerar una tarea terminada, ejecutar cuando aplique:

```bash
npm run lint
npm run build
```

Si existen tests en el futuro:

```bash
npm test
```

Si un comando falla por un problema preexistente, documentar el error exacto. Si falla por cambios propios, corregirlo.

## Estructura documental esperada

La documentación principal vive en `docs/`:

- `PROJECT_BRIEF.md`: visión del producto.
- `IDEAL_CUSTOMER_PROFILE.md`: cliente ideal y rubros prioritarios.
- `SCORING_MODEL.md`: modelo de puntuación.
- `DIGITAL_GAP_DETECTION.md`: detección de brecha digital.
- `DATA_SOURCES.md`: fuentes de datos.
- `ARCHITECTURE.md`: arquitectura actual y objetivo.
- `PROSPECTING_ENGINE.md`: motor de prospección.
- `DATA_MODEL.md`: tipos y campos.
- `SALES_PLAYBOOK.md`: método comercial.
- `COMPLIANCE_AND_ETHICS.md`: límites legales/éticos.
- `ROADMAP.md`: fases.
- `ACCEPTANCE_CRITERIA.md`: criterios globales.

Si una decisión cambia, actualizar la documentación correspondiente en el mismo PR.

## Reglas de scoring y negocio

El score automático debe contemplar:

- Rubro y capacidad adquisitiva.
- Brecha digital.
- Contactabilidad.
- Demanda visible.
- Facilidad de decisión.

Cada lead priorizado debe devolver:

- `scoreReasons`
- `gapSignals`
- `salesAngle`
- `callOpening`
- `objectionHint`
- `nextAction`

No alcanza con decir “score 87”. Hay que explicar por qué ese lead merece atención.

## Reglas sobre fuentes y datos

Fuentes permitidas o previstas:

- Overture Places.
- Foursquare OS Places.
- OpenStreetMap/Overpass.
- CSV/JSON manual.
- Google Places API como opción futura/paga.

No diseñar el MVP dependiendo exclusivamente de Google Places.

No asumir que las fuentes libres traen teléfono, rating, reseñas o WhatsApp. El sistema debe soportar datos incompletos y asignar menor confianza cuando falten campos.

## Compliance y ética

- No automatizar spam.
- No hacer scraping agresivo.
- No evadir rate limits ni términos de uso.
- Guardar fuente y fecha de consulta.
- Respetar opt-out.
- Evitar contactos repetidos a quien no quiera ser contactado.
- Diferenciar contacto humano personalizado de campañas masivas.
- Considerar el Registro Nacional No Llame y normativa local antes de campañas telefónicas en Uruguay.

Esta documentación no constituye asesoramiento legal, pero sí define buenas prácticas de producto.

## Definición de done

Una feature está terminada cuando:

1. Respeta esta documentación.
2. No rompe flujos actuales.
3. Tiene tipos claros.
4. Mantiene import/export compatible.
5. Explica al usuario final por qué un lead fue priorizado.
6. Tiene validación manual o automática suficiente.
7. Pasa lint/build o documenta fallos preexistentes.
8. Actualiza docs si cambia criterios, modelos o arquitectura.
