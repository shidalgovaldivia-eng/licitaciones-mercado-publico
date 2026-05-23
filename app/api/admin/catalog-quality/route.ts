import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getCatalogQualityReport } from "@/services/catalogQuality";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const report = await getCatalogQualityReport();
    return NextResponse.json({
      ok: true,
      ...report
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No fue posible calcular calidad de catalogos"
      },
      { status: 500 }
    );
  }
}
