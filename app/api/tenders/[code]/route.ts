import { NextResponse } from "next/server";
import { getTenderDetail } from "@/lib/mercado-publico/client";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;

  try {
    const tender = await getTenderDetail(decodeURIComponent(code));

    if (!tender) {
      return NextResponse.json({ error: "Licitación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ tender });
  } catch (error) {
    const status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible consultar Mercado Público"
      },
      { status }
    );
  }
}
