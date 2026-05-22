# Estructura del proyecto

```text
.
├── app/
├── components/
├── docs/
├── lib/
├── services/
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## `app/`

Contiene rutas App Router de Next.js.

### Páginas

- `app/page.tsx`: entrada principal, renderiza el listado.
- `app/licitaciones/page.tsx`: alias explícito para listado.
- `app/licitaciones/[code]/page.tsx`: detalle visual de una licitación.
- `app/dashboard/page.tsx`: dashboard analítico.
- `app/not-found.tsx`: estado 404.
- `app/layout.tsx`: layout raíz.
- `app/globals.css`: estilos globales Tailwind.

### API routes

- `app/api/tenders/route.ts`: listado paginado y filtrado.
- `app/api/tenders/[code]/route.ts`: detalle normalizado.
- `app/api/tenders/[code]/full/route.ts`: detalle completo con raw payload.
- `app/api/dashboard/summary/route.ts`: resumen analítico.
- `app/api/health/route.ts`: health operacional.
- `app/api/admin/api-usage/route.ts`: uso de API/cache protegido.

## `components/`

Componentes UI reutilizables.

- `tenders-shell.tsx`: experiencia principal del listado.
- `filter-panel.tsx`: filtros.
- `tender-card.tsx`: tarjeta de licitación.
- `status-badge.tsx`: badge de estado.
- `main-nav.tsx`: navegación entre secciones.

## `services/`

Capa server-side de casos de uso e integraciones.

- `mercadoPublico.ts`: integración central con Mercado Público, cache y rate limiting.
- `apiRequestLog.ts`: registro y resumen de uso de API.
- `dashboardSummary.ts`: cálculo de KPIs para dashboard.

Regla: esta carpeta puede usar secretos server-side, pero nunca debe importarse desde componentes `use client`.

## `lib/`

Utilidades y dominio.

### `lib/env.ts`

Lectura y validación de variables de entorno.

### `lib/mercado-publico/`

- `types.ts`: tipos de licitaciones y respuestas.
- `normalizers.ts`: limpieza de datos crudos.
- `status.ts`: labels de estados.

## Modulo Ordenes de Compra

Archivos agregados para compras reales del Estado:

- `app/ordenes-compra/page.tsx`: listado visual.
- `app/ordenes-compra/[code]/page.tsx`: detalle visual.
- `app/api/purchase-orders/route.ts`: API interna de listado.
- `app/api/purchase-orders/[code]/route.ts`: API interna de detalle normalizado.
- `app/api/purchase-orders/[code]/full/route.ts`: API interna con respuesta cruda.
- `components/purchase-orders-shell.tsx`: filtros, paginacion y modos de vista.
- `components/purchase-order-card.tsx`: tarjetas y filas compactas.
- `services/ordenesCompra.ts`: integracion, normalizacion y estados.
- `types/purchaseOrder.ts`: tipos normalizados.

El service usa `services/mercadoPublico.ts`, por lo que hereda cache Supabase, rate limiting y `api_request_log`.
- `client.ts`: interfaz de dominio para licitaciones.

### `lib/supabase/`

- `client.ts`: cliente browser opcional.
- `schema.sql`: SQL idempotente de tablas, RLS, policies, grants e índices.

### `lib/format.ts`

Helpers de formato de fechas y moneda.

## `docs/`

Documentación técnica:

- `ARCHITECTURE.md`
- `DEPLOYMENT.md`
- `RATE_LIMITING.md`
- `PROJECT_STRUCTURE.md`
- `API_MERCADO_PUBLICO.md`
- `ROADMAP.md`

## Cache

La cache vive en Supabase, tabla `licitaciones_cache`.

El código que la lee/escribe está en:

- `services/mercadoPublico.ts`
- `services/dashboardSummary.ts`

## Dashboard

El dashboard usa:

- `app/dashboard/page.tsx`
- `app/api/dashboard/summary/route.ts`
- `services/dashboardSummary.ts`

Primero intenta leer cache. Si no hay datos, consulta Mercado Público vía service.

## Convenciones

- UI cliente: `components/*` con `"use client"` solo cuando es necesario.
- Integraciones externas: `services/*`.
- Normalización: `lib/mercado-publico/normalizers.ts`.
- Variables: solo vía `lib/env.ts`.
- SQL: mantener idempotente.
