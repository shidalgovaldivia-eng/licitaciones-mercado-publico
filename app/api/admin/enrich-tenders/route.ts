import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { enrichTendersBatch } from "@/services/tenderEnrichment";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const result = await enrichTendersBatch({
      limit: parsePositiveInt(url.searchParams.get("limit")),
      batches: parsePositiveInt(url.searchParams.get("batches"))
    });

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No fue posible enriquecer licitaciones" },
      { status: 500 }
    );
  }
}

function parsePositiveInt(value: string | null) {
  const parsed = value ? Number(value) : undefined;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
