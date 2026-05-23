import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getPurchaseOrderDetail, listPurchaseOrders } from "@/services/ordenesCompra";
import {
  getEnrichedPurchaseOrderCodes,
  upsertNormalizedPurchaseOrder,
  upsertPendingPurchaseOrder
} from "@/services/normalizedData";

const MAX_DETAILS_PER_RUN = 20;
const MAX_CANDIDATES_PER_RUN = 100;
const ENRICH_CONCURRENCY = 4;

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const { orders } = await listPurchaseOrders();
    const candidates = orders.slice(0, MAX_CANDIDATES_PER_RUN);
    await Promise.all(candidates.map(upsertPendingPurchaseOrder));

    const codes = candidates.map((order) => order.code);
    const alreadyEnriched = await getEnrichedPurchaseOrderCodes(codes);
    const pendingCodes = codes.filter((code) => !alreadyEnriched.has(code)).slice(0, MAX_DETAILS_PER_RUN);

    const enriched: string[] = [];
    const failed: Array<{ code: string; error: string }> = [];

    for (let index = 0; index < pendingCodes.length; index += ENRICH_CONCURRENCY) {
      const batch = pendingCodes.slice(index, index + ENRICH_CONCURRENCY);
      const results = await Promise.all(batch.map(enrichPurchaseOrderCode));
      for (const result of results) {
        if (result.ok) enriched.push(result.code);
        else failed.push({ code: result.code, error: result.error ?? "Error desconocido" });
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      attempted: pendingCodes.length,
      enriched: enriched.length,
      enrichedCodes: enriched,
      failed
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No fue posible enriquecer ordenes de compra" },
      { status: 500 }
    );
  }
}

async function enrichPurchaseOrderCode(code: string) {
  try {
    const detail = await getPurchaseOrderDetail(code);
    if (!detail) return { ok: false, code, error: "Detalle no encontrado" };
    await upsertNormalizedPurchaseOrder(detail);
    return { ok: true, code };
  } catch (error) {
    return { ok: false, code, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
