# Oct 3D (monorepo)

Calculadora pública de precios MakerWorld + panel interno `/ops` (catálogo, presupuestos, pedidos).

## Estructura

```
apps/web          Next.js (calculadora + /ops)
packages/pricing  Fórmula de precios compartida
packages/db       Prisma + Postgres (Neon)
```

## Setup local

1. Creá un proyecto Postgres en [Neon](https://neon.tech).
2. Copiá variables de entorno:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/web/.env.example packages/db/.env
```

Completá `DATABASE_URL`, `NEXTAUTH_SECRET` / `AUTH_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

3. Instalación y DB:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

- Calculadora: [http://localhost:3603](http://localhost:3603)
- Panel: [http://localhost:3603/ops](http://localhost:3603/ops) (login con el admin del seed)

## Deploy Vercel

1. En el proyecto Vercel, **Root Directory** = `apps/web`.
2. **Install Command**: `cd ../.. && npm install`
3. **Build Command**: `cd ../.. && npm run build`
4. Env vars: `DATABASE_URL`, `NEXTAUTH_URL` (URL de producción), `NEXTAUTH_SECRET`, `AUTH_SECRET`, `ADMIN_*`.
5. Una vez: con la misma `DATABASE_URL`, corré localmente `npm run db:push` y `npm run db:seed`.
