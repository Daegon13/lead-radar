# Architecture — Lead Radar

## Arquitectura actual

El repo actual es una app Next.js con:

```txt
src/app/
  leads/
  leads/new/
  leads/[id]/
  leads/[id]/edit/
  prospecting/
  settings/
src/components/leads/
src/hooks/use-leads.ts
src/lib/scoring.ts
src/lib/storage.ts
src/lib/prospecting-adapter.ts
src/lib/prospecting-execution-policy.ts
src/lib/prospecting-hotspots.ts
src/types/lead.ts
```

Características actuales:

- Dashboard de leads.
- Formulario de lead.
- Detalle/edición.
- Scoring básico.
- Import/export JSON/CSV.
- Persistencia local.
- Página `/prospecting` con simulación/mock.

## Problema arquitectónico actual

La página `/prospecting` mezcla experiencia de usuario con generación simulada de resultados. Para evolucionar a datos reales, primero hay que separar:

- UI.
- Provider de datos.
- Normalización.
- Dedupe.
- Scoring.
- Exportación.

No se debe enchufar una API real directamente en `page.tsx`.

## Arquitectura objetivo

```txt
Fuentes de datos
  ↓
Prospecting Providers
  ↓
Normalizer
  ↓
Deduper
  ↓
Digital Gap Detector
  ↓
Fit Score
  ↓
Sales Angle Generator
  ↓
Exporter / Storage
  ↓
Lead Radar UI / Call Queue
```

## Componentes objetivo

### 1. UI Lead Radar

Responsable de mostrar:

- leads;
- filtros;
- detalle;
- prospección;
- cola de llamadas;
- import/export;
- estados comerciales.

No debe contener lógica pesada de datos.

### 2. Prospecting Engine

Responsable de ejecutar corridas:

- leer input;
- consultar providers;
- normalizar;
- deduplicar;
- puntuar;
- exportar.

Debe poder correr primero como CLI.

### 3. Providers

Cada provider sabe leer una fuente específica:

- mock;
- CSV;
- JSON;
- Overture;
- Foursquare;
- OSM;
- Google Places opcional.

Todos devuelven `RawProspect[]`.

### 4. Normalizer

Convierte datos crudos a `NormalizedProspect`.

Responsabilidades:

- limpiar nombres;
- mapear categorías;
- normalizar teléfonos/URLs;
- convertir ubicación;
- asignar fuente;
- calcular confianza inicial.

### 5. Deduper

Fusiona duplicados por:

- nombre normalizado;
- dirección;
- teléfono;
- coordenadas próximas;
- website;
- redes.

No debe borrar información útil. Debe fusionar fuentes.

### 6. Digital Gap Detector

Clasifica presencia digital:

- sin web;
- solo redes;
- web débil;
- web fuerte.

Devuelve `gapSignals` y `digitalGapLevel`.

### 7. Fit Score

Calcula prioridad comercial A/B/C/D.

Debe aplicar reglas duras:

- sin contacto: máximo C;
- cadena grande: descartar/revisión;
- rubro bajo margen: máximo C;
- fuente débil: revisión.

### 8. Sales Angle Generator

Genera:

- `salesAngle`;
- `callOpening`;
- `objectionHint`;
- `nextAction`.

El lenguaje debe ser consultivo, no agresivo.

### 9. Exporter

Produce:

- JSON compatible con Lead Radar;
- CSV legible;
- reporte de corrida.

## Módulos sugeridos

```txt
src/lib/prospecting/types.ts
src/lib/prospecting/providers/mock.ts
src/lib/prospecting/providers/csv.ts
src/lib/prospecting/providers/json.ts
src/lib/prospecting/normalize.ts
src/lib/prospecting/dedupe.ts
src/lib/prospecting/digital-gap.ts
src/lib/prospecting/fit-score.ts
src/lib/prospecting/sales-angle.ts
src/lib/prospecting/export.ts
src/lib/prospecting/run.ts
scripts/prospect.ts
```

## CLI antes que backend

Conviene empezar con CLI porque:

- reduce complejidad;
- no requiere base de datos aún;
- permite validar scoring con archivos locales;
- aprovecha import/export actual;
- evita exponer APIs;
- permite corridas reproducibles.

Comando objetivo:

```bash
npm run prospect:run -- --input ./data/pois.csv --country UY --city Montevideo --category estetica --limit 50 --out ./exports
```

## Migración futura a SQLite

Cuando haya valor probado, migrar de `localStorage` a SQLite local o una capa híbrida.

Ventajas:

- historial de corridas;
- mejor dedupe;
- métricas de conversión;
- feedback loop;
- consultas por estado/fecha/rubro;
- persistencia más robusta.

No hacerlo antes de validar el motor.

## Call Queue

La cola de llamadas es la vista final más importante.

Debe mostrar:

- leads A/B;
- razón principal;
- contacto;
- apertura sugerida;
- estado;
- próxima acción;
- fecha de seguimiento.

## Flujo futuro de uso

1. Diego elige rubro/zona.
2. Ejecuta corrida.
3. Lead Radar muestra candidatos.
4. Diego guarda los A/B.
5. Abre la cola de llamadas.
6. Llama con argumento sugerido.
7. Marca resultado.
8. El sistema aprende con el feedback.

## Riesgos arquitectónicos

- Meter lógica de providers en UI.
- Generar demasiados leads sin explicar.
- Romper import/export.
- Depender demasiado de una API paga.
- No diseñar dedupe desde el inicio.
- No guardar trazabilidad de fuente.
- Automatizar contacto antes de validar calidad.
