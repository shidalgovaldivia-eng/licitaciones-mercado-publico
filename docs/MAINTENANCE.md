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

## Consideraciones

- No borra tablas normalizadas.
- No borra favoritos, alertas ni perfiles.
- No consume cuota de Mercado Publico.
- Requiere que `SUPABASE_SERVICE_ROLE_KEY` tenga permisos de `delete` sobre `licitaciones_cache` y `api_request_log`.
