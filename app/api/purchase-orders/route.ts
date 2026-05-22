import { NextResponse } from "next/server";
import { listPurchaseOrders } from "@/services/ordenesCompra";
import type { PurchaseOrderListItem } from "@/types/purchaseOrder";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const result = await listPurchaseOrders({
      codigo: searchParams.get("codigo") || undefined,
      fecha: searchParams.get("fecha") || undefined,
      estado: searchParams.get("estado") || undefined,
      comprador: searchParams.get("comprador") || undefined,
      proveedor: searchParams.get("proveedor") || undefined
    });

    const filtered = applyFilters(result.orders, searchParams.get("q") || "");
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;

    return NextResponse.json({
      orders: filtered.slice(start, start + pageSize),
      pagination: {
        page: currentPage,
        pageSize,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      },
      cache: result.cache
    });
  } catch (error) {
    const status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar ordenes de compra" },
      { status }
    );
  }
}

function applyFilters(orders: PurchaseOrderListItem[], query: string) {
  const normalized = normalize(query);
  if (!normalized) return orders;

  return orders.filter((order) =>
    normalize([order.code, order.name, order.buyerName, order.supplierName, order.statusLabel].join(" ")).includes(normalized)
  );
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalize(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
