import { NextResponse } from "next/server";
import { elapsedMs, nowMs, recordEndpointPerformance } from "@/lib/performance";
import { getDashboardSummary } from "@/services/dashboardSummary";

export const dynamic = "force-dynamic";

export async function GET() {
  const endpointStart = nowMs();
  let status = 200;

  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    status = 502;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible generar el resumen del dashboard"
      },
      { status: 502 }
    );
  } finally {
    recordEndpointPerformance({
      endpoint: "/api/dashboard/summary",
      method: "GET",
      totalMs: elapsedMs(endpointStart),
      status,
      createdAt: new Date().toISOString()
    });
  }
}
