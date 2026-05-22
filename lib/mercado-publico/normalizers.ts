import { statusLabel } from "@/lib/mercado-publico/status";
import type { TenderDetail, TenderLineItem, TenderListItem } from "@/lib/mercado-publico/types";

type UnknownRecord = Record<string, unknown>;

export function normalizeTenderListItem(raw: unknown): TenderListItem {
  const item = asRecord(raw);
  const buyer = asRecord(item.Comprador);
  const dates = asRecord(item.Fechas);
  const items = normalizeLineItems(item.Items);
  const status = stringFrom(item.CodigoEstado ?? item.EstadoCodigo ?? item.Estado) ?? "";
  const normalizedBuyer = normalizeBuyer(buyer, item);
  const amount = numberFrom(
    item.MontoEstimado ?? item.MontoDisponible ?? item.Monto ?? item.TotalEstimado ?? item.ValorTotal
  );
  const category = cleanText(
    firstString(item.Categoria, item.CategoriaLicitacion, item.NombreCategoria, item.Rubro, items[0]?.category)
  );
  const categoryCode = firstString(item.CodigoCategoria, item.CodigoRubro, items[0]?.categoryCode);

  return {
    code: stringFrom(item.CodigoExterno ?? item.Codigo) ?? "sin-codigo",
    name: cleanText(stringFrom(item.Nombre ?? item.NombreLicitacion)) ?? "Licitación sin nombre",
    description: cleanDescription(
      firstString(item.Descripcion, item.DescripcionLicitacion, item.Nombre, item.NombreLicitacion)
    ),
    status,
    statusLabel: statusLabel(status),
    buyer: normalizedBuyer,
    buyerName: normalizedBuyer.name,
    buyerCode: normalizedBuyer.code,
    category,
    categoryCode,
    region: cleanText(firstString(item.Region, item.RegionUnidad, normalizedBuyer.region, buyer.RegionUnidad)),
    type: cleanText(stringFrom(item.Tipo ?? item.TipoLicitacion)),
    amount,
    publishDate: stringFrom(dates.FechaPublicacion ?? item.FechaPublicacion),
    closeDate: stringFrom(dates.FechaCierre ?? item.FechaCierre)
  };
}

export function normalizeTenderDetail(raw: unknown): TenderDetail {
  const item = asRecord(raw);
  const dates = asRecord(item.Fechas);
  const listItem = normalizeTenderListItem(raw);

  return {
    ...listItem,
    questionStartDate: stringFrom(dates.FechaInicioPreguntas),
    questionEndDate: stringFrom(dates.FechaFinalPreguntas),
    awardDate: stringFrom(dates.FechaAdjudicacion),
    items: normalizeLineItems(item.Items)
  };
}

function normalizeLineItems(raw: unknown): TenderLineItem[] {
  const itemRoot = asRecord(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(itemRoot.Listado)
      ? itemRoot.Listado
      : Array.isArray(itemRoot.Item)
        ? itemRoot.Item
        : [];

  return list.map((line, index) => {
    const record = asRecord(line);

    return {
      id: stringFrom(record.Correlativo ?? record.CodigoProducto ?? index) ?? String(index),
      description:
        cleanDescription(stringFrom(record.Descripcion ?? record.NombreProducto ?? record.EspecificacionComprador)) ??
        "Ítem sin descripción",
      category: cleanText(firstString(record.Categoria, record.NombreCategoria, record.Rubro)),
      categoryCode: firstString(record.CodigoCategoria, record.CodigoRubro, record.CodigoProducto),
      quantity: numberFrom(record.Cantidad),
      unit: cleanText(stringFrom(record.UnidadMedida ?? record.Unidad))
    };
  });
}

function normalizeBuyer(buyer: UnknownRecord, item: UnknownRecord) {
  return {
    code: firstString(buyer.CodigoOrganismo, buyer.Codigo, item.CodigoOrganismo),
    name: cleanText(firstString(buyer.NombreOrganismo, buyer.Nombre, item.NombreOrganismo)),
    unitCode: firstString(buyer.CodigoUnidad, item.CodigoUnidad),
    unitName: cleanText(firstString(buyer.NombreUnidad, item.NombreUnidad)),
    region: cleanText(firstString(buyer.RegionUnidad, buyer.Region, item.Region, item.RegionUnidad)),
    commune: cleanText(firstString(buyer.ComunaUnidad, buyer.Comuna, item.Comuna))
  };
}

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return {};
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const parsed = stringFrom(value);
    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function cleanText(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\s+/g, " ").trim() || undefined;
}

function cleanDescription(value?: string) {
  return cleanText(value?.replace(/<[^>]*>/g, " "));
}

function numberFrom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(".", "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
