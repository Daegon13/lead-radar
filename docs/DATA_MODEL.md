# Data Model

## Estado actual

El tipo principal actual es `Lead`.

Campos existentes destacados:

```ts
type Lead = {
  id: string;
  businessName: string;
  category: string;
  location: string;
  address?: string;
  rating: number | null;
  reviewCount: number;
  hasWebsite: boolean;
  websiteUrl?: string;
  instagram?: string;
  whatsapp?: string;
  phone?: string;
  digitalPresenceQuality: "none" | "weak" | "acceptable" | "strong";
  commercialPotential: "low" | "medium" | "high";
  decisionMakerAccess: "none" | "gatekeeper" | "reachable" | "direct";
  urgencySignal: "none" | "low" | "medium" | "high";
  problemObservation?: string;
  status: LeadStatus;
  nextAction: NextAction;
  followUpDate?: string;
  notes?: string;
  demoRecommended?: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Este modelo ya sirve como base, pero necesita campos opcionales para prospección automática.

## Principio de compatibilidad

No romper leads existentes.

Los nuevos campos deben ser opcionales al principio. La importación debe seguir aceptando archivos viejos.

## Campos nuevos sugeridos

```ts
type LeadProspectingMetadata = {
  source?: string;
  sourceId?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  confidence?: number;
  gapSignals?: string[];
  scoreReasons?: string[];
  digitalGapLevel?: 0 | 1 | 2 | 3 | 4 | 5;
  salesAngle?: string;
  callOpening?: string;
  objectionHint?: string;
  lastContactedAt?: string;
  doNotCallChecked?: boolean;
  optOut?: boolean;
};
```

Se puede extender `Lead` con estos campos opcionales:

```ts
type Lead = ExistingLead & LeadProspectingMetadata;
```

## Descripción de campos

| Campo | Tipo | Uso |
|---|---|---|
| `source` | string | Nombre de fuente: `csv`, `overture`, `osm`, etc. |
| `sourceId` | string | ID original del provider |
| `sourceUrl` | string | URL de ficha/fuente si existe |
| `sourceCheckedAt` | string ISO | Fecha de consulta/importación |
| `confidence` | number 0-1 | Confianza del dato |
| `gapSignals` | string[] | Señales de brecha digital |
| `scoreReasons` | string[] | Razones del score |
| `digitalGapLevel` | 0-5 | Nivel de brecha digital |
| `salesAngle` | string | Ángulo comercial |
| `callOpening` | string | Apertura de llamada sugerida |
| `objectionHint` | string | Objeción probable y respuesta |
| `lastContactedAt` | string ISO | Último contacto |
| `doNotCallChecked` | boolean | Si se verificó restricción de llamada |
| `optOut` | boolean | No contactar |

## Campos obligatorios para Lead

Para la app actual:

- `id`
- `businessName`
- `category`
- `location`
- `rating`
- `reviewCount`
- `hasWebsite`
- `digitalPresenceQuality`
- `commercialPotential`
- `decisionMakerAccess`
- `urgencySignal`
- `status`
- `nextAction`
- `createdAt`
- `updatedAt`

## Campos mínimos para ProspectedLead

Para un lead automático útil:

- `businessName`/`name`
- `category`
- `location` o coordenadas
- `source`
- `sourceCheckedAt`
- `digitalGapLevel`
- `gapSignals`
- `scoreReasons`
- `priority`
- `nextAction`

Para prioridad A/B además:

- teléfono, WhatsApp, email o red social.

## Import/export

La importación actual debe seguir funcionando.

Reglas:

- Si faltan campos nuevos, asignar valores por defecto o dejarlos `undefined`.
- Si faltan `id`, `createdAt`, `updatedAt`, generarlos.
- Si faltan campos de scoring manual, inferir desde datos de prospección cuando sea posible.
- No rechazar archivos viejos solo por no tener metadata.

## CSV recomendado futuro

```csv
businessName,category,location,address,phone,whatsapp,email,instagram,websiteUrl,source,sourceId,sourceCheckedAt,confidence,digitalGapLevel,gapSignals,scoreReasons,salesAngle,callOpening,objectionHint,nextAction,notes
```

Para arrays como `gapSignals` y `scoreReasons`, usar separador ` | ` o JSON string.

## Normalización

### Nombre

- Trim.
- Colapsar espacios.
- Remover caracteres decorativos innecesarios.
- Generar `normalizedName` para dedupe.

### URL

- Agregar `https://` si falta y se verifica.
- Normalizar trailing slash.
- Detectar redes sociales.

### Teléfono/WhatsApp

- Mantener formato original visible.
- Generar formato normalizado interno si se implementa dedupe por teléfono.

### Categoría

Mapear categorías de fuentes a categorías comerciales Lead Radar:

- `dentist`, `odontologia`, `clínica dental` → `Odontología`.
- `beauty_salon`, `estética`, `spa` → `Estética premium` si hay señales.
- `real_estate_agency`, `inmobiliaria` → `Inmobiliaria`.

## Migración por etapas

### Etapa 1

Agregar campos opcionales sin cambiar UI.

### Etapa 2

Mostrar `gapSignals` y `scoreReasons` en detalle.

### Etapa 3

Mostrar `salesAngle` y `callOpening` en cola de llamadas.

### Etapa 4

Persistir historial de corridas y resultados.

## Riesgos

- Tipos demasiado rígidos antes de entender datos reales.
- Mezclar RawProspect con Lead final.
- Romper import/export por campos nuevos obligatorios.
- Guardar datos sin fuente.
- No distinguir confianza baja de lead malo.
