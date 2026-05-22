# Radar Licitaciones Chile

Plataforma Next.js para buscar y seguir licitaciones públicas de Mercado Público Chile.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase client y esquema inicial
- pnpm vía Corepack

## Configuración

```bash
corepack prepare pnpm@10.24.0 --activate
pnpm install
cp .env.example .env.local
```

Variables:

```bash
MERCADO_PUBLICO_TICKET=tu_ticket_de_chilecompra
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_publishable_key
```

En Vercel configura las tres variables para `Production` y `Preview`. `NEXT_PUBLIC_SUPABASE_URL` debe ser la URL del proyecto, no la key. `NEXT_PUBLIC_SUPABASE_ANON_KEY` debe ser la anon/publishable key, no la URL.

## Desarrollo

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

## Probar conexiones

Con el servidor levantado:

```bash
pnpm dev
```

Abre:

```text
http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "ok": true,
  "env": {
    "mercadoPublicoTicket": true,
    "supabaseUrl": true,
    "supabaseAnonKey": true
  }
}
```

Si Supabase responde que falta `tender_alerts`, ejecuta primero el SQL de `lib/supabase/schema.sql` en el SQL Editor de Supabase.

## Funcionalidades primera versión

- Listado de licitaciones consultado server-side contra Mercado Público.
- Búsqueda por palabra, código u organismo.
- Filtros por estado, fecha, comprador y rango de monto.
- Página de detalle por código de licitación.
- Favoritos locales en el navegador.
- Base SQL inicial para favoritos y alertas en Supabase.

## Supabase

El archivo `lib/supabase/schema.sql` incluye tablas y políticas RLS para:

- `profiles`
- `favorite_tenders`
- `tender_alerts`

Las alertas persistentes y favoritos multi-dispositivo quedan preparados como siguiente iteración.
