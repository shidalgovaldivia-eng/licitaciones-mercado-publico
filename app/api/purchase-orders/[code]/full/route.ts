import { NextResponse } from "next/server";
import { getPurchaseOrderFullDetail } from "@/services/ordenesCompra";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;

  try {
    const detail = await getPurchaseOrderFullDetail(decodeURIComponent(code));
    if (!detail.order) {
      return NextResponse.json({ error: "Orden de compra no encontrada" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar la orden de compra" },
      { status }
    );
  }
}
