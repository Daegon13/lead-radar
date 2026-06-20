# Yield Calibration — Fase 26

La calibración de yield mide qué corridas, fuentes, rubros y zonas generan leads realmente llamables para prospección humana.

## Callable lead

Un lead es `callable` cuando tiene al menos un canal público útil (teléfono, WhatsApp, email, Instagram/social útil o web con punto de contacto), no tiene `optOut`, no parece cadena/franquicia grande, pertenece a ICP o prioridad A/B, tiene brecha digital clara/web débil y conserva trazabilidad de fuente cuando viene de prospección.

Razones operativas: `tiene teléfono`, `tiene WhatsApp`, `solo tiene Instagram`, `sin contacto directo`, `buena brecha digital`, `web fuerte, baja urgencia`, `source poco confiable`, `rubro ICP alto`.

## Source statuses

- `success`: ejecutó y aportó registros válidos.
- `empty_result`: ejecutó bien y devolvió 0 registros.
- `timeout`: fuente remota superó timeout.
- `request_failed`: fuente remota intentada y fallida.
- `skipped_source`: archivo local opcional ausente/no configurado; el job sigue.
- `invalid_source`: archivo existe pero no parsea o incumple formato mínimo.
- `partial_success`: hay resultados útiles con warnings/errors parciales.

## Métricas de yield

Cada `run-summary.json` nuevo agrega contactabilidad, brecha digital, callable rate, prioridad A/B, fallas, fuentes saltadas e inválidas. Cada source summary agrega accepted, callable, leads con contacto, sin web, prioridad A/B y `sourceYieldScore` heurístico.

## Comando

```bash
npm run prospect:yield
```

Lee `exports/prospecting-schedule`, genera `exports/reports/yield-calibration-latest.json` y `.csv`, y recomienda repetir jobs útiles, ajustar bbox/tags, corregir data packs o agregar data pack local opcional.

## Calibración

Repetir jobs con alto `callableRate`, buena contactabilidad y A/B. Ajustar bbox/tags cuando hay cero resultados. Corregir `invalid_source`; no confundir con `skipped_source`, que solo indica data pack opcional faltante.
