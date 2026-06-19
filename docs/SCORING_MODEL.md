# Scoring Model — Lead Radar

## Objetivo

El scoring debe ordenar leads por probabilidad comercial real. No debe medir solamente si un negocio tiene o no website. Debe responder:

> ¿Vale la pena que Diego invierta tiempo en contactar este negocio ahora?

## Score total

El score recomendado va de 0 a 100 puntos.

| Componente | Puntos |
|---|---:|
| Rubro y capacidad adquisitiva | 25 |
| Brecha digital | 25 |
| Contactabilidad | 20 |
| Demanda visible | 20 |
| Facilidad de decisión | 10 |
| **Total** | **100** |

## 1. Rubro y capacidad adquisitiva — 25 puntos

| Puntaje | Criterio |
|---:|---|
| 25 | Odontología, estética premium, inmobiliaria, construcción, salud privada, arquitectura/interiorismo |
| 20 | Abogados, contadores, gestorías, veterinarias clínicas, academias privadas |
| 15 | Barberías/peluquerías premium, tatuajes premium, fitness boutique, pilates/yoga |
| 10 | Cafés con marca, restaurantes visuales, tiendas diferenciadas |
| 5 | Comercios chicos genéricos |
| 0 | Rubro excluido, cadena grande o negocio sin encaje |

## 2. Brecha digital — 25 puntos

| Puntaje | Criterio |
|---:|---|
| 25 | Sin web propia + contacto público |
| 22 | Solo Instagram/Facebook/Linktree |
| 18 | Web rota, caída, sin HTTPS o dominio problemático |
| 15 | Web vieja, lenta, sin CTA o sin WhatsApp claro |
| 10 | Web aceptable pero débil en SEO/conversión |
| 0-5 | Web fuerte, actualizada y con buen CTA |

## 3. Contactabilidad — 20 puntos

| Puntaje | Criterio |
|---:|---|
| 20 | Teléfono + WhatsApp + redes/email |
| 15 | Teléfono o WhatsApp claro |
| 10 | Solo Instagram/Facebook con mensajes abiertos |
| 5 | Solo dirección física |
| 0 | Sin contacto público |

Regla dura:

> Si contactabilidad es menor a 10, el lead no puede ser prioridad A.

## 4. Demanda visible — 20 puntos

La demanda visible mide si hay señales de actividad o reputación.

| Puntaje | Criterio |
|---:|---|
| 20 | Muchas reseñas, fotos, redes activas, zona fuerte o varias fuentes coinciden |
| 15 | Presencia activa en mapas/redes/directorios |
| 10 | Señales moderadas de actividad |
| 5 | Poca evidencia |
| 0 | Negocio dudoso, cerrado o sin señales |

Datos posibles:

- Rating.
- Review count.
- Fotos públicas.
- Redes activas.
- Presencia en múltiples fuentes.
- Categoría con alta intención local.
- Ubicación premium/comercial.

No todas las fuentes libres traen rating o reseñas. Si faltan, el sistema debe poder puntuar usando fuentes, categoría, ubicación y contacto.

## 5. Facilidad de decisión — 10 puntos

| Puntaje | Criterio |
|---:|---|
| 10 | Dueño/decisor probablemente directo o negocio independiente |
| 7 | Marca local con decisión interna probable |
| 4 | Encargado/gatekeeper probable |
| 0 | Cadena/franquicia/corporativo o decisor inaccesible |

## Prioridad final

| Score | Prioridad | Interpretación |
|---:|---|---|
| 85-100 | A | Llamar hoy |
| 70-84 | B | Buen lead, contactar esta semana |
| 55-69 | C | Revisar manualmente o guardar |
| 0-54 | D | Descartar o baja prioridad |

## Reglas duras

Estas reglas ajustan la prioridad incluso si el score numérico parece alto.

1. Sin contacto público → máximo C.
2. Rubro de bajo margen → máximo C.
3. Web fuerte y actualizada → máximo B.
4. Cadena/franquicia grande → descartar o revisión manual.
5. Fuente poco confiable → revisión manual.
6. Negocio cerrado/inactivo → descartar.
7. Datos duplicados → fusionar antes de puntuar.
8. Contacto marcado como opt-out → no contactar.

## Salida explicable

Cada score debe producir razones legibles, no solo un número.

Campos sugeridos:

```ts
scoreReasons: string[]
gapSignals: string[]
salesAngle: string
callOpening: string
objectionHint: string
nextAction: string
```

Ejemplo:

```json
{
  "total": 88,
  "priority": "A",
  "scoreReasons": [
    "Rubro de alto valor: odontología",
    "No se detectó sitio web propio",
    "Tiene teléfono público",
    "Zona comercial fuerte",
    "Servicios de confianza que requieren presencia profesional"
  ],
  "gapSignals": [
    "Sin website",
    "Contacto público disponible",
    "Categoría de alta intención local"
  ],
  "salesAngle": "Web profesional para convertir búsquedas locales en consultas por WhatsApp.",
  "nextAction": "call_today"
}
```

## Ejemplos

### Prioridad A

Centro estético premium en Punta Carretas, Instagram activo, WhatsApp público, sin web propia.

- Rubro: 25.
- Brecha digital: 25.
- Contactabilidad: 20.
- Demanda visible: 15.
- Decisión: 7.
- Total: 92.
- Acción: llamar hoy.

### Prioridad B

Barbería premium con Instagram, agenda externa y sin dominio propio.

- Rubro: 15.
- Brecha digital: 22.
- Contactabilidad: 15.
- Demanda visible: 15.
- Decisión: 7.
- Total: 74.
- Acción: contactar esta semana.

### Prioridad C

Café chico con poca actividad, sin web, solo dirección.

- Rubro: 10.
- Brecha digital: 20.
- Contactabilidad: 5.
- Demanda visible: 5.
- Decisión: 7.
- Total: 47.
- Regla dura: sin contacto claro.
- Acción: revisar manualmente.

### Prioridad D

Kiosco sin contacto digital y sin señales comerciales.

- Rubro: 5.
- Brecha digital: 20.
- Contactabilidad: 0.
- Demanda visible: 0.
- Decisión: 4.
- Total: 29.
- Acción: descartar.

## Relación con scoring actual

El repo actual tiene un scoring basado en:

- demanda visible;
- brecha digital;
- potencial comercial;
- acceso al decisor;
- urgencia.

Ese scoring es una buena base. La evolución recomendada es crear un `calculateProspectFitScore` separado para leads importados/prospectados automáticamente, manteniendo compatibilidad con `scoreLead`.

## Implementación sugerida

Módulo futuro:

```txt
src/lib/prospecting/fit-score.ts
```

Funciones sugeridas:

```ts
calculateProspectFitScore(prospect: NormalizedProspect): ProspectFitScore
applyPriorityGuards(score: ProspectFitScore, prospect: NormalizedProspect): ProspectFitScore
buildScoreReasons(prospect: NormalizedProspect): string[]
```

## Fase futura — Uso del feedback comercial

La Fase 9 no cambia el score automáticamente y no incorpora ML. Los resultados de llamadas se usan solo para observabilidad comercial: tasa de respuesta, tasa de interés, rubros con mejor respuesta y zonas con mejor respuesta.

En una fase posterior, estos datos podrán informar ajustes manuales y auditables del modelo, por ejemplo:

- subir el peso de rubros que muestran interés sostenido con suficientes intentos;
- bajar confianza en zonas con muchos intentos sin respuesta;
- detectar objeciones recurrentes para mejorar `salesAngle`, `callOpening` y `objectionHint`;
- comparar prioridad estimada contra resultados reales antes de cambiar pesos.

Cualquier ajuste futuro debe documentar la muestra usada, mantener explicación del score y evitar cambios automáticos opacos.
