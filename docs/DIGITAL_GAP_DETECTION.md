# Digital Gap Detection

## Definición

La brecha digital es la distancia entre la presencia digital que un negocio debería tener para captar consultas y la presencia digital que realmente tiene.

No alcanza con detectar si `website === null`. Un negocio puede tener website y aun así tener una oportunidad clara:

- web caída;
- dominio vencido;
- sitio viejo;
- sin WhatsApp;
- sin CTA;
- sin servicios claros;
- sin SEO local;
- solo una página corporativa genérica;
- web que no transmite confianza.

## Objetivo del detector

El detector debe responder:

> ¿Qué problema digital concreto puede observar Diego antes de contactar al negocio?

La salida debe ser explicable y usable para la llamada.

## Niveles de brecha digital

| Nivel | Nombre | Descripción | Acción |
|---:|---|---|---|
| 0 | Presencia sólida | Web moderna, CTA, WhatsApp, SEO local básico | No contactar o baja prioridad |
| 1 | Web aceptable | Tiene web funcional, pero mejorable | Baja prioridad |
| 2 | Web débil | Web vieja, lenta, sin CTA o confusa | Oportunidad media |
| 3 | Solo redes | Instagram/Facebook/Linktree, sin dominio propio | Buena oportunidad |
| 4 | Sin web + contacto | No se detecta web y hay teléfono/WhatsApp/redes | Oportunidad alta |
| 5 | Sin web + rubro fuerte + demanda | Brecha clara en rubro de alto valor | Prioridad máxima |

## Señales a detectar

### Ausencia de web

- Campo website vacío.
- No hay dominio propio en fuentes públicas.
- Solo redes sociales.
- Solo ficha de mapa/directorio.

### Presencia dependiente de redes

- Instagram como único canal.
- Facebook como único canal.
- Linktree/Beacons/Carrd como reemplazo de web.
- Agenda externa sin web propia.
- Fresha/Booksy/Calendly como único punto de conversión.

No siempre es malo usar redes o agenda externa. La oportunidad es vender la web como base propia, no como reemplazo.

### Problemas técnicos

- Dominio no resuelve.
- HTTP sin HTTPS.
- Certificado inválido.
- Sitio caído.
- Redirecciones rotas.
- Error 404/500.
- Página en construcción.
- Dominio vencido.

### Problemas de conversión

- Sin botón de WhatsApp.
- Sin teléfono visible.
- Sin formulario.
- Sin CTA claro.
- Sin servicios/precios orientativos.
- Sin ubicación.
- Sin horarios.
- Sin galería/casos.
- Sin confianza: equipo, reseñas, credenciales.

### Problemas de SEO local

- Title genérico.
- Meta description ausente.
- No menciona ciudad/zona.
- No menciona rubro/servicio principal.
- Sin schema local básico.
- Sin página de servicios.
- Sin copy orientado a búsquedas.

### Problemas de posicionamiento comercial

- La web no explica por qué elegirlos.
- Marca visual fuerte en redes pero web pobre.
- Rubro de confianza sin señales de autoridad.
- Negocio premium con presencia digital amateur.

## Gap signals

El sistema debe devolver señales explícitas:

```ts
gapSignals: [
  "No se detectó website propio",
  "Tiene Instagram como canal principal",
  "WhatsApp público disponible",
  "Rubro visual con potencial de conversión",
  "Zona comercial fuerte"
]
```

Estas señales alimentan:

- score;
- prioridad;
- argumento de llamada;
- objeciones probables;
- próxima acción.

## Ejemplos

### Gap 5 — Prioridad máxima

Clínica odontológica:

- sin web propia;
- teléfono público;
- zona premium;
- rubro de alto ticket;
- varias fuentes coinciden.

Interpretación:

> Alta oportunidad. La web puede transmitir confianza, explicar servicios y convertir búsquedas locales en consultas.

### Gap 4 — Alta oportunidad

Centro estético:

- Instagram activo;
- WhatsApp visible;
- no se detecta dominio propio;
- servicios visuales.

Interpretación:

> Buen lead. La web complementa redes y centraliza conversión.

### Gap 3 — Buena oportunidad

Barbería premium:

- usa Fresha o Instagram;
- no tiene sitio propio;
- estética de marca fuerte.

Interpretación:

> La venta debe enfocarse en presencia propia y Google, no en reemplazar su agenda.

### Gap 2 — Oportunidad media

Abogado:

- tiene web vieja;
- sin WhatsApp visible;
- sin servicios claros;
- title genérico.

Interpretación:

> Puede venderse rediseño/optimización, pero la llamada requiere diagnóstico más cuidadoso.

### Gap 0 — No contactar

Inmobiliaria:

- web moderna;
- catálogo;
- WhatsApp;
- formularios;
- SEO local;
- redes activas.

Interpretación:

> No es prioridad para venta inicial. Podría ser futuro lead para SEO/campañas, no para web básica.

## Detector técnico inicial

Para el MVP, basta con clasificar usando campos disponibles:

- `hasWebsite`.
- `websiteUrl`.
- `instagram`.
- `whatsapp`.
- `phone`.
- `category`.
- `commercialPotential`.
- `location`.

Luego se puede enriquecer con chequeos HTTP.

## Detector técnico futuro

Módulo sugerido:

```txt
src/lib/prospecting/digital-gap.ts
```

Funciones sugeridas:

```ts
detectDigitalGap(prospect: NormalizedProspect): DigitalGapResult
checkWebsiteHealth(url: string): WebsiteHealthResult
buildGapSignals(prospect: NormalizedProspect, health?: WebsiteHealthResult): string[]
```

Salida sugerida:

```ts
type DigitalGapResult = {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
  signals: string[];
  summary: string;
  confidence: number;
};
```

## Riesgos

- Falsos positivos: una web puede existir pero no estar en la fuente.
- Falsos negativos: el website cargado puede ser malo aunque exista.
- Datos viejos: fuentes públicas pueden estar desactualizadas.
- Rubros con redes fuertes: algunos negocios viven bien solo con Instagram.

Por eso el sistema debe hablar de “no se detectó web” en vez de afirmar siempre “no tiene web”.
