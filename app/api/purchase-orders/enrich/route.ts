import { NextResponse } from "next/server";
import { elapsedMs, nowMs, recordEndpointPerformance } from "@/lib/performance";
import { isPurchaseOrderIncomplete } from "@/lib/purchase-orders/completeness";
import { getPurchaseOrderDetail } from "@/services/ordenesCompra";
import { getNormalizedPurchaseOrdersByCodes, upsertNormalizedPurchaseOrder } from "@/services/normalizedData";
import type { PurchaseOrderListItem } from "@/types/purchaseOrder";

const MAX_CODES_PER_REQUEST = 20;
const ENRICH_CONCURRENCY = 4;

type EnrichBody = {
  codes?: unknown;
};

export async function POST(request: Request) {
  const endpointStart = nowMs();
  let mercadoPublicoMs = 0;
  let supabaseReadMs = 0;
  let supabaseWriteMs = 0;
  let recordsProcessed = 0;
  let recordsReturned = 0;
  let externalCalls = 0;
  let status = 200;

  try {
    const body = (await request.json()) as EnrichBody;
    const codes = normalizeCodes(body.codes).slice(0, MAX_CODES_PER_REQUEST);
    recordsProcessed = codes.length;

    if (codes.length === 0) {
      return NextResponse.json({ orders: [], failed: [], limit: MAX_CODES_PER_REQUEST });
    }

    const supabaseReadStart = nowMs();
    const cachedByCode = await getNormalizedPurchaseOrdersByCodes(codes);
    supabaseReadMs = elapsedMs(supabaseReadStart);

    const cachedOrders = Array.from(cachedByCode.values()).filter((order) => !isPurchaseOrderIncomplete(order));
    const orders: PurchaseOrderListItem[] = [...cachedOrders];
    const cachedCodes = new Set(cachedOrders.map((order) => order.code));
    const missingCodes = codes.filter((code) => !cachedCodes.has(code));
    externalCalls = missingCodes.length;
    const failed: Array<{ code: string; error: string }> = [];

    for (let index = 0; index < missingCodes.length; index += ENRICH_CONCURRENCY) {
      const batch = missingCodes.slice(index, index + ENRICH_CONCURRENCY);
      const results = await Promise.all(batch.map(readPurchaseOrderDetailSafely));

      for (const result of results) {
        mercadoPublicoMs += result.mercadoPublicoMs;
        supabaseWriteMs += result.supabaseWriteMs;
        if (result.order) {
          orders.push(result.order);
        } else {
          failed.push({ code: result.code, error: result.error ?? "No fue posible enriquecer la orden de compra" });
        }
      }
    }

    recordsReturned = orders.length;

    if (process.env.NODE_ENV === "development") {
      console.info("[purchase-orders:enrichment]", {
        requested: codes.length,
        cached: cachedCodes.size,
        fetched: missingCodes.length,
        returned: orders.length,
        failed: failed.length,
        durationMs: elapsedMs(endpointStart)
      });
    }

    return NextResponse.json({
      orders,
      failed,
      limit: MAX_CODES_PER_REQUEST
    });
  } catch (error) {
    status = 400;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible enriquecer ordenes de compra"
      },
      { status }
    );
  } finally {
    recordEndpointPerformance({
      endpoint: "/api/purchase-orders/enrich",
      method: "POST",
      totalMs: elapsedMs(endpointStart),
      mercadoPublicoMs,
      supabaseReadMs,
      supabaseWriteMs,
      recordsProcessed,
      recordsReturned,
      externalCalls,
      status,
      createdAt: new Date().toISOString()
    });
  }
}

async function readPurchaseOrderDetailSafely(code: string) {
  let mercadoPublicoMs = 0;
  let supabaseWriteMs = 0;

  try {
    const mercadoPublicoStart = nowMs();
    const order = await getPurchaseOrderDetail(code);
    mercadoPublicoMs = elapsedMs(mercadoPublicoStart);
    if (order) {
      const supabaseWriteStart = nowMs();
      await upsertNormalizedPurchaseOrder(order);
      supabaseWriteMs = elapsedMs(supabaseWriteStart);
    }
    return { code, order, mercadoPublicoMs, supabaseWriteMs };
  } catch (error) {
    return {
      code,
      order: null,
      mercadoPublicoMs,
      supabaseWriteMs,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

function normalizeCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.trim())
        .filter(Boolean)
    )
  );
}
