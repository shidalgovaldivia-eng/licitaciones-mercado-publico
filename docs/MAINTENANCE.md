# Mantenimiento operacional

Este documento describe tareas manuales para mantener controlado el crecimiento de datos operativos en Supabase.

## Limpieza de cache y logs

Endpoint:

```http
POST /api/admin/cleanup-cache
```

Proteccion:

- Requiere `ADMIN_API_KEY`.
- Se puede enviar como header `x-admin-api-key`.
- Tambien acepta `Authorization: Bearer <ADMIN_API_KEY>`.

Ejemplo:

```bash
curl -X POST "https://TU_DOMINIO/api/admin/cleanup-cache" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

## Que elimina

La tarea es manual y no se ejecuta automaticamente.

- `licitaciones_cache`: elimina registros con `expires_at < now() - interval '7 days'`.
- `api_request_log`: elimina registros con `created_at < now() - interval '30 days'`.

La respuesta devuelve los cortes usados y la cantidad de filas eliminadas.

```json
{
  "ok": true,
  "cacheCutoff": "2026-05-16T12:00:00.000Z",
  "logCutoff": "2026-04-23T12:00:00.000Z",
  "deletedCacheRows": 42,
  "deletedApiRequestLogRows": 120
}
```

## Cuando ejecutarlo

Recomendacion inicial:

- Ejecutarlo manualmente una vez por semana si el uso crece.
- Revisar `/api/admin/api-usage` antes y despues si se quiere auditar actividad.
- No automatizar hasta tener claro el volumen real en produccion.

## Enriquecimiento automatizado

La app incluye un endpoint para ejecutar enriquecimiento en segundo plano:

```http
GET /api/cron/enrich-tenders
```

Proteccion:

- Requiere `CRON_SECRET`.
- Debe enviarse como `Authorization: Bearer <CRON_SECRET>`.
- No usa secretos por query string.
- En Vercel Cron, si `CRON_SECRET` existe como variable de entorno, Vercel envia automaticamente el header `Authorization: Bearer <CRON_SECRET>`.

Configuracion Vercel:

```json
{
  "crons": [
    {
      "path": "/api/cron/enrich-tenders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Este cron corre una vez por hora y procesa hasta 100 detalles por ejecucion. Es una configuracion conservadora para no gastar la cuota diaria de Mercado Publico rapidamente.

La ruta cron usa limites fijos conservadores:

- `limit=50`
- `batches=2`
- maximo 100 detalles por ejecucion

El endpoint admin mantiene parametros manuales:

Para ejecuciones manuales mas grandes:

```bash
curl -X POST "https://TU_DOMINIO/api/admin/enrich-tenders?limit=100&batches=5" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

Revisar avance:

```bash
curl "https://TU_DOMINIO/api/admin/enrichment-status" \
  -H "x-admin-api-key: TU_ADMIN_API_KEY"
```

Probar cron localmente:

```bash
curl -X POST "http://localhost:3000/api/cron/enrich-tenders" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

Probar cron de ordenes de compra localmente:

```bash
curl -X POST "http://localhost:3000/api/cron/enrich-purchase-orders" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

La ruta cron de ordenes usa limites fijos conservadores:

- `limit=25`
- `batches=1`
- maximo 25 detalles por ejecucion normal
- lock `purchase_orders_enrichment`

## Enriquecimiento progresivo de ordenes de compra

`/ordenes-compra` carga primero el listado rapido de Mercado Publico. Ese listado puede venir incompleto porque la API normalmente entrega solo codigo, nombre y estado.

Despues de pintar la pagina visible, el frontend detecta ordenes incompletas y llama en segundo plano:

```bash
curl -X POST "http://localhost:3000/api/purchase-orders/enrich" \
  -H "Content-Type: application/json" \
  -d "{\"codes\":[\"1020-144-SE26\"]}"
```

Reglas operativas:

- Maximo 20 codigos por request.
- Concurrencia interna acotada.
- Primero revisa `purchase_orders_normalized`.
- Si ya existe detalle normalizado, lo reutiliza.
- Si falta detalle, consulta Mercado Publico usando cache/rate limiting existente.
- Guarda el resultado con `upsert` por `code`, evitando duplicados.
- Una orden fallida no corta el resto del lote.

La respuesta del cron incluye:

- `processed`: codigos intentados.
- `updated`: licitaciones enriquecidas correctamente.
- `failed`: fallidas.
- `skipped`: cupos no usados porque no habia pendientes.
- `durationMs`: duracion total.
- `requestsToday`: llamadas externas registradas hoy.

Control de concurrencia:

- Se usa la tabla `enrichment_locks`.
- Si el cron ya esta corriendo, una segunda ejecucion responde `locked=true` y no procesa.
- Si un proceso queda pegado, el lock expira a los 15 minutos.
- Licitaciones usan lock `tenders_enrichment`.
- Ordenes de compra usan lock `purchase_orders_enrichment`.

Control de reintentos:

- Cada licitacion normalizada tiene `enrichment_status`, `enrichment_error` y `retry_count`.
- Cada orden de compra normalizada usa los mismos campos de control.
- Solo se procesan registros `pending` o `failed`.
- No se procesan registros con `retry_count >= 3`.
- Registros `running` antiguos se marcan como `failed` para evitar que queden bloqueados.

## Riesgos de crecimiento

Tablas que mas pueden crecer:

- `licitaciones_cache`: guarda respuestas crudas, incluyendo listados y detalles.
- `api_request_log`: guarda cada lectura cache/API para visibilidad operacional.
- `tenders_normalized`: guarda campos normalizados y snapshot JSONB del detalle.

Mitigaciones:

- Mantener lotes cron acotados.
- Borrar cache vencido con `/api/admin/cleanup-cache`.
- Borrar logs antiguos mayor a 30 dias.
- No enriquecer todo en requests de usuario.
- Si la base crece demasiado, reducir el campo JSONB `normalized` a campos estrictamente necesarios.

Recomendacion inicial:

- Cron horario `limit=50&batches=2`.
- Ejecuciones manuales grandes solo en horario bajo trafico.
- Monitorear `/api/admin/performance` y `/api/admin/enrichment-status`.

## Consideraciones

- No borra tablas normalizadas.
- No borra favoritos, alertas ni perfiles.
- No consume cuota de Mercado Publico.
- Requiere que `SUPABASE_SERVICE_ROLE_KEY` tenga permisos de `delete` sobre `licitaciones_cache` y `api_request_log`.
