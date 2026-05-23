import { NextResponse } from "next/server";
import { elapsedMs, nowMs, recordEndpointPerformance } from "@/lib/performance";
import { listPurchaseOrders } from "@/services/ordenesCompra";
import type { PurchaseOrderListItem } from "@/types/purchaseOrder";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpointStart = nowMs();
  let mercadoPublicoMs = 0;
  let recordsProcessed = 0;
  let recordsReturned = 0;
  let cacheHit: boolean | undefined;
  let status = 200;

  try {
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const mercadoPublicoStart = nowMs();
    const result = await listPurchaseOrders({
      codigo: searchParams.get("codigo") || undefined,
      fecha: searchParams.get("fecha") || undefined,
      estado: searchParams.get("estado") || undefined,
      comprador: searchParams.get("comprador") || undefined,
      proveedor: searchParams.get("proveedor") || undefined
    });
    mercadoPublicoMs = elapsedMs(mercadoPublicoStart);
    cacheHit = result.cache.hit;
    recordsProcessed = result.orders.length;

    const filtered = applyFilters(result.orders, searchParams.get("q") || "");
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;

    const orders = filtered.slice(start, start + pageSize);
    recordsReturned = orders.length;

    return NextResponse.json({
      orders,
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
    status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar ordenes de compra" },
      { status }
    );
  } finally {
    recordEndpointPerformance({
      endpoint: "/api/purchase-orders",
      method: "GET",
      totalMs: elapsedMs(endpointStart),
      mercadoPublicoMs,
      recordsProcessed,
      recordsReturned,
      externalCalls: cacheHit === false ? 1 : 0,
      cacheHit,
      status,
      createdAt: new Date().toISOString()
    });
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
