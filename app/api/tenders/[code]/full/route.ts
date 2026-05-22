import { NextResponse } from "next/server";
import { getTenderFullDetail } from "@/lib/mercado-publico/client";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;

  try {
    const detail = await getTenderFullDetail(decodeURIComponent(code));

    if (!detail.tender) {
      return NextResponse.json({ error: "Licitacion no encontrada" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible consultar Mercado Publico"
      },
      { status }
    );
  }
}
