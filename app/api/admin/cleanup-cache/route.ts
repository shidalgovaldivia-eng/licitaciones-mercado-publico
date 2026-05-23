import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { cleanupOperationalData } from "@/services/maintenance";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await cleanupOperationalData();
    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No fue posible limpiar cache"
      },
      { status: 500 }
    );
  }
}
