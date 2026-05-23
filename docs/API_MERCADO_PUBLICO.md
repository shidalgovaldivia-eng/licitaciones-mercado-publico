# API Mercado Público / ChileCompra

Referencia operativa para la integración del proyecto. Fuentes oficiales consultadas:

- ChileCompra, API de Mercado Público: https://www.chilecompra.cl/api/
- Diccionario oficial de Licitaciones: https://api.mercadopublico.cl/documentos/Documentaci%C3%B3n%20API%20Mercado%20Publico%20-%20Licitaciones.pdf
- Diccionario oficial de Órdenes de Compra: https://api.mercadopublico.cl/documentos/Documentaci%C3%B3n%20API%20de%20Mercado%20P%C3%BAblico%20-%20%C3%93rdenes%20de%20Compra.pdf

## Base

```text
https://api.mercadopublico.cl/servicios/v1
```

Todas las consultas requieren `ticket`. La documentación oficial muestra JSON, JSONP y XML. Para esta app usamos JSON.

```bash
curl "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?estado=activas&ticket=$MERCADO_PUBLICO_TICKET"
```

## Licitaciones

Endpoint:

```text
GET /publico/licitaciones.json
```

Parámetros soportados documentados:

| Parámetro | Uso | Ejemplo |
| --- | --- | --- |
| `ticket` | Token de acceso | `ticket=$MERCADO_PUBLICO_TICKET` |
| `codigo` | Detalle por código de licitación | `codigo=1509-5-L114` |
| `fecha` | Fecha en formato `ddmmaaaa` | `fecha=12062026` |
| `estado` | Estado del proceso | `estado=activas` |
| `CodigoOrganismo` | Código de organismo comprador | `CodigoOrganismo=6945` |
| `CodigoProveedor` | Código de proveedor | `CodigoProveedor=17793` |

Estados documentados:

| Código/API | Estado |
| --- | --- |
| `activas` | Licitaciones publicadas al día de consulta |
| `5` / `Publicada` | Publicada |
| `6` / `Cerrada` | Cerrada |
| `7` / `Desierta` | Desierta |
| `8` / `Adjudicada` | Adjudicada |
| `18` / `Revocada` | Revocada |
| `19` / `Suspendida` | Suspendida |
| `todos` | Todos los estados |

Ejemplos:

```bash
curl "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo=1509-5-L114&ticket=$MERCADO_PUBLICO_TICKET"
curl "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=12062026&estado=adjudicada&ticket=$MERCADO_PUBLICO_TICKET"
curl "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?fecha=12062026&CodigoOrganismo=6945&ticket=$MERCADO_PUBLICO_TICKET"
```

Respuesta JSON esperada, resumida:

```json
{
  "Cantidad": 1,
  "FechaCreacion": "2026-06-12T00:00:00",
  "Version": "v1",
  "Listado": [
    {
      "CodigoExterno": "1509-5-L114",
      "Nombre": "Nombre de la licitación",
      "CodigoEstado": 5,
      "Descripcion": "Descripción del requerimiento",
      "Comprador": {
        "CodigoOrganismo": "6945",
        "NombreOrganismo": "Organismo comprador",
        "RegionUnidad": "Región Metropolitana"
      },
      "Fechas": {
        "FechaPublicacion": "2026-06-12T10:00:00",
        "FechaCierre": "2026-06-20T15:00:00"
      },
      "Items": {
        "Listado": [
          {
            "Correlativo": 1,
            "Descripcion": "Producto o servicio solicitado",
            "Cantidad": 1,
            "UnidadMedida": "Unidad"
          }
        ]
      }
    }
  ]
}
```

Nota de diseño: si se consulta por `codigo`, la API entrega detalle; si se consulta por fecha/estado/organismo/proveedor, entrega información básica del día.

## Órdenes de compra

Endpoint:

```text
GET /publico/ordenesdecompra.json
```

Nota de parámetros: la documentación oficial muestra `CodigoOrganismo` y `CodigoProveedor` combinados con `fecha`. En la app solo se envían estos filtros a Mercado Público cuando existe fecha. Los estados elegidos en la UI se traducen a los valores textuales documentados antes de llamar la API.

Parámetros soportados documentados:

| Parámetro | Uso | Ejemplo |
| --- | --- | --- |
| `ticket` | Token de acceso | `ticket=$MERCADO_PUBLICO_TICKET` |
| `codigo` | Detalle por código de orden de compra | `codigo=2097-241-SE14` |
| `fecha` | Fecha en formato `ddmmaaaa` | `fecha=12062026` |
| `estado` | Estado de la OC | `estado=aceptada` |
| `CodigoOrganismo` | Código de organismo comprador | `CodigoOrganismo=6945` |
| `CodigoProveedor` | Código de proveedor | `CodigoProveedor=17793` |

Estados documentados:

| Código | Estado |
| --- | --- |
| `4` / `enviadaproveedor` | Enviada a proveedor |
| `5` | En proceso |
| `6` / `aceptada` | Aceptada |
| `9` / `cancelada` | Cancelada |
| `12` / `recepcionconforme` | Recepción conforme |
| `13` / `pendienterecepcion` | Pendiente de recepcionar |
| `14` | Recepcionada parcialmente |
| `15` | Recepción conforme incompleta |
| `todos` | Todos |

Mapeo usado por la app:

| UI / Codigo | Valor enviado a API |
| --- | --- |
| `4` | `enviadaproveedor` |
| `5` | `enproceso` |
| `6` | `aceptada` |
| `9` | `cancelada` |
| `12` | `recepcionconforme` |
| `13` | `pendienterecepcion` |
| `14` | `recepcionadaparcialmente` |
| `15` | `recepcionconformeincompleta` |

Ejemplos:

```bash
curl "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?codigo=2097-241-SE14&ticket=$MERCADO_PUBLICO_TICKET"
curl "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?fecha=12062026&estado=aceptada&ticket=$MERCADO_PUBLICO_TICKET"
curl "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?fecha=12062026&CodigoProveedor=17793&ticket=$MERCADO_PUBLICO_TICKET"
```

Respuesta JSON esperada, resumida:

```json
{
  "Cantidad": 1,
  "FechaCreacion": "2026-06-12T00:00:00",
  "Version": "v1",
  "Listado": [
    {
      "Codigo": "2097-241-SE14",
      "Nombre": "Orden de compra",
      "CodigoEstado": 6,
      "CodigoLicitacion": "1509-5-L114",
      "Comprador": {
        "CodigoOrganismo": "6945",
        "NombreOrganismo": "Organismo comprador"
      },
      "Proveedor": {
        "Codigo": "17793",
        "Nombre": "Proveedor adjudicado"
      }
    }
  ]
}
```

### Implementacion en la app

Endpoints internos:

| Endpoint | Uso |
| --- | --- |
| `GET /api/purchase-orders` | Listado paginado con filtros `codigo`, `fecha`, `estado`, `q`, `comprador`, `proveedor`. |
| `GET /api/purchase-orders/[code]` | Detalle normalizado por codigo. |
| `GET /api/purchase-orders/[code]/full` | Detalle normalizado, respuesta cruda y metadata de cache. |
| `POST /api/purchase-orders/enrich` | Enriquecimiento progresivo por lote, maximo 20 codigos por request. |

Recursos de cache/log:

| Resource | Uso |
| --- | --- |
| `purchase_orders:list` | Listados de ordenes de compra. |
| `purchase_orders:detail` | Detalle por codigo. |

Campos normalizados en detalle:

- comprador: `Comprador.NombreOrganismo`, `CodigoOrganismo`, `NombreUnidad`, `ComunaUnidad`, `RegionUnidad`, `Actividad`, `NombreContacto`.
- proveedor: `Proveedor.Nombre`, `Codigo`, `RutSucursal`, `Comuna`, `Region`, `Actividad`.
- montos: `TotalNeto`, `PorcentajeIva`, `Impuestos`, `Total`, `TipoMoneda`.
- fechas: `Fechas.FechaCreacion`, `FechaEnvio`, `FechaAceptacion`, `FechaCancelacion`.
- items: `Items.Listado[].Categoria`, `Producto`, `EspecificacionComprador`, `Cantidad`, `Moneda`, `PrecioNeto`.

Los nombres de proveedor se limpian con `normalizeHtmlEntities()` porque Mercado Publico puede devolver entidades como `SOCIEDAD M&amp;F SPA`.

El listado de ordenes puede venir incompleto. La app carga rapido la pagina visible y luego consulta detalles en background con `/api/purchase-orders/enrich`, guardando resultados normalizados en `purchase_orders_normalized` mediante `upsert` por `code`.

## Organismos compradores

La documentación pública de ChileCompra referencia búsquedas de empresas compradoras bajo:

```text
GET /Publico/Empresas/BuscarComprador
```

Uso recomendado en la app:

- Usar `CodigoOrganismo` en licitaciones y órdenes de compra como identificador estable.
- Construir un catálogo propio de organismos desde respuestas de licitaciones/OC y enriquecerlo incrementalmente.
- Mantener la búsqueda directa de comprador como integración secundaria porque su contrato público está menos detallado que licitaciones/OC.

Ejemplo exploratorio:

```bash
curl "https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarComprador?texto=ministerio&ticket=$MERCADO_PUBLICO_TICKET"
```

Ejemplo JSON esperado, resumido:

```json
{
  "Cantidad": 1,
  "Listado": [
    {
      "CodigoOrganismo": "6945",
      "NombreOrganismo": "Organismo comprador",
      "RegionUnidad": "Región"
    }
  ]
}
```

## Proveedores

La documentación pública permite filtrar licitaciones y órdenes de compra por `CodigoProveedor`. Para búsqueda/catálogo de proveedores, usar el namespace `Publico/Empresas` cuando esté disponible y validar contrato con pruebas reales.

Uso recomendado:

- Priorizar `CodigoProveedor` desde órdenes de compra y adjudicaciones.
- Cachear y normalizar proveedor desde respuestas crudas.
- Evitar depender de un endpoint de búsqueda de proveedor hasta tener contrato confirmado con el ticket productivo.

Ejemplo por órdenes de compra:

```bash
curl "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json?fecha=12062026&CodigoProveedor=17793&ticket=$MERCADO_PUBLICO_TICKET"
```

## Cache e incrementalidad

Tabla: `public.licitaciones_cache`.

Estrategia actual:

- Cache por `resource + params` sin incluir `ticket`.
- TTL corto para listados: 10 minutos.
- TTL largo para detalle por código: 24 horas.
- Si no existe `SUPABASE_SERVICE_ROLE_KEY`, la app consulta Mercado Público directo y reporta `cache.enabled=false`.

Estrategia incremental recomendada:

1. Cada 10-15 minutos consultar `estado=activas`.
2. Guardar respuesta cruda en `licitaciones_cache`.
3. Para códigos nuevos, consultar detalle por `codigo` y cachearlo por 24 horas.
4. Una vez al día reprocesar estados finales de los últimos 7-14 días: cerrada, adjudicada, desierta, revocada y suspendida.
5. Persistir entidades normalizadas en tablas dedicadas cuando se agregue IA: licitaciones, organismos, proveedores, items, adjudicaciones.

## Campos de listado vs detalle

En las pruebas con `/api/tenders/[code]/full`, el detalle por codigo entrega mas campos que el listado diario o por estado. El listado puede venir incompleto para tarjetas, especialmente en comprador y monto.

Campos frecuentes en listado:

| Campo | Uso en app | Observacion |
| --- | --- | --- |
| `CodigoExterno` / `Codigo` | Codigo licitacion | Identificador estable para detalle. |
| `Nombre` | Titulo | Se usa como titulo principal. |
| `CodigoEstado` / `Estado` | Estado | Se normaliza con `statusLabel()`. |
| `Descripcion` | Descripcion | Puede venir corta o vacia. |
| `Fechas.FechaPublicacion` | Fecha publicacion | Cuando no existe, puede venir top-level. |
| `Fechas.FechaCierre` | Fecha cierre | En detalle puede venir dentro de `Fechas` aunque `FechaCierre` top-level sea `null`. |
| `Comprador` | Comprador | En listados puede faltar o venir parcial. |

Campos frecuentes solo o mejor poblados en detalle:

| Campo | Uso en app |
| --- | --- |
| `Comprador.CodigoOrganismo` | Codigo organismo comprador. |
| `Comprador.NombreOrganismo` | Nombre organismo comprador. |
| `Comprador.CodigoUnidad` | Codigo unidad compradora. |
| `Comprador.NombreUnidad` | Unidad compradora. |
| `Comprador.ComunaUnidad` | Comuna. |
| `Comprador.RegionUnidad` | Region. |
| `Tipo` | Tipo de licitacion, por ejemplo `LE`. |
| `CodigoTipo` | Codigo interno del tipo. No se muestra crudo. |
| `Estimacion` | Codigo de rango de monto. No es monto monetario. |
| `MontoEstimado` | Monto numerico cuando Mercado Publico lo informa. Puede venir `null`. |
| `Moneda` | Moneda del monto numerico, usualmente `CLP`. |
| `Items.Listado` | Items solicitados, cantidades, unidad y categoria. |

## Interpretacion de monto y rango

Mercado Publico puede entregar el monto como numero real o como codigo interno de estimacion. La app no muestra codigos crudos como `2`.

Ejemplo real de detalle:

```json
{
  "Tipo": "LE",
  "Moneda": "CLP",
  "Estimacion": 2,
  "MontoEstimado": null
}
```

Interpretacion:

| Valor | Significado UI |
| --- | --- |
| `Estimacion: 1` | Menor a 100 UTM |
| `Estimacion: 2` | Entre 100 y 1000 UTM |
| `Estimacion: 3` | Entre 1000 y 2000 UTM |
| `Estimacion: 4` | Entre 2000 y 5000 UTM |
| `Estimacion: 5` | Igual o superior a 5000 UTM |
| `Tipo: LE` | Entre 100 y 1000 UTM |
| `Tipo: LP` | Entre 1000 y 2000 UTM |
| `Tipo: LQ` | Entre 2000 y 5000 UTM |
| `Tipo: LR` | Igual o superior a 5000 UTM |

Regla de normalizacion:

1. Si existe un rango legible, se muestra como texto.
2. Si existe `Estimacion` o `Tipo` con codigo conocido, se traduce a rango UTM.
3. Si existe `MontoEstimado` monetario real, se muestra como CLP.
4. Si no existe monto real ni rango interpretable, se muestra `Monto no especificado`.

El listado se enriquece con detalles ya cacheados en `licitaciones_cache`. No se hace una llamada externa por cada tarjeta, para proteger la cuota diaria del ticket.
