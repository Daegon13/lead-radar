This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Importación de leads (JSON / CSV)

En **Settings → Importar** podés cargar archivos `.json` o `.csv`. Antes de confirmar, la app muestra:

- Cantidad total de registros.
- Registros válidos.
- Registros descartados y motivo.

### Reglas de importación

- La validación final se hace con el mismo normalizador interno de `Lead`.
- Si faltan `id`, `createdAt` o `updatedAt`, se generan automáticamente.
- Se aplica deduplicación simple por `businessName + address` (o `businessName + location` si no hay `address`).

### CSV esperado (encabezados)

Podés usar estas columnas (mínimo requerido: `businessName`):

```csv
businessName,category,location,address,rating,reviewCount,hasWebsite,websiteUrl,instagram,whatsapp,phone,status,nextAction,notes
Cafe Central,Cafetería,CABA,Av. Siempre Viva 123,4.6,120,true,https://cafecentral.example,@cafecentral,+541122233344,+541143211234,new,follow_up,Primera importación
```

### Equivalencia de columnas CSV → `Lead`

- `businessName` / `name` / `business` → `businessName`
- `category` / `rubro` → `category`
- `location` / `city` / `localidad` → `location`
- `address` / `direccion` → `address`
- `websiteUrl` / `website` / `sitioWeb` → `websiteUrl`
- `phone` / `telefono` → `phone`
- `reviewCount` / `reviews` → `reviewCount`
- `createdAt`, `updatedAt`, `status`, `nextAction`, `notes`, etc. mantienen el mismo nombre
