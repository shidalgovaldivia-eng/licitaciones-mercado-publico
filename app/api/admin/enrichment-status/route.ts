import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { countMercadoPublicoExternalRequestsToday } from "@/services/apiRequestLog";
import { getNormalizationMetrics } from "@/services/normalizedData";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const [normalization, requestsToday] = await Promise.all([
      getNormalizationMetrics(),
      countMercadoPublicoExternalRequestsToday()
    ]);

    return NextResponse.json({
      ok: true,
      totalListedOrCached: normalization.tenders.total,
      totalNormalized: normalization.tenders.enriched,
      pending: normalization.tenders.pending,
      enrichedPercent: normalization.tenders.enrichedPercent,
      requestsToday,
      tenders: normalization.tenders,
      purchaseOrders: normalization.purchaseOrders
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No fue posible obtener estado de enriquecimiento"
      },
      { status: 500 }
    );
  }
}
