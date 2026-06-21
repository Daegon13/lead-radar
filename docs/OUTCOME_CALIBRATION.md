# Outcome-Based Scoring Calibration

Fase 27 agrega calibración comercial local-first: Lead Radar mide qué leads responden, muestran interés, agendan reuniones, piden propuestas y cierran. No automatiza contacto ni cambia pesos de scoring de forma destructiva.

## Outcomes normalizados

- `not_contacted`: sin contacto humano registrado.
- `called_no_answer`: intento realizado, no contestó.
- `wrong_number`: contacto incorrecto; bloquea futuros contactos.
- `answered_not_interested`: respondió pero no mostró interés.
- `answered_send_info`: pidió información.
- `interested`: mostró interés explícito.
- `meeting_booked`: reunión agendada.
- `proposal_requested`: pidió propuesta.
- `proposal_sent`: propuesta enviada manualmente.
- `won`: cliente ganado.
- `lost`: oportunidad perdida.
- `do_not_contact`: no contactar; activa opt-out local.

Cada outcome tiene label, descripción y flags para respuesta, interés, avance comercial y bloqueo.

## Objeciones normalizadas

`already_has_website`, `already_has_provider`, `uses_instagram_only`, `no_budget`, `not_priority`, `send_info`, `call_later`, `not_decision_maker`, `bad_timing`, `wrong_business`, `unknown`.

## Registro operativo

Desde Call Queue o Lead Detail se puede registrar outcome, objeción opcional, nota, fecha de follow-up y valor estimado. El registro incrementa intentos cuando corresponde, actualiza `lastContactedAt`, agrega historial y ajusta estado CRM básico.

## Métricas

El sistema calcula answeredRate, interestRate, meetingRate, proposalRate, closeRate, noAnswerRate, wrongContactRate, doNotContactRate, alreadyHasProviderRate y noBudgetRate. Las tablas segmentan por fuente, rubro, zona, prioridad, callable/non-callable y gap.

## CLI

Ejecutar:

```bash
npm run prospect:outcomes
```

Genera `exports/reports/outcome-calibration-latest.json` y `.csv`. Si la CLI no encuentra un export local de leads, usa seed leads como fallback y emite un mensaje legible; no falla por ausencia de outcomes.

## Uso de recomendaciones

Las recomendaciones son manuales: repetir fuente/rubro/zona, revisar pitch, mejorar data pack o pausar segmentos. El scoring no se auto-modifica porque todavía hay bajo volumen, riesgo de sesgo por pocas llamadas y necesidad de criterio comercial humano.
