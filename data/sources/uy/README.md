# Uruguay real/local source packs

Estructura operacional para Fase 25 — Real Data Harvesting V1.

- `montevideo/osm/`: notas o exports OSM locales; los jobs reales usan Overpass con bbox y cache.
- `montevideo/overture/`: JSON/CSV exportado desde Overture Places mediante herramientas locales.
- `montevideo/foursquare/`: JSON/CSV exportado o normalizado desde Foursquare OS Places.
- `montevideo/manual/`: CSV curado manualmente como fallback trazable.
- `mercedes/`: zona futura/experimental para Mercedes, Soriano.

Usar únicamente datos comerciales públicos y trazables. No colocar datos privados, no scrapear masivamente y no automatizar contacto. Cada registro debe conservar fuente, URL o identificador, fecha de chequeo y confianza cuando sea posible.
