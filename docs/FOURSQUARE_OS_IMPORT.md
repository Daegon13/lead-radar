# Foursquare OS Places Import

Fase 21 convierte Foursquare OS Places en una fuente **local-first, reproducible y auditable** para Lead Radar. La app no se conecta al Places Portal desde el frontend, no guarda tokens y no depende de credenciales para correr jobs: solo consume archivos locales normalizados.

## Flujo recomendado

1. Acceder a Foursquare Places Portal con una cuenta autorizada.
2. Crear o seleccionar un access token en el portal. El token se usa únicamente fuera de Lead Radar para consultar el catálogo compatible con DuckDB, Spark o PyIceberg.
3. Conectar desde una herramienta local o notebook al catálogo de Foursquare OS Places siguiendo la documentación oficial del portal.
4. Exportar un recorte chico y trazable por país/ciudad/rubro. Para Montevideo, guardar el export crudo en:

   ```text
   data/sources/uy/montevideo/foursquare/
   ```

5. Normalizar el archivo con el script local:

   ```bash
   ./node_modules/.bin/jiti scripts/foursquare-normalize.ts \
     --input data/sources/uy/montevideo/foursquare/places-export.json \
     --output places.normalized.json
   ```

6. Ejecutar un job allowlisted que lea el archivo normalizado con `foursquare-file`.

## Seguridad de credenciales

- No guardar tokens de Foursquare en el repo.
- No agregar tokens a `prospecting.config.json`.
- No exponer tokens a componentes React, rutas públicas ni variables `NEXT_PUBLIC_*`.
- El script `scripts/foursquare-normalize.ts` no acepta ni necesita tokens: solo transforma archivos ya exportados.
- La conexión directa al Places Portal queda como stub documentado para una fase futura backend-only/CLI, nunca como llamada desde frontend.

## Columnas esperadas del export crudo

El normalizador acepta JSON o CSV. Para JSON soporta contenedores `records`, `items`, `places` o `features`. Las columnas/campos recomendados son:

| Campo Foursquare | Obligatorio | Uso en Lead Radar |
| --- | --- | --- |
| `fsq_place_id`, `id` o `place_id` | Recomendado | `id` / `sourceId` para trazabilidad |
| `name` | Sí | Nombre comercial |
| `categories[].name`, `category` o `primary_category` | Recomendado | Rubro normalizado y scoring |
| `location.country` o `country` | Recomendado | Filtro por país |
| `location.locality` o `city` | Recomendado | Filtro por ciudad |
| `location.region` / `location.neighborhood` | Opcional | Barrio/zona |
| `location.formatted_address` o `address` | Recomendado | Dedupe por dirección y contexto comercial |
| `website` | Opcional | Señal de presencia digital |
| `tel` o `phone` | Opcional | Contactabilidad |
| `email` | Opcional | Contactabilidad adicional |
| `geocodes.main.latitude` / `latitude` | Opcional | Dedupe geográfico |
| `geocodes.main.longitude` / `longitude` | Opcional | Dedupe geográfico |
| `confidence` | Opcional | Confianza de fuente si está disponible |

Los datos incompletos son válidos, pero Lead Radar reducirá prioridad/confianza cuando falten contacto público o señales suficientes.

## Salida normalizada

El script escribe JSON compatible con `foursquare-file-provider` en `data/sources/uy/montevideo/foursquare/`. Cada registro queda con campos planos:

```json
{
  "id": "fsq_place_id",
  "name": "Nombre",
  "category": "Dentist",
  "country": "UY",
  "city": "Montevideo",
  "address": "Dirección",
  "website": "https://example.com",
  "phone": "+598...",
  "lat": -34.9,
  "lng": -56.1,
  "source": "Foursquare OS Places",
  "sourceId": "fsq_place_id",
  "sourceUrl": "https://opensource.foursquare.com/os-places/",
  "sourceCheckedAt": "fecha ISO",
  "sourcePayload": {}
}
```

## Jobs disponibles

- `foursquare-mvd-local-sample`: lee solo el fixture normalizado de Foursquare.
- `uy-mvd-osm-overture-foursquare-local-demo`: combina OSM local, Overture local y Foursquare local para validar adquisición multifuente y dedupe global.

## Stub de integración futura

Una fase futura podría agregar un comando CLI/backend-only que conecte a DuckDB/Spark/PyIceberg y escriba exports locales. Ese comando deberá:

- Leer credenciales desde variables de entorno locales no versionadas.
- Escribir solo datasets exportados/normalizados bajo `data/sources/...`.
- Mantener el frontend desacoplado de tokens, portales y APIs.
- Respetar límites, términos de uso y recortes geográficos/rubro acotados.
