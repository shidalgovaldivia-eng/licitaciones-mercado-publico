import { NextResponse } from "next/server";
import { getPurchaseOrderDetail } from "@/services/ordenesCompra";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;

  try {
    const order = await getPurchaseOrderDetail(decodeURIComponent(code));
    if (!order) {
      return NextResponse.json({ error: "Orden de compra no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    const status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar la orden de compra" },
      { status }
    );
  }
}
