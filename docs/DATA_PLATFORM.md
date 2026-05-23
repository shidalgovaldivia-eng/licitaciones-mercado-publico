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
