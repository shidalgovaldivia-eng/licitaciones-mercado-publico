import "server-only";
import { normalizeHtmlEntities } from "@/lib/format";
import type { PurchaseOrderDetail, PurchaseOrderItem, PurchaseOrderListItem } from "@/types/purchaseOrder";
import { searchOrdenesCompra } from "@/services/mercadoPublico";

type UnknownRecord = Record<string, unknown>;

export type PurchaseOrderSearchParams = {
  codigo?: string;
  fecha?: string;
  estado?: string;
  comprador?: string;
  proveedor?: string;
};

export async function listPurchaseOrders(params: PurchaseOrderSearchParams = {}) {
  const result = await searchOrdenesCompra(toApiParams(params));
  const orders = Array.isArray(result.data.Listado) ? result.data.Listado.map(normalizePurchaseOrderListItem) : [];

  return {
    orders,
    raw: result.data,
    cache: result.cache
  };
}

export async function getPurchaseOrderDetail(code: string) {
  const result = await searchOrdenesCompra({ codigo: code });
  const first = Array.isArray(result.data.Listado) ? result.data.Listado[0] : null;

  return first ? normalizePurchaseOrderDetail(first) : null;
}

export async function getPurchaseOrderFullDetail(code: string) {
  const result = await searchOrdenesCompra({ codigo: code });
  const first = Array.isArray(result.data.Listado) ? result.data.Listado[0] : null;

  return {
    order: first ? normalizePurchaseOrderDetail(first) : null,
    raw: result.data,
    cache: result.cache
  };
}

export function normalizePurchaseOrderListItem(raw: unknown): PurchaseOrderListItem {
  const item = asRecord(raw);
  const dates = asRecord(item.Fechas);
  const buyer = asRecord(item.Comprador);
  const supplier = asRecord(item.Proveedor);

  return {
    code: stringFrom(item.Codigo) ?? "sin-codigo",
    name: cleanText(stringFrom(item.Nombre)) ?? "Orden de compra sin nombre",
    statusCode: stringFrom(item.CodigoEstado),
    statusLabel: formatPurchaseOrderStatus(item.CodigoEstado, item.Estado),
    type: cleanText(firstString(item.Tipo, item.TipoOrdenCompra)),
    buyerName: cleanText(firstString(buyer.NombreOrganismo, item.NombreOrganismo)),
    supplierName: cleanText(firstString(supplier.Nombre, item.NombreProveedor)),
    total: numberFrom(item.Total ?? item.TotalNeto),
    currency: cleanText(firstString(item.TipoMoneda, item.Moneda, "CLP")),
    sentAt: stringFrom(dates.FechaEnvio ?? item.FechaEnvio)
  };
}

export function normalizePurchaseOrderDetail(raw: unknown): PurchaseOrderDetail {
  const item = asRecord(raw);
  const base = normalizePurchaseOrderListItem(raw);
  const dates = asRecord(item.Fechas);
  const buyer = asRecord(item.Comprador);
  const supplier = asRecord(item.Proveedor);

  return {
    ...base,
    description: cleanText(firstString(item.Descripcion, item.DescripcionOrdenCompra)),
    supplierStatus: cleanText(stringFrom(item.EstadoProveedor)),
    tenderCode: cleanText(stringFrom(item.CodigoLicitacion)),
    currency: cleanText(firstString(item.TipoMoneda, item.Moneda, base.currency, "CLP")),
    netTotal: numberFrom(item.TotalNeto),
    taxAmount: numberFrom(item.Impuestos),
    grossTotal: numberFrom(item.Total),
    taxPercent: numberFrom(item.PorcentajeIva),
    financing: cleanText(stringFrom(item.Financiamiento)),
    buyer: {
      code: firstString(buyer.CodigoOrganismo, item.CodigoOrganismo),
      name: cleanText(firstString(buyer.NombreOrganismo, item.NombreOrganismo)),
      unit: cleanText(firstString(buyer.NombreUnidad, item.NombreUnidad)),
      commune: cleanText(firstString(buyer.ComunaUnidad, item.ComunaUnidad)),
      region: cleanText(firstString(buyer.RegionUnidad, item.RegionUnidad)),
      activity: cleanText(stringFrom(buyer.Actividad)),
      contactName: cleanText(stringFrom(buyer.NombreContacto))
    },
    supplier: {
      code: firstString(supplier.Codigo, supplier.CodigoProveedor, item.CodigoProveedor),
      name: cleanText(firstString(supplier.Nombre, item.NombreProveedor)),
      rut: cleanText(firstString(supplier.RutSucursal, supplier.RutProveedor)),
      branchName: cleanText(firstString(supplier.NombreSucursal, supplier.Sucursal)),
      commune: cleanText(stringFrom(supplier.Comuna)),
      region: cleanText(stringFrom(supplier.Region)),
      activity: cleanText(stringFrom(supplier.Actividad))
    },
    dates: {
      createdAt: stringFrom(dates.FechaCreacion ?? item.FechaCreacion),
      sentAt: stringFrom(dates.FechaEnvio ?? item.FechaEnvio),
      acceptedAt: stringFrom(dates.FechaAceptacion ?? item.FechaAceptacion),
      cancelledAt: stringFrom(dates.FechaCancelacion ?? item.FechaCancelacion),
      updatedAt: stringFrom(dates.FechaUltimaModificacion ?? item.FechaUltimaModificacion)
    },
    items: normalizePurchaseOrderItems(item.Items)
  };
}

export function formatPurchaseOrderStatus(status?: unknown, fallback?: unknown) {
  const code = stringFrom(status);
  const fallbackLabel = cleanText(stringFrom(fallback));
  const labels: Record<string, string> = {
    "4": "Enviada a proveedor",
    "5": "En proceso",
    "6": "Aceptada",
    "9": "Cancelada",
    "12": "Recepcion conforme",
    "13": "Pendiente de recepcion",
    "14": "Recepcionada parcialmente",
    "15": "Recepcion conforme incompleta"
  };

  return (code && labels[code]) || fallbackLabel || code || "Sin estado";
}

function normalizePurchaseOrderItems(raw: unknown): PurchaseOrderItem[] {
  const root = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(root.Listado) ? root.Listado : [];

  return list.map((entry) => {
    const item = asRecord(entry);
    return {
      categoryCode: firstString(item.CodigoCategoria, item.CategoryCode),
      category: cleanText(stringFrom(item.Categoria)),
      productCode: firstString(item.CodigoProducto, item.ProductoCodigo),
      product: cleanText(firstString(item.Producto, item.NombreProducto)),
      buyerSpecification: cleanText(stringFrom(item.EspecificacionComprador)),
      supplierSpecification: cleanText(stringFrom(item.EspecificacionProveedor)),
      quantity: numberFrom(item.Cantidad),
      unit: cleanText(firstString(item.UnidadMedida, item.Unidad)),
      currency: cleanText(firstString(item.Moneda, item.TipoMoneda)),
      netPrice: numberFrom(item.PrecioNeto),
      total: numberFrom(item.Total)
    };
  });
}

function toApiParams(params: PurchaseOrderSearchParams) {
  return {
    codigo: params.codigo,
    fecha: params.fecha ? toMercadoPublicoDate(params.fecha) : undefined,
    estado: params.estado,
    CodigoOrganismo: params.comprador,
    CodigoProveedor: params.proveedor
  };
}

function toMercadoPublicoDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${day}${month}${year}`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const parsed = stringFrom(value);
    if (parsed) return parsed;
  }
  return undefined;
}

function cleanText(value?: string) {
  return normalizeHtmlEntities(value);
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(".", "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
