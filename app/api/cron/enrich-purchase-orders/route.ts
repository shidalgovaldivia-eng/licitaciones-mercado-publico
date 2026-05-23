import { NextResponse } from "next/server";
import { requireCron } from "@/lib/cronAuth";
import { enrichPurchaseOrdersBatch } from "@/services/purchaseOrderEnrichment";

export async function GET(request: Request) {
  return runCron(request);
}

export async function POST(request: Request) {
  return runCron(request);
}

async function runCron(request: Request) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await enrichPurchaseOrdersBatch({
      limit: 25,
      batches: 1
    });

    return NextResponse.json({
      ok: true,
      mode: "cron",
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No fue posible ejecutar enrichment cron de ordenes"
      },
      { status: 500 }
    );
  }
}
