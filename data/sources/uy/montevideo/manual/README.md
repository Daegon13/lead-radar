# Data pack local trazable

Colocar aquí solo datos comerciales públicos, autorizados y trazables. No incluir scraping agresivo, datos privados ni contactos obtenidos sin fuente verificable.

## Formatos aceptados

- JSON: arreglo de objetos normalizados o export nativo del provider cuando exista normalizador.
- CSV: encabezados en primera fila para cargas manuales curadas.

## Campos recomendados

`name`, `category`, `address`, `city`, `country`, `phone`, `email`, `website`, `socials`, `latitude`, `longitude`, `source`, `sourceId`, `sourceUrl`, `sourceCheckedAt`, `confidence`.

## Uso desde jobs

Los jobs allowlisted de `prospecting.config.json` leen rutas específicas de esta carpeta. En jobs multifuente V1, si un archivo local todavía no existe, la corrida continúa con OSM y registra el faltante como error parcial/warning en `run-summary.json`.

## Operación

Generar o copiar exports locales, conservar fuente y fecha de consulta, ejecutar `npm run prospect:run -- --jobId <jobId>`, revisar en Run History y recién entonces importar candidatos A/B.
