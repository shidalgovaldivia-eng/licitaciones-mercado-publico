import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getEndpointPerformanceRecords } from "@/lib/performance";
import { getApiUsageSummary } from "@/services/apiRequestLog";
import { getOperationalDataCounts } from "@/services/performanceDiagnostics";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const [usage, counts] = await Promise.all([
    getApiUsageSummary(),
    getOperationalDataCounts()
  ]);
  const endpointRecords = getEndpointPerformanceRecords();
  const totalApiLogs = usage.externalRequestsToday + usage.cacheHitsToday;
  const cacheHitRatio = totalApiLogs > 0 ? Math.round((usage.cacheHitsToday / totalApiLogs) * 100) : 0;

  return NextResponse.json({
    ok: true,
    cacheHitRatio,
    externalRequestsToday: usage.externalRequestsToday,
    cacheHitsToday: usage.cacheHitsToday,
    errorsToday: usage.errorsToday,
    cachedResponses: counts.cachedResponses,
    normalizedTenders: counts.normalizedTenders,
    normalizedPurchaseOrders: counts.normalizedPurchaseOrders,
    slowestEndpoints: endpointRecords
      .slice()
      .sort((left, right) => right.totalMs - left.totalMs)
      .slice(0, 20),
    latestEndpointTimings: endpointRecords.slice(0, 20)
  });
}
