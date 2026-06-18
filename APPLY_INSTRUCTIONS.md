# Cómo aplicar este paquete de documentación

1. Copiar `AGENTS.md` a la raíz del repo.
   - El repo ya tiene un `AGENTS.md` mínimo de Next.js.
   - Este archivo nuevo preserva esas reglas y agrega las reglas del producto Lead Radar.

2. Copiar la carpeta `docs/` completa a la raíz del repo.

3. Abrir `README_DOCUMENTATION_SECTION.md` y copiar la sección sugerida dentro del `README.md` actual.

4. Ejecutar validación:

```bash
npm run lint
npm run build
```

Como estos cambios son Markdown, no deberían romper la app.

5. Crear commit recomendado:

```bash
git add AGENTS.md docs README.md
git commit -m "docs: add Lead Radar product documentation"
```

## Qué incluye

- Instrucciones para agentes.
- Brief del proyecto.
- ICP por rubros.
- Scoring comercial.
- Detección de brecha digital.
- Fuentes de datos.
- Arquitectura objetivo.
- Motor de prospección.
- Modelo de datos.
- Playbook de ventas.
- Compliance/ética.
- Roadmap.
- Criterios de aceptación.

## Qué NO incluye

- No implementa motor automático.
- No agrega dependencias.
- No toca código funcional.
- No modifica package.json.
- No automatiza scraping.
- No automatiza mensajes.
