# Compliance and Ethics

## Principio general

Lead Radar debe usar datos públicos de negocios con moderación, trazabilidad y respeto. La herramienta prepara prospección humana personalizada; no debe automatizar spam.

## Buenas prácticas

1. Usar fuentes públicas o autorizadas.
2. Guardar fuente y fecha de consulta.
3. No contactar repetidamente a quien no quiere.
4. Respetar opt-out.
5. No recolectar datos innecesarios.
6. No evadir términos de uso ni rate limits.
7. No automatizar mensajes masivos.
8. No mezclar datos personales sensibles con datos comerciales.
9. Revisar normativa local antes de campañas.

## Datos a guardar

Campos recomendados:

```ts
source?: string;
sourceId?: string;
sourceUrl?: string;
sourceCheckedAt?: string;
doNotCallChecked?: boolean;
optOut?: boolean;
lastContactedAt?: string;
```

## Contacto humano vs spam

Aceptable:

- lista priorizada de negocios;
- llamada humana personalizada;
- mensaje individual solicitado o contextual;
- seguimiento razonable;
- registro de opt-out.

No aceptable:

- enviar cientos de mensajes automáticos;
- insistir a quien pidió no ser contactado;
- scraping agresivo;
- simular interés falso;
- ocultar identidad;
- vender datos a terceros;
- contactar datos personales no comerciales.

## Registro Nacional No Llame

Para Uruguay, considerar que puede aplicar normativa sobre llamadas o comunicaciones comerciales no solicitadas. Antes de campañas telefónicas sistemáticas, validar el encuadre legal vigente y el Registro Nacional No Llame.

Esta documentación no es asesoramiento legal. Es una guía de buenas prácticas de producto.

## Trazabilidad

Todo lead automático debe poder responder:

- ¿De dónde salió?
- ¿Cuándo se consultó?
- ¿Qué datos públicos se usaron?
- ¿Por qué se priorizó?
- ¿Qué contacto tiene?
- ¿Cuándo se contactó?
- ¿Pidió no ser contactado?

## Privacidad por diseño

- Guardar solo datos necesarios para prospección B2B.
- Evitar datos personales no comerciales.
- Evitar notas invasivas o sensibles.
- Permitir marcar `optOut`.
- Permitir eliminar leads.

## Rate limits y scraping

No diseñar features que:

- ignoren robots.txt;
- hagan crawling masivo sin control;
- saturen servicios públicos;
- descarguen sistemáticamente datos de servicios no pensados para bulk;
- evadan restricciones técnicas.

Preferir datasets abiertos o APIs oficiales.

## Lenguaje comercial ético

No usar presión ni engaño.

Evitar:

```txt
Tu presencia digital está mal.
Están perdiendo muchísima plata.
Tu competencia te está pasando por arriba.
```

Preferir:

```txt
Vi una oportunidad de ordenar mejor la presencia digital.
No encontré una web propia clara.
La idea sería complementar lo que ya hacen en redes.
```

## Riesgos

- Daño reputacional por parecer spam.
- Datos desactualizados.
- Contactar a quien no corresponde.
- Confundir dato comercial con dato personal.
- Depender de fuentes con términos restrictivos.

## Reglas de producto

- Ninguna función debe enviar mensajes automáticamente sin confirmación humana explícita.
- Los exports deben incluir fuente y fecha.
- La UI debe permitir marcar opt-out/no contactar.
- Los leads sin contacto claro no deben aparecer como prioridad alta.
- Las corridas automáticas deben generar lista, no contactar.
