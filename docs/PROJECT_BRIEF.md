# Lead Radar — Project Brief

## Resumen

Lead Radar es una herramienta de prospección comercial local-first para ayudar a Diego a conseguir clientes de desarrollo web freelance. Su evolución natural es pasar de un CRM manual a un radar automático de oportunidades comerciales.

El sistema debe encontrar negocios locales con presencia digital débil, sin sitio web propio o con web deficiente, pero solo cuando haya señales de que el negocio puede pagar, necesita mejorar su conversión digital y es contactable.

La frase guía del producto es:

> Lead Radar no busca negocios sin web; busca negocios con dinero, necesidad comercial y brecha digital detectable.

## Problema que resuelve

La prospección manual consume demasiado tiempo y suele producir leads fríos:

- negocios que no tienen presupuesto;
- negocios sin contacto claro;
- negocios que no entienden el valor de una web;
- rubros de bajo margen;
- contactos sin argumento comercial concreto;
- listas grandes pero poco accionables.

Lead Radar debe resolver ese problema entregando una lista chica, priorizada y explicada.

## Usuario principal

El usuario principal es Diego, desarrollador freelance que vende sitios web, landings y presencia digital a negocios locales.

Necesidades de Diego:

- Encontrar oportunidades sin pasar horas buscando en Google/Maps/redes.
- Priorizar rubros con mayor capacidad adquisitiva.
- Detectar negocios con brecha digital real.
- Tener un argumento de llamada personalizado.
- Evitar llamadas totalmente frías.
- Registrar estado, seguimiento y próxima acción.
- Aprender qué rubros convierten mejor con el tiempo.

## Resultado esperado

El resultado ideal del producto no es una base enorme de datos. Es una cola diaria o semanal como esta:

| Prioridad | Negocio | Rubro | Zona | Brecha detectada | Contacto | Acción |
|---|---|---|---|---|---|---|
| A | Clínica Dental Norte | Odontología | Pocitos | Sin web propia + WhatsApp público | Teléfono | Llamar hoy |
| A | Estética Aurora | Estética premium | Punta Carretas | Solo Instagram + rubro visual | WhatsApp | Llamar hoy |
| B | Arq. Estudio Sur | Arquitectura | Cordón | Web débil sin CTA | Email | Enviar diagnóstico |

Cada lead debe venir con explicación:

- Por qué fue priorizado.
- Qué problema digital probable tiene.
- Qué ángulo de venta conviene usar.
- Qué objeción puede aparecer.
- Qué próxima acción recomienda el sistema.

## Qué es Lead Radar

Lead Radar es:

- Un CRM local-first para leads comerciales.
- Un radar de oportunidades digitales.
- Un sistema de scoring comercial.
- Un detector de brecha digital.
- Una herramienta para preparar llamadas de venta.
- Una base para automatizar búsqueda de negocios contactables.

## Qué NO es Lead Radar

Lead Radar no es:

- Un spammer.
- Un scraper masivo sin control.
- Un bot para enviar mensajes automáticos.
- Un CRM genérico sin criterio comercial.
- Una lista enorme de contactos basura.
- Una herramienta para violar términos de uso de plataformas.
- Una app que dependa exclusivamente de Google Places.

## Diferencia entre lead común y oportunidad comercial

Un lead común puede ser simplemente:

> Barbería X — no tiene web.

Una oportunidad comercial debe verse así:

> Barbería X — zona comercial, marca visual fuerte, Instagram activo, teléfono visible, no se detecta web propia, rubro con conversión por WhatsApp, argumento: consolidar presencia propia y captar búsquedas desde Google.

La diferencia es que la oportunidad tiene contexto, valor y siguiente acción.

## Principio comercial

Diego no debe llamar diciendo:

> Te vendo una web.

Debe llamar desde un diagnóstico:

> Estuve mirando negocios de tu rubro en la zona. Vi que tienen presencia en redes/mapas, pero no encontré una página propia clara para captar búsquedas desde Google y ordenar consultas por WhatsApp.

Ese enfoque convierte una llamada fría en una conversación con observación real.

## Visión final

La herramienta ideal permite:

1. Elegir ciudad, zona y rubro.
2. Consultar o importar fuentes de datos públicas.
3. Filtrar negocios con potencial real.
4. Detectar brecha digital.
5. Puntuar leads.
6. Generar argumento comercial.
7. Crear cola de llamadas.
8. Registrar resultados.
9. Aprender qué señales predicen cierre.

## Métrica de éxito

La métrica principal no es cantidad de leads generados. Es:

- Leads A/B útiles por corrida.
- Tasa de contacto.
- Tasa de interés.
- Reuniones agendadas.
- Propuestas enviadas.
- Cierres.
- Tiempo ahorrado por oportunidad encontrada.

## Estrategia inicial

La evolución recomendada:

1. Documentar criterios.
2. Refactorizar mocks a provider interface.
3. Crear CLI local con CSV/JSON.
4. Normalizar y deduplicar.
5. Detectar brecha digital.
6. Implementar fit score explicable.
7. Integrar resultados a `/prospecting`.
8. Crear cola de llamadas.
9. Agregar feedback loop.
10. Automatizar corridas programadas.
