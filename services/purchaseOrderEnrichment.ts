import "server-only";
import { elapsedMs, nowMs } from "@/lib/performance";
import { countMercadoPublicoExternalRequestsToday } from "@/services/apiRequestLog";
import { getPurchaseOrderDetail, listPurchaseOrders } from "@/services/ordenesCompra";
import {
  acquireEnrichmentLock,
  getNormalizationMetrics,
  getProcessablePurchaseOrderCodes,
  markPurchaseOrderEnrichmentFailed,
  markPurchaseOrderEnrichmentRunning,
  releaseEnrichmentLock,
  resetStalePurchaseOrderEnrichment,
  upsertNormalizedPurchaseOrder,
  upsertPendingPurchaseOrders
} from "@/services/normalizedData";

const MAX_LIMIT = 50;
const MAX_BATCHES = 2;
const MAX_DETAILS_PER_REQUEST = 50;
const MAX_RETRIES = 3;
const ENRICH_CONCURRENCY = 4;
const LOCK_NAME = "purchase_orders_enrichment";
const LOCK_TTL_SECONDS = 15 * 60;

export type PurchaseOrderEnrichmentOptions = {
  limit?: number;
  batches?: number;
};

export async function enrichPurchaseOrdersBatch(options: PurchaseOrderEnrichmentOptions = {}) {
  const startedAt = nowMs();
  const limit = clampNumber(options.limit, 20, 1, MAX_LIMIT);
  const batches = clampNumber(options.batches, 1, 1, MAX_BATCHES);
  const maxToProcess = Math.min(limit * batches, MAX_DETAILS_PER_REQUEST);
  const lock = await acquireEnrichmentLock(LOCK_NAME, LOCK_TTL_SECONDS);

  if (!lock.acquired) {
    return {
      locked: true,
      listed: 0,
      limit,
      batches,
      maxPerRequest: maxToProcess,
      processed: 0,
      updated: 0,
      enriched: 0,
      skipped: maxToProcess,
      failed: 0,
      failedItems: [],
      remaining: 0,
      requestsToday: await countMercadoPublicoExternalRequestsToday(),
      durationMs: elapsedMs(startedAt),
      enrichedCodes: []
    };
  }

  try {
    const { orders } = await listPurchaseOrders();
    await upsertPendingPurchaseOrders(orders.slice(0, Math.max(maxToProcess, 100)));
    await resetStalePurchaseOrderEnrichment();

    const pendingCodes = await getProcessablePurchaseOrderCodes(maxToProcess, MAX_RETRIES);
    await markPurchaseOrderEnrichmentRunning(pendingCodes);

    const enriched: string[] = [];
    const failed: Array<{ code: string; error: string }> = [];

    for (let index = 0; index < pendingCodes.length; index += ENRICH_CONCURRENCY) {
      const batch = pendingCodes.slice(index, index + ENRICH_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(enrichPurchaseOrderCode));

      for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
        const result = results[resultIndex];
        const code = batch[resultIndex];
        if (result.status === "fulfilled" && result.value.ok) {
          enriched.push(result.value.code);
        } else if (result.status === "fulfilled") {
          failed.push({ code: result.value.code, error: result.value.error ?? "Error desconocido" });
        } else {
          const message = result.reason instanceof Error ? result.reason.message : "Error desconocido";
          await markPurchaseOrderEnrichmentFailed(code, message);
          failed.push({ code, error: message });
        }
      }
    }

    const [metrics, requestsToday] = await Promise.all([
      getNormalizationMetrics(),
      countMercadoPublicoExternalRequestsToday()
    ]);

    return {
      locked: false,
      listed: orders.length,
      limit,
      batches,
      maxPerRequest: maxToProcess,
      processed: pendingCodes.length,
      updated: enriched.length,
      enriched: enriched.length,
      skipped: Math.max(0, maxToProcess - pendingCodes.length),
      failed: failed.length,
      failedItems: failed,
      remaining: metrics.purchaseOrders.pending,
      requestsToday,
      durationMs: elapsedMs(startedAt),
      enrichedCodes: enriched
    };
  } finally {
    try {
      await releaseEnrichmentLock(LOCK_NAME, lock.owner);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.info("[purchase-orders:lock-release]", error instanceof Error ? error.message : "Error liberando lock");
      }
    }
  }
}

async function enrichPurchaseOrderCode(code: string) {
  try {
    const detail = await getPurchaseOrderDetail(code);
    if (!detail) {
      const error = "Detalle no encontrado";
      await markPurchaseOrderEnrichmentFailed(code, error);
      return { ok: false, code, error };
    }
    await upsertNormalizedPurchaseOrder(detail);
    return { ok: true, code };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await markPurchaseOrderEnrichmentFailed(code, message);
    return { ok: false, code, error: message };
  }
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  const parsed = value ?? fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
