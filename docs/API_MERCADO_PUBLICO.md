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
