import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getTenderDetail, searchTenders } from "@/lib/mercado-publico/client";
import { countMercadoPublicoExternalRequestsToday } from "@/services/apiRequestLog";
import {
  getNormalizationMetrics,
  getPendingTenderCodes,
  upsertNormalizedTender,
  upsertPendingTenders
} from "@/services/normalizedData";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_BATCHES = 1;
const MAX_BATCHES = 5;
const MAX_DETAILS_PER_REQUEST = 500;
const ENRICH_CONCURRENCY = 4;

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const limit = clampNumber(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
    const batches = clampNumber(url.searchParams.get("batches"), DEFAULT_BATCHES, 1, MAX_BATCHES);
    const maxToProcess = Math.min(limit * batches, MAX_DETAILS_PER_REQUEST);

    const tenders = await searchTenders({ status: "activas" });
    await upsertPendingTenders(tenders);

    const pendingCodes = await getPendingTenderCodes(maxToProcess);

    const enriched: string[] = [];
    const failed: Array<{ code: string; error: string }> = [];

    for (let index = 0; index < pendingCodes.length; index += ENRICH_CONCURRENCY) {
      const batch = pendingCodes.slice(index, index + ENRICH_CONCURRENCY);
      const results = await Promise.all(batch.map(enrichTenderCode));
      for (const result of results) {
        if (result.ok) enriched.push(result.code);
        else failed.push({ code: result.code, error: result.error ?? "Error desconocido" });
      }
    }

    const [metrics, requestsToday] = await Promise.all([
      getNormalizationMetrics(),
      countMercadoPublicoExternalRequestsToday()
    ]);

    return NextResponse.json({
      ok: true,
      listed: tenders.length,
      limit,
      batches,
      maxPerRequest: maxToProcess,
      processed: pendingCodes.length,
      enriched: enriched.length,
      skipped: Math.max(0, maxToProcess - pendingCodes.length),
      failed: failed.length,
      failedItems: failed,
      remaining: metrics.tenders.pending,
      requestsToday,
      enrichedCodes: enriched
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No fue posible enriquecer licitaciones" },
      { status: 500 }
    );
  }
}

function clampNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = value ? Number(value) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

async function enrichTenderCode(code: string) {
  try {
    const detail = await getTenderDetail(code);
    if (!detail) return { ok: false, code, error: "Detalle no encontrado" };
    await upsertNormalizedTender(detail);
    return { ok: true, code };
  } catch (error) {
    return { ok: false, code, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
