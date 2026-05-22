# Normalizacion de datos Mercado Publico

La API de Mercado Publico no entrega exactamente los mismos campos en listado y detalle. Por eso la app centraliza el mapeo en:

- `normalizeTenderListItem(raw)`: normaliza resultados de busqueda.
- `normalizeTenderDetail(raw)`: normaliza detalle completo por codigo e incluye items.
- `buildMercadoPublicoUrl(code)`: construye una URL publica de busqueda por codigo. No usa la URL interna de detalle porque puede requerir permisos o sesion.

## Campos frecuentes en listado

El listado suele traer:

- `CodigoExterno` o `Codigo`
- `Nombre`
- `CodigoEstado` o `Estado`
- `Fechas.FechaPublicacion`
- `Fechas.FechaCierre`
- algunos datos de comprador cuando vienen en `Comprador`
- monto estimado solo en algunas respuestas

## Campos frecuentes solo en detalle

El detalle por codigo suele traer datos mas completos:

- `Comprador.NombreOrganismo`
- `Comprador.CodigoOrganismo`
- `Comprador.NombreUnidad`
- `Comprador.RegionUnidad`
- `Comprador.ComunaUnidad`
- `Fechas.FechaInicioPreguntas`
- `Fechas.FechaFinalPreguntas`
- `Fechas.FechaAdjudicacion`
- `Items.Listado`
- rangos o estimaciones de monto en campos como `Estimacion`, `RangoMonto`, `MontoEstimadoMin` y `MontoEstimadoMax`

## Enriquecimiento desde cache

Para evitar llamadas innecesarias a Mercado Publico, el listado no consulta el detalle de cada licitacion. En cambio:

1. Normaliza el listado recibido.
2. Revisa detalles ya cacheados en `licitaciones_cache`.
3. Completa comprador, codigo organismo, region, tipo, categoria, fechas o monto si el listado venia incompleto.

Esto mejora calidad visible sin romper el rate limiting ni gastar cuota diaria con llamadas N+1.

## Monto o rango

La UI muestra `amountText` cuando la API entrega una estimacion textual o rango. Si no existe, usa `amount` como monto CLP. Si ninguno existe, muestra `No informado`.
