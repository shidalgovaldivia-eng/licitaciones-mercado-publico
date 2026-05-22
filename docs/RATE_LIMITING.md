# Rate limiting y cache defensivo

La API de Mercado Público usa un ticket con límite diario de solicitudes. La app protege ese cupo con tres capas:

1. Cache server-side en Supabase.
2. Registro operacional de cada intento en `api_request_log`.
3. Corte preventivo antes de llegar al límite diario configurado.

## Variables de entorno

Configurar en Vercel para Production y Preview:

```bash
MERCADO_PUBLICO_TICKET=...
MERCADO_PUBLICO_DAILY_LIMIT=10000
MERCADO_PUBLICO_CACHE_TTL_MINUTES=60
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_API_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` y `ADMIN_API_KEY` son solo servidor. No deben llevar prefijo `NEXT_PUBLIC`.

## Cómo funciona

Antes de llamar a Mercado Público, `services/mercadoPublico.ts`:

1. Construye parámetros sin guardar el ticket en cache/log.
2. Busca cache vigente en `licitaciones_cache`.
3. Si hay cache vigente, devuelve cache y registra `cache_hit=true`.
4. Si no hay cache, cuenta llamadas externas del día en `api_request_log`.
5. Si el uso diario supera el 95% de `MERCADO_PUBLICO_DAILY_LIMIT`, no llama a Mercado Público.
6. En ese caso devuelve cache vencido si existe.
7. Si no hay cache vencido, responde error 429 con mensaje operativo.
8. Si puede llamar externamente, guarda respuesta en cache y registra `cache_hit=false`.

## Cache vencido

El cache vencido es un fallback defensivo. Se usa cuando:

- La cuota diaria está cerca del límite.
- Mercado Público falla y existe una respuesta anterior para la misma consulta.

La respuesta incluye metadata:

```json
{
  "cache": {
    "hit": true,
    "stale": true
  }
}
```

## Health

Endpoint:

```text
GET /api/health
```

No consulta Mercado Público para no gastar cuota. Devuelve:

- `ok`
- `missingEnvVars`
- `mercadoPublicoDailyLimit`
- `mercadoPublicoRequestsToday`
- `cacheEnabled`

Ejemplo:

```bash
curl "https://tu-dominio.vercel.app/api/health"
```

## Uso administrativo

Endpoint:

```text
GET /api/admin/api-usage
```

Requiere `ADMIN_API_KEY` por header:

```bash
curl "https://tu-dominio.vercel.app/api/admin/api-usage" \
  -H "x-admin-api-key: $ADMIN_API_KEY"
```

También acepta bearer token:

```bash
curl "https://tu-dominio.vercel.app/api/admin/api-usage" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

Devuelve:

- llamadas externas hoy
- cache hits hoy
- errores hoy
- últimas 20 llamadas

## SQL requerido

Ejecutar `lib/supabase/schema.sql` en Supabase SQL Editor. La sección nueva crea:

- `public.api_request_log`
- índices por `provider + created_at`
- índices por `resource + created_at`
- índice por `params_hash`

Las policies existentes son idempotentes con `drop policy if exists`.
