import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/services/dashboardSummary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible generar el resumen del dashboard"
      },
      { status: 502 }
    );
  }
}
