import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { rebuildCatalogs } from "@/services/catalogRebuild";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await rebuildCatalogs();
    return NextResponse.json({
      ok: result.errors.length === 0,
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        buyersProcessed: 0,
        suppliersProcessed: 0,
        categoriesProcessed: 0,
        durationMs: 0,
        errors: [error instanceof Error ? error.message : "No fue posible reconstruir catalogos"]
      },
      { status: 500 }
    );
  }
}
