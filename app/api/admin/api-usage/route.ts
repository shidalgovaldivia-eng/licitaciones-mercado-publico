import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { elapsedMs, nowMs, recordEndpointPerformance } from "@/lib/performance";
import { getApiUsageSummary } from "@/services/apiRequestLog";

export async function GET(request: Request) {
  const endpointStart = nowMs();
  let status = 200;
  const unauthorized = requireAdmin(request);

  if (unauthorized) {
    status = 401;
    recordEndpointPerformance({
      endpoint: "/api/admin/api-usage",
      method: "GET",
      totalMs: elapsedMs(endpointStart),
      status,
      createdAt: new Date().toISOString()
    });
    return unauthorized;
  }

  const summary = await getApiUsageSummary();
  recordEndpointPerformance({
    endpoint: "/api/admin/api-usage",
    method: "GET",
    totalMs: elapsedMs(endpointStart),
    recordsReturned: summary.latest.length,
    status,
    createdAt: new Date().toISOString()
  });

  return NextResponse.json({
    ok: true,
    ...summary
  });
}
