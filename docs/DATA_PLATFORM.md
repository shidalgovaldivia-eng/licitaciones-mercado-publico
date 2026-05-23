# Data Platform Foundation

Este hito crea catalogos internos reutilizables desde datos ya normalizados en Supabase. No consume llamadas nuevas a Mercado Publico.

## Tablas

### `buyers_normalized`

Consolida organismos compradores desde:

- `tenders_normalized`
- `purchase_orders_normalized`

Campos principales:

- `buyer_key`: clave interna estable para upsert.
- `buyer_code`: codigo oficial si existe.
- `buyer_name`: nombre normalizado.
- `region`
- `total_tenders`
- `total_purchase_orders`
- `total_amount`
- `last_activity_at`
- `source_updated_at`

### `suppliers_normalized`

Consolida proveedores desde ordenes de compra normalizadas.

Campos principales:

- `supplier_key`: clave interna estable para upsert.
- `supplier_code`: codigo oficial si existe.
- `supplier_name`
- `total_orders`
- `total_amount`
- `last_activity_at`
- `source_updated_at`

### `categories_normalized`

Consolida categorias desde licitaciones y ordenes.

Campos principales:

- `category_key`: clave interna estable para upsert.
- `category_code`: codigo oficial si existe.
- `category_name`
- `tender_count`
- `purchase_order_count`
- `total_amount`
- `last_activity_at`

## Estrategia de claves

Cuando existe codigo oficial, la clave interna usa el codigo:

```text
buyer:code:<codigo>
supplier:code:<codigo>
category:code:<codigo>
```

Cuando falta codigo, usa fallback por nombre normalizado:

```text
buyer:name:<slug>
supplier:name:<slug>
category:name:<slug>
```

Esto permite `upsert` idempotente sin duplicar entidades cuando Mercado Publico no entrega codigos completos.

## Endpoint admin

Reconstruir catalogos:

```bash
curl -X POST "https://TU_DOMINIO/api/admin/rebuild-catalogs" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

Respuesta:

```json
{
  "ok": true,
  "buyersProcessed": 120,
  "suppliersProcessed": 80,
  "categoriesProcessed": 45,
  "durationMs": 350,
  "errors": []
}
```

Validar calidad:

```bash
curl "https://TU_DOMINIO/api/admin/catalog-quality" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

Respuesta resumida:

```json
{
  "ok": true,
  "buyers": {
    "total": 120,
    "withoutCode": 15,
    "withoutRegion": 8,
    "withTenders": 90,
    "withPurchaseOrders": 60,
    "topByAmount": []
  },
  "suppliers": {
    "total": 80,
    "withoutCode": 10,
    "withOrders": 80,
    "topByAmount": []
  },
  "categories": {
    "total": 45,
    "withoutCode": 30,
    "withTenders": 25,
    "withPurchaseOrders": 35,
    "topByAmount": []
  },
  "source": {
    "enrichedPurchaseOrders": 500,
    "pendingPurchaseOrders": 20,
    "failedPurchaseOrders": 3,
    "totalPurchaseAmount": 125000000,
    "dataQualityPercent": 82
  },
  "alerts": []
}
```

Ejemplos locales:

```bash
curl -X POST "http://localhost:3000/api/admin/rebuild-catalogs" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"

curl "http://localhost:3000/api/admin/catalog-quality" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

Ejemplos Vercel:

```bash
curl -X POST "https://TU_DOMINIO/api/admin/rebuild-catalogs" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"

curl "https://TU_DOMINIO/api/admin/catalog-quality" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

## Alertas de calidad

`/api/admin/catalog-quality` devuelve alertas simples cuando:

- mas del 50% de compradores no tiene codigo,
- mas del 50% de proveedores no tiene codigo,
- `total_amount` esta en cero para casi todos los registros principales,
- no hay categorias suficientes,
- no hay ordenes de compra enriquecidas.

## Uso en dashboard

La seccion `Inteligencia de compra publica` de `/dashboard` consume el mismo servicio interno de calidad de catalogos.
No llama Mercado Publico y no modifica datos.

Muestra:

- total de organismos compradores, proveedores y categorias,
- monto total comprado desde `purchase_orders_normalized.gross_total`,
- ordenes enriquecidas, pendientes y fallidas,
- porcentaje de calidad calculado desde codigos presentes en catalogos,
- top 5 organismos, proveedores y categorias por monto,
- alertas de calidad operativa.

Si las tablas estan vacias o aun no se han reconstruido los catalogos, el dashboard muestra un estado vacio claro en vez de fallar.

## Reglas

- No llama la API de Mercado Publico.
- No borra datos existentes.
- Usa `upsert`.
- Tolera campos nulos como codigos, region, montos o categorias.
- Usa `gross_total` de ordenes de compra para montos.
- Las licitaciones aportan conteos y categorias, pero no montos monetarios cuando solo existe rango UTM.

## Uso futuro

Estos catalogos habilitan:

- rankings de compradores y proveedores,
- filtros por organismo/proveedor/categoria,
- paginas publicas `/organismos`, `/proveedores`, `/categorias`,
- dashboard mas consistente,
- futuras recomendaciones o IA sobre datos ya consolidados.
