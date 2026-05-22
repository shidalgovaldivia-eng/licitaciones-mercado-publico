import { statusLabel } from "@/lib/mercado-publico/status";
import { formatTenderAmountRange, isProbablyRawInternalCode } from "@/lib/mercado-publico/amount";
import { formatTenderType } from "@/lib/mercado-publico/tender-types";
import type { TenderDetail, TenderLineItem, TenderListItem } from "@/lib/mercado-publico/types";

type UnknownRecord = Record<string, unknown>;

export function normalizeTenderListItem(raw: unknown): TenderListItem {
  const item = asRecord(raw);
  const buyer = asRecord(item.Comprador);
  const dates = asRecord(item.Fechas);
  const items = normalizeLineItems(item.Items);
  const status = stringFrom(item.CodigoEstado ?? item.EstadoCodigo ?? item.Estado) ?? "";
  const normalizedBuyer = normalizeBuyer(buyer, item);
  const tenderType = firstString(item.Tipo, item.TipoLicitacion, item.CodigoTipo, item.NombreTipo, item.TipoConvocatoria);
  const amount = normalizeAmountNumber(item);
  const amountText = normalizeAmountText(item);
  const category = cleanText(
    firstString(item.Categoria, item.CategoriaLicitacion, item.NombreCategoria, item.Rubro, items[0]?.category)
  );
  const categoryCode = firstString(item.CodigoCategoria, item.CodigoRubro, items[0]?.categoryCode);

  return {
    code: stringFrom(item.CodigoExterno ?? item.Codigo) ?? "sin-codigo",
    name: cleanText(stringFrom(item.Nombre ?? item.NombreLicitacion)) ?? "Licitacion sin nombre",
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
    type: formatTenderType(tenderType),
    amount,
    amountText,
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
        "Item sin descripcion",
      category: cleanText(firstString(record.Categoria, record.NombreCategoria, record.Rubro)),
      categoryCode: firstString(record.CodigoCategoria, record.CodigoRubro, record.CodigoProducto),
      quantity: numberFrom(record.Cantidad),
      unit: cleanText(stringFrom(record.UnidadMedida ?? record.Unidad))
    };
  });
}

function normalizeBuyer(buyer: UnknownRecord, item: UnknownRecord) {
  const unit = asRecord(item.Unidad);
  const nestedBuyer = asRecord(item.OrganismoComprador);
  const organismo = asRecord(item.Organismo);
  const buyerRoot = asRecord(item.DatosComprador);
  const region = asRecord(item.Region);
  const comuna = asRecord(item.Comuna);

  return {
    code: firstString(
      buyer.CodigoOrganismo,
      buyer.Codigo,
      item.CodigoOrganismo,
      nestedBuyer.CodigoOrganismo,
      organismo.CodigoOrganismo,
      buyerRoot.CodigoOrganismo
    ),
    name: cleanText(
      firstString(
        buyer.NombreOrganismo,
        buyer.Nombre,
        item.NombreOrganismo,
        nestedBuyer.NombreOrganismo,
        organismo.NombreOrganismo,
        buyerRoot.NombreOrganismo,
        item.Organismo
      )
    ),
    unitCode: firstString(buyer.CodigoUnidad, item.CodigoUnidad, unit.CodigoUnidad, buyerRoot.CodigoUnidad),
    unitName: cleanText(firstString(buyer.NombreUnidad, item.NombreUnidad, unit.NombreUnidad, buyerRoot.NombreUnidad)),
    region: cleanText(
      firstString(
        buyer.RegionUnidad,
        buyer.Region,
        item.RegionUnidad,
        region.Nombre,
        region.NombreRegion,
        unit.Region,
        organismo.Region,
        buyerRoot.RegionUnidad,
        typeof item.Region === "string" ? item.Region : undefined
      )
    ),
    commune: cleanText(
      firstString(
        buyer.ComunaUnidad,
        buyer.Comuna,
        item.ComunaUnidad,
        comuna.Nombre,
        comuna.NombreComuna,
        unit.Comuna,
        buyerRoot.ComunaUnidad,
        typeof item.Comuna === "string" ? item.Comuna : undefined
      )
    )
  };
}

function normalizeAmountText(item: UnknownRecord) {
  const tenderType = firstString(item.Tipo, item.TipoLicitacion, item.CodigoTipo);
  const rangeFromCode =
    formatTenderAmountRange(item.Estimacion) ??
    formatTenderAmountRange(item.CodigoEstimacion) ??
    formatTenderAmountRange(item.TipoMonto) ??
    formatTenderAmountRange(item.RangoMonto) ??
    formatTenderAmountRange(tenderType);
  if (rangeFromCode) {
    return rangeFromCode;
  }

  const rawRange = firstString(
    item.RangoMonto,
    item.Rango,
    item.NombreEstimacion,
    item.MontoEstimadoDescripcion,
    item.DescripcionMonto
  );
  const lower = numberFrom(item.MontoEstimadoMin ?? item.MontoMinimo ?? item.MontoMin);
  const upper = numberFrom(item.MontoEstimadoMax ?? item.MontoMaximo ?? item.MontoMax);
  const currency = firstString(item.Moneda, item.TipoMoneda) ?? "CLP";

  if (rawRange) {
    const cleaned = cleanText(rawRange);
    return cleaned && !isProbablyRawInternalCode(cleaned) ? cleaned : undefined;
  }

  if (lower !== undefined && upper !== undefined) {
    return `Entre ${formatPlainNumber(lower)} y ${formatPlainNumber(upper)} ${currency}`;
  }

  return undefined;
}

function normalizeAmountNumber(item: UnknownRecord) {
  return firstFiniteNumber(
    amountNumberFrom(item.MontoDisponible),
    amountNumberFrom(item.Monto),
    amountNumberFrom(item.TotalEstimado),
    amountNumberFrom(item.ValorTotal),
    amountNumberFrom(item.ValorEstimado),
    amountNumberFrom(item.MontoEstimado)
  );
}

function amountNumberFrom(value: unknown) {
  if (isProbablyAmountCode(value)) {
    return undefined;
  }

  return numberFrom(value);
}

function isProbablyAmountCode(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 9;
  }

  if (typeof value === "string") {
    return /^[1-9]$/.test(value.trim());
  }

  return false;
}

function firstFiniteNumber(...values: Array<number | undefined>) {
  return values.find((value) => value !== undefined);
}

function formatPlainNumber(value: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(value);
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
