# Real Data Harvesting V1 — Fase 25

Fase 25 habilita adquisición operacional real/local para Uruguay, empezando por Montevideo, sin Google Places, sin scraping y sin automatizar contacto.

## Fuentes habilitadas

1. **OSM Overpass real**: jobs allowlisted con bbox obligatorio, tags explícitos, límite <= 100 y timeout <= 25s.
2. **Overture local data packs**: archivos colocados en `data/sources/uy/montevideo/overture/`.
3. **Foursquare local data packs**: archivos colocados en `data/sources/uy/montevideo/foursquare/`.
4. **CSV manual curado**: fallback en `data/sources/uy/montevideo/manual/`.
5. **AI Source Scout**: solo ayuda a descubrir fuentes públicas; no recolecta leads masivos ni scrapea sitios.

## Ejecutar OSM real

```bash
npm run prospect:run -- --jobId osm-mvd-odontologia-pocitos
npm run prospect:run -- --jobId osm-mvd-estetica-punta-carretas
npm run prospect:run -- --jobId osm-mvd-inmobiliarias-montevideo
```

Para ignorar cache OSM de 24h:

```bash
npm run prospect:run -- --jobId osm-mvd-odontologia-pocitos --forceRefresh true
```

Las respuestas crudas se cachean en `exports/source-cache/osm-overpass/<jobId>/latest.json` para no repetir llamadas innecesarias.

## Colocar datasets locales

- Overture: copiar JSON/CSV reales a rutas como `data/sources/uy/montevideo/overture/odontologia.json`.
- Foursquare: copiar JSON/CSV reales a rutas como `data/sources/uy/montevideo/foursquare/odontologia.json`.
- Manual: copiar CSV curado a rutas como `data/sources/uy/montevideo/manual/odontologia.csv`.

Usar los `.template.*` como guía. Cada registro debe incluir nombre, rubro, ubicación, fuente, `sourceId` o `sourceUrl`, fecha de chequeo y confianza cuando sea posible.

## Correr multifuente

```bash
npm run prospect:run -- --jobId mvd-odontologia-multisource-v1
npm run prospect:run -- --jobId mvd-estetica-multisource-v1
```

Si falta un archivo local, la fuente se reporta como error parcial/request_failed, pero OSM puede aportar resultados y la corrida genera `run-summary.json`.

## Revisión e importación

1. Abrir `/prospecting/runs`.
2. Ver badges de `OSM REAL`, `LOCAL DATASET` o `MULTISOURCE` según el job.
3. Revisar warnings, errores, `empty_result`, `timeout` o `request_failed`.
4. Abrir el detalle de corrida, revisar top leads y CSV/JSON generados.
5. Importar solo candidatos A/B útiles. No contactar automáticamente.

## Interpretación operativa

- **0 resultados / empty_result**: puede indicar baja cobertura OSM, bbox chico, rubro mal tagueado o fuente local vacía.
- **timeout**: bajar límite, esperar y reintentar; no subir presión sobre Overpass.
- **request_failed**: revisar conectividad, estado de Overpass o rutas de archivos locales.
- **partial_success** o errores por fuente local faltante: completar data pack o seguir con OSM si los leads son útiles.

## Guardrails

- No búsquedas nacionales sin bbox.
- No `limit > 100` ni `timeoutMs > 25000`.
- No Google Places en esta fase: queda como fase futura opcional por costo, API key y compliance.
- No scraping: solo APIs/datasets abiertos o archivos curados trazables.
