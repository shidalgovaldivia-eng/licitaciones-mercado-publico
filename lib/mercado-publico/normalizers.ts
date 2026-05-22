import { statusLabel } from "@/lib/mercado-publico/status";
import type { TenderDetail, TenderLineItem, TenderListItem } from "@/lib/mercado-publico/types";

type UnknownRecord = Record<string, unknown>;

export function normalizeTenderListItem(raw: unknown): TenderListItem {
  const item = asRecord(raw);
  const buyer = asRecord(item.Comprador);
  const dates = asRecord(item.Fechas);
  const amount = numberFrom(item.MontoEstimado ?? item.MontoDisponible ?? item.Monto);
  const status = stringFrom(item.CodigoEstado ?? item.EstadoCodigo ?? item.Estado) ?? "";

  return {
    code: stringFrom(item.CodigoExterno ?? item.Codigo) ?? "sin-codigo",
    name: stringFrom(item.Nombre ?? item.NombreLicitacion) ?? "Licitación sin nombre",
    description: stringFrom(item.Descripcion),
    status,
    statusLabel: statusLabel(status),
    buyerName: stringFrom(buyer.NombreOrganismo ?? buyer.Nombre),
    buyerCode: stringFrom(buyer.CodigoOrganismo ?? buyer.Codigo),
    region: stringFrom(item.Region ?? buyer.RegionUnidad),
    type: stringFrom(item.Tipo ?? item.TipoLicitacion),
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
        stringFrom(record.Descripcion ?? record.NombreProducto ?? record.EspecificacionComprador) ??
        "Ítem sin descripción",
      quantity: numberFrom(record.Cantidad),
      unit: stringFrom(record.UnidadMedida ?? record.Unidad)
    };
  });
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
