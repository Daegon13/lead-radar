# Lead Radar — Plan de desarrollo por patches y prompts para Codex

## Propósito

Este documento define el plan de implementación incremental de **Lead Radar**, una herramienta interna mínima para MarinDev orientada a registrar, puntuar y priorizar negocios locales como prospectos comerciales. El proyecto debe mantenerse como **MVP logístico interno**, sin desvíos hacia un CRM complejo ni arquitectura innecesaria.

El sistema debe respetar estas restricciones base:

- Sin auth.
- Sin backend.
- Sin base de datos.
- Sin Prisma.
- Sin scraping.
- Sin integraciones externas.
- Persistencia solo en `localStorage`.
- Importación/exportación vía JSON.
- Stack: **Next.js + TypeScript + Tailwind + App Router**.

La lógica funcional base incluye score sobre 100 por demanda visible, brecha digital, potencial comercial, acceso al decisor y señales de urgencia; prioridad automática A/B/C/D; estados comerciales simples; próximas acciones; lista principal, formulario, detalle y ajustes. Estas reglas salen directamente del brief original del proyecto. fileciteturn3file1 fileciteturn3file2 fileciteturn3file3

---

## Nombre oficial del proyecto

Usar de forma consistente en UI, metadata y documentación:

**Lead Radar**

---

## Comando base de creación del repositorio

```bash
npx create-next-app@latest lead-radar --typescript --tailwind --app --src-dir --import-alias "@/*"
```

### Pasos inmediatos post-bootstrap

```bash
cd lead-radar
npm run dev
```

### Regla de trabajo

Cada patch debe salir como **un PR autocontenido**, pequeño, verificable y sin mezclar objetivos.

Formato sugerido de ramas:

- `codex/patch-01-foundation`
- `codex/patch-02-list-storage`
- `codex/patch-03-form-create-edit`
- `codex/patch-04-detail-status-notes`
- `codex/patch-05-settings-import-export`
- `codex/patch-06-optional-kanban-demo-flag`

---

## Estructura objetivo del proyecto

```txt
src/
  app/
    globals.css
    layout.tsx
    page.tsx
    leads/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx
      [id]/edit/
        page.tsx
    settings/
      page.tsx

  components/
    layout/
      app-shell.tsx
      topbar.tsx
    ui/
      badge.tsx
      button.tsx
      input.tsx
      select.tsx
      textarea.tsx
    leads/
      lead-table.tsx
      lead-filters.tsx
      lead-score-card.tsx
      lead-form.tsx
      lead-detail.tsx
      status-quick-actions.tsx

  hooks/
    use-leads.ts

  lib/
    constants.ts
    scoring.ts
    storage.ts
    utils.ts

  data/
    seed-leads.ts

  types/
    lead.ts
```

---

## Reglas de implementación para Codex

Estas reglas aplican a **todos** los patches:

1. Mantener la app **client-side** para el dominio del negocio.
2. App Router solo para vistas; no inventar server actions ni loaders complejos.
3. La lógica de scoring debe quedar en `src/lib/scoring.ts` y ser pura.
4. Los tipos deben vivir en `src/types/lead.ts`.
5. La persistencia debe encapsularse en `src/lib/storage.ts` y/o `src/hooks/use-leads.ts`.
6. No introducir librerías nuevas salvo que eliminen complejidad real. Por defecto, **no agregar ninguna**.
7. No reemplazar la estructura del proyecto por una arquitectura enterprise.
8. No agregar charts, auth, analytics, APIs, ORM, testing pesado ni features no pedidas.
9. Cada patch debe dejar la app corriendo con `npm run dev` sin errores de TypeScript.
10. Cada PR debe incluir una pequeña actualización del `README.md` si cambia la forma de usar la app.

---

## Roadmap de patches

| Patch | Objetivo | Resultado visible |
|---|---|---|
| 01 | Fundación del proyecto | Tipos, scoring, constantes, seed, shell mínima |
| 02 | Lista principal + persistencia | Vista de leads con filtros básicos y localStorage |
| 03 | Alta/edición | Crear y editar leads con score automático |
| 04 | Detalle + estados + notas | Vista completa del lead y gestión operativa |
| 05 | Ajustes + import/export | Backup JSON, restore y reset con confirmación |
| 06 (opcional) | Kanban liviano + demo flag | Extra útil si no rompe simplicidad |

---

# PATCH 01 — Fundación del proyecto

## Objetivo

Construir la base tipada, modular y estable del proyecto para que el resto de los patches trabajen encima sin reestructurar luego.

## Alcance

- Reemplazar la homepage por redirección a `/leads`.
- Crear layout base y shell visual mínima.
- Crear `types/lead.ts`.
- Crear `lib/constants.ts`.
- Crear `lib/scoring.ts` con reglas iniciales.
- Crear `data/seed-leads.ts` con 6 a 10 leads realistas.
- Crear `lib/utils.ts` con helpers mínimos.
- Crear `app/leads/page.tsx` base usando datos seed en memoria.
- Definir metadata básica del proyecto como **Lead Radar**.

## No incluir en este patch

- Persistencia real en localStorage.
- Formularios de alta/edición.
- Vista detalle.
- Import/export.

## Criterios de aceptación

- La app abre en `/leads`.
- Se ve una lista inicial con leads seed.
- El scoring ya existe como módulo puro y devuelve total, prioridad, breakdown y resumen.
- Los tipos del dominio están definidos de manera estricta.

## Archivos esperados

- `src/types/lead.ts`
- `src/lib/constants.ts`
- `src/lib/scoring.ts`
- `src/lib/utils.ts`
- `src/data/seed-leads.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/leads/page.tsx`

## Prompt para Codex

```text
Quiero que implementes el PATCH 01 de un proyecto interno llamado Lead Radar.

Contexto del proyecto:
- Es una herramienta interna mínima para MarinDev.
- No es SaaS.
- No tendrá auth, backend, base de datos, Prisma, scraping ni integraciones externas.
- Stack obligatorio: Next.js + TypeScript + Tailwind + App Router.
- Persistencia final será localStorage, pero en este patch todavía no.
- La app debe permitir registrar, puntuar y priorizar negocios locales para ofrecerles una web, mini auditoría o demo.

Objetivo de este patch:
Construir la fundación tipada y modular del proyecto.

Implementá exactamente esto:
1. Redirigir `/` a `/leads`.
2. Configurar metadata y naming consistente con “Lead Radar”.
3. Crear `src/types/lead.ts` con tipos estrictos para:
   - Lead
   - LeadStatus
   - NextAction
   - Priority
   - ScoreBreakdown
   - tipos auxiliares para digitalPresenceQuality, commercialPotential, decisionMakerAccess y urgencySignal.
4. Crear `src/lib/constants.ts` con:
   - nombre de app
   - estados permitidos
   - próximas acciones permitidas
5. Crear `src/lib/scoring.ts` como módulo puro con las reglas:
   - Demanda visible 0–25 según rating/reseñas
   - Brecha digital 0–30
   - Potencial comercial 0–20
   - Acceso al decisor 0–15
   - Señales de urgencia 0–10
   - prioridad A/B/C/D según score total
   - recomendación automática: Llamar hoy / Contactar por DM o WhatsApp / Guardar para follow-up / No priorizar
6. Crear `src/data/seed-leads.ts` con 6 a 10 leads realistas de distintos rubros y distintos scores/estados.
7. Crear helpers mínimos en `src/lib/utils.ts` solo si aportan claridad.
8. Crear una primera `src/app/leads/page.tsx` simple que renderice la tabla/lista usando el seed.
9. Crear layout visual sobrio, productivo y limpio, sin diseño recargado.

Restricciones:
- No agregar librerías.
- No agregar localStorage todavía.
- No crear formularios todavía.
- No crear detalle todavía.
- No sobreingenierizar.

Entrega esperada:
- Código listo para correr con `npm run dev`.
- TypeScript sin errores.
- Lista inicial funcional en `/leads`.
```

---

# PATCH 02 — Lista principal + persistencia local

## Objetivo

Convertir la lista seed en una lista real persistida en `localStorage`, con filtros y orden útiles para uso diario.

## Alcance

- Crear `lib/storage.ts`.
- Crear `hooks/use-leads.ts`.
- Persistir y cargar datos desde `localStorage`.
- Inicializar desde seed solo si no existen datos guardados.
- Crear tabla/lista principal reusable.
- Agregar:
  - búsqueda por nombre
  - filtro por rubro
  - filtro por prioridad
  - filtro por estado
  - orden por score descendente
- Botón visible para crear lead nuevo.
- Badges claros para score, prioridad y estado.

## No incluir en este patch

- Formulario completo.
- Vista detalle.
- Import/export.

## Criterios de aceptación

- Al recargar, los leads persisten.
- Si no hay datos, carga seed automáticamente.
- La lista se puede filtrar y ordenar por score.
- Se ve rápidamente nombre, rubro, zona, score, prioridad, estado y próxima acción.

## Archivos esperados

- `src/lib/storage.ts`
- `src/hooks/use-leads.ts`
- `src/components/leads/lead-table.tsx`
- `src/components/leads/lead-filters.tsx`
- ajustes en `src/app/leads/page.tsx`

## Prompt para Codex

```text
Implementá el PATCH 02 para Lead Radar.

Base ya existente:
- Proyecto Next.js + TypeScript + Tailwind + App Router.
- Ya existen tipos del dominio, scoring, constantes, seed y una lista inicial en `/leads`.

Objetivo de este patch:
Agregar persistencia local real y convertir la lista principal en una vista operativa útil.

Implementá exactamente esto:
1. Crear `src/lib/storage.ts` para:
   - cargar leads desde localStorage
   - guardar leads en localStorage
   - inicializar con seed si no hay datos
2. Crear `src/hooks/use-leads.ts` para encapsular:
   - estado de leads
   - carga inicial
   - guardado automático al modificar
   - funciones base como setLeads, addLead, updateLead, getLeadById si simplifica
3. Crear `src/components/leads/lead-table.tsx` reusable.
4. Crear `src/components/leads/lead-filters.tsx` con:
   - búsqueda por nombre
   - filtro por rubro
   - filtro por prioridad
   - filtro por estado
5. Mantener orden por score descendente.
6. Mostrar en la lista al menos:
   - nombre
   - rubro
   - zona
   - score
   - prioridad
   - estado
   - próxima acción
7. Incluir badges claros para prioridad A/B/C/D y estado.
8. Agregar botón visible “Nuevo lead” que apunte a `/leads/new` aunque esa pantalla todavía sea placeholder si hace falta.
9. Mantener UI sobria, rápida y enfocada en productividad.

Restricciones:
- No agregar librerías.
- No crear todavía el formulario funcional completo.
- No crear todavía la vista detalle.
- No agregar paginación, charts ni features extra.

Entrega esperada:
- Lista principal funcionando con localStorage.
- Filtros útiles.
- Seed inicial cargado solo en primera vez.
- Código limpio y sin sobreingeniería.
```

---

# PATCH 03 — Alta y edición de lead

## Objetivo

Permitir crear y editar leads de forma rápida, con score automático en tiempo real y persistencia correcta.

## Alcance

- Crear pantalla `/leads/new`.
- Crear pantalla `/leads/[id]/edit`.
- Crear `components/leads/lead-form.tsx` reusable.
- Incluir todos los campos mínimos del brief.
- Calcular score automáticamente al editar inputs relevantes.
- Mostrar score total, prioridad, breakdown resumido y recomendación.
- Al guardar:
  - crear lead nuevo
  - editar lead existente
  - actualizar `updatedAt`
- Validación mínima práctica:
  - nombre requerido
  - rubro requerido
  - zona requerida
  - selects obligatorios para variables comerciales

## Campos mínimos a implementar

- nombre del negocio
- rubro
- zona / barrio / ciudad
- dirección opcional
- rating
- cantidad de reseñas
- tiene web sí/no
- url del sitio opcional
- instagram opcional
- whatsapp opcional
- teléfono opcional
- calidad de presencia digital
- potencial del rubro
- acceso al decisor
- señales de urgencia
- observaciones del problema detectado
- estado del lead
- próxima acción
- fecha de seguimiento opcional
- notas internas
- demo recomendada (checkbox simple, opcional pero útil)

## Criterios de aceptación

- Crear un lead en menos de 1 minuto.
- Ver score y prioridad antes de guardar.
- Editar un lead existente sin perder datos.
- Guardar en localStorage correctamente.

## Archivos esperados

- `src/components/leads/lead-form.tsx`
- `src/components/leads/lead-score-card.tsx`
- `src/app/leads/new/page.tsx`
- `src/app/leads/[id]/edit/page.tsx`
- ampliaciones en `src/hooks/use-leads.ts`

## Prompt para Codex

```text
Implementá el PATCH 03 para Lead Radar.

Base existente:
- Tipos, scoring, constantes, seed.
- Lista principal con filtros.
- Persistencia local en localStorage.

Objetivo:
Agregar alta y edición de leads con cálculo automático del score.

Implementá exactamente esto:
1. Crear `src/components/leads/lead-form.tsx` como formulario reusable para crear y editar.
2. Crear `src/components/leads/lead-score-card.tsx` para mostrar:
   - score total
   - prioridad
   - recomendación automática
   - breakdown resumido por dimensión
3. Crear `/leads/new`.
4. Crear `/leads/[id]/edit`.
5. El formulario debe incluir todos los campos mínimos del negocio, presencia pública, evaluación comercial, gestión comercial y notas.
6. El score debe recalcularse en tiempo real al cambiar inputs relevantes.
7. Al guardar un lead:
   - si es nuevo, crear id, createdAt y updatedAt
   - si es edición, mantener createdAt y actualizar updatedAt
8. Guardar todo usando la capa ya existente de localStorage/use-leads.
9. Validación mínima práctica, sin sobrecargar UX.
10. La interfaz debe seguir siendo sobria y rápida.

Restricciones:
- No agregar React Hook Form ni librerías extra.
- No agregar autosave complejo.
- No agregar historial de cambios todavía.
- No agregar modal complejo.

Entrega esperada:
- Crear lead.
- Editar lead.
- Score visible en tiempo real.
- Persistencia correcta.
```

---

# PATCH 04 — Detalle del lead + estados + notas

## Objetivo

Agregar la vista operativa donde realmente se consulta y gestiona cada lead individualmente.

## Alcance

- Crear `/leads/[id]`.
- Crear `components/leads/lead-detail.tsx`.
- Mostrar todos los datos del lead agrupados en secciones claras.
- Mostrar explicación del puntaje con breakdown completo.
- Mostrar notas internas.
- Permitir acciones rápidas:
  - editar
  - cambiar estado
  - cambiar próxima acción
  - toggle de demo recomendada si ya existe
- Agregar historial básico de cambios **solo si es barato**.

## Recomendación pragmática

No hacer historial formal en este patch salvo que realmente salga casi gratis. Si complica, dejarlo fuera.

## Criterios de aceptación

- Desde la tabla puedo entrar a un lead.
- Veo por qué tiene ese score.
- Puedo actualizar estado y próxima acción rápidamente.
- Puedo consultar notas y datos de contacto sin navegar a otra parte.

## Archivos esperados

- `src/app/leads/[id]/page.tsx`
- `src/components/leads/lead-detail.tsx`
- `src/components/leads/status-quick-actions.tsx` (opcional)

## Prompt para Codex

```text
Implementá el PATCH 04 para Lead Radar.

Base existente:
- Lista principal con filtros.
- Persistencia local.
- Formulario reusable de alta/edición.
- Scoring en tiempo real.

Objetivo:
Agregar vista detalle del lead y acciones operativas rápidas.

Implementá exactamente esto:
1. Crear `/leads/[id]`.
2. Crear `src/components/leads/lead-detail.tsx`.
3. Mostrar en la vista detalle:
   - identificación del negocio
   - datos de presencia pública
   - evaluación comercial
   - resultado del score
   - explicación del puntaje con breakdown completo
   - estado actual
   - próxima acción
   - fecha de seguimiento
   - notas internas
4. Agregar acciones rápidas para:
   - ir a editar
   - cambiar estado
   - cambiar próxima acción
   - marcar/desmarcar demo recomendada si el campo ya existe
5. Mantener la UI enfocada en productividad y lectura rápida.
6. Si el historial básico de cambios sale casi gratis, podés incluir solo “creado” y “última actualización”; si no, no lo agregues.

Restricciones:
- No inventar timeline complejo.
- No agregar comentarios múltiples.
- No agregar sistema CRM.
- No agregar features no pedidas.

Entrega esperada:
- Vista detalle útil y clara.
- Gestión rápida de estado y próxima acción.
- Breakdown del score visible y entendible.
```

---

# PATCH 05 — Ajustes, import/export JSON y pulido final del MVP

## Objetivo

Cerrar el MVP mínimo aceptable con portabilidad de datos, restore simple y pulido de navegación/UX.

## Alcance

- Crear `/settings`.
- Exportar leads a JSON descargable.
- Importar leads desde JSON.
- Resetear datos con confirmación.
- Agregar navegación simple entre `/leads` y `/settings`.
- Ajustar pequeños detalles de UX:
  - estados vacíos
  - mensajes de error de importación
  - confirmaciones claras
  - botón de volver
  - consistencia visual de badges y cards

## Criterios de aceptación

- Exporto todos los datos a JSON.
- Puedo reimportarlos.
- Puedo resetear el estado local sin romper la app.
- La app queda lista para usar de verdad como herramienta interna.

## Archivos esperados

- `src/app/settings/page.tsx`
- mejoras en `src/lib/storage.ts`
- mejoras en navegación/layout

## Prompt para Codex

```text
Implementá el PATCH 05 para Lead Radar.

Base existente:
- Lista principal funcional.
- Persistencia local.
- Alta/edición.
- Vista detalle.

Objetivo:
Cerrar el MVP con ajustes simples e import/export JSON.

Implementá exactamente esto:
1. Crear `/settings`.
2. Implementar exportación de todos los leads a un archivo JSON descargable.
3. Implementar importación desde archivo JSON con validación básica de estructura.
4. Implementar acción de resetear datos con confirmación explícita.
5. Agregar navegación simple y consistente entre vistas.
6. Pulir UX mínima:
   - estados vacíos
   - feedback al importar bien/mal
   - botones claros
   - consistencia visual general
7. Mantener todo client-side usando localStorage.

Restricciones:
- No agregar backend.
- No agregar sincronización remota.
- No agregar ajustes innecesarios.
- No sobrecomplicar la validación del JSON.

Entrega esperada:
- MVP completo según brief.
- Export/import funcional.
- Reset con confirmación.
- App lista para uso interno.
```

---

# PATCH 06 — Opcional, solo si no complica

## Objetivo

Agregar uno o dos extras útiles sin romper simplicidad.

## Opciones permitidas

- Vista kanban simple por estado.
- Indicador visual de “merece demo”.
- Checkbox `demoRecommended` si no se agregó antes.

## Regla

Este patch **no existe** si el MVP de patch 05 todavía no quedó sólido.

## Prompt para Codex

```text
Implementá el PATCH 06 opcional para Lead Radar solo si el MVP base ya está sólido.

Objetivo:
Agregar una mejora pequeña de alto valor sin aumentar demasiado la complejidad.

Elegí solo una o dos de estas opciones:
1. Vista kanban simple por estado.
2. Indicador visual más claro de “merece demo”.
3. Checkbox o badge de demo recomendada si todavía no existe.

Restricciones:
- No agregar drag and drop complejo.
- No agregar librerías nuevas.
- No convertir la app en CRM.
- Mantener código simple y consistente con la base existente.

Entrega esperada:
- Una mejora real de usabilidad.
- Sin comprometer claridad ni mantenibilidad.
```

---

## Orden exacto de ejecución recomendado

1. Crear repo con `create-next-app`.
2. Ejecutar PATCH 01.
3. Revisar manualmente que scoring, seed y estructura estén sólidos.
4. Ejecutar PATCH 02.
5. Verificar persistencia y filtros.
6. Ejecutar PATCH 03.
7. Verificar alta/edición y score automático.
8. Ejecutar PATCH 04.
9. Verificar flujo operativo real.
10. Ejecutar PATCH 05.
11. Recién después evaluar PATCH 06.

---

## Checklist de revisión por PR

Usar este checklist antes de mergear cualquier patch:

- `npm run dev` levanta sin errores.
- No hay features fuera del alcance del patch.
- No se introdujeron dependencias innecesarias.
- La UI sigue siendo sobria y operativa.
- El score se mantiene consistente con las reglas del brief.
- No se rompió la persistencia existente.
- No aparecen tipos `any` evitables.
- No se agregaron archivos muertos o duplicados.
- El código sigue una estructura simple y ampliable.

---

## Definición de terminado del MVP

La versión base se considera terminada cuando se cumplen estos puntos:

- Crear un lead en menos de 1 minuto.
- Ver score calculado automáticamente.
- Filtrar por prioridad.
- Marcar siguiente acción.
- Guardar notas.
- Cerrar la app y volver sin perder datos.
- Exportar todo a JSON.
- Reimportarlo después.

Eso coincide exactamente con los criterios de aceptación pedidos para esta herramienta interna. fileciteturn3file3

---

## Recomendación final de estrategia

No intentes acelerar mezclando patches. Para este proyecto conviene más:

- PRs chicos
- superficie de cambio controlada
- cada patch usable por sí mismo
- cero abstracciones prematuras

La velocidad real acá no sale de meter más cosas por PR, sino de reducir retrabajo.
