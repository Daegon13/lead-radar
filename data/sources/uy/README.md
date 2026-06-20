# Fuentes locales Uruguay

Esta carpeta contiene templates para datasets locales de Uruguay usados por jobs de prospección local-first.

Reglas:

- Usar únicamente datos comerciales públicos, trazables y revisables manualmente.
- No incluir datos personales sensibles, datos privados ni información obtenida evadiendo términos de uso.
- Completar siempre `source` y, cuando exista, `sourceUrl` para auditar el origen.
- La herramienta no descarga datos, no scrapea y no llama Google Places en esta fase.

## Extractos Overture Places

Los extractos Overture para Uruguay deben guardarse por ciudad/zona, por ejemplo:

```txt
data/sources/uy/montevideo/overture/
```

Generación reproducible:

```bash
npx jiti scripts/overture-export.ts \
  --country UY \
  --city Montevideo \
  --zone pocitos \
  --bbox -34.928,-56.166,-34.895,-56.132 \
  --category dentist \
  --out data/sources/uy/montevideo/overture/dentists-pocitos.json \
  --limit 50 \
  --format json
```

Si DuckDB CLI no está instalado, el comando genera un `.sql` junto al output solicitado y muestra cómo ejecutarlo manualmente. No habilitar jobs que apunten a archivos reales hasta haber creado y revisado el JSON/CSV local.
