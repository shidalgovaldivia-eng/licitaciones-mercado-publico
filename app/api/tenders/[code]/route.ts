import { NextResponse } from "next/server";
import { getTenderDetail } from "@/lib/mercado-publico/client";
import { elapsedMs, nowMs, recordEndpointPerformance } from "@/lib/performance";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const endpointStart = nowMs();
  const { code } = await context.params;
  let mercadoPublicoMs = 0;
  let status = 200;

  try {
    const mercadoPublicoStart = nowMs();
    const tender = await getTenderDetail(decodeURIComponent(code));
    mercadoPublicoMs = elapsedMs(mercadoPublicoStart);

    if (!tender) {
      status = 404;
      return NextResponse.json({ error: "Licitacion no encontrada" }, { status });
    }

    return NextResponse.json({ tender });
  } catch (error) {
    status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible consultar Mercado Publico"
      },
      { status }
    );
  } finally {
    recordEndpointPerformance({
      endpoint: "/api/tenders/[code]",
      method: "GET",
      totalMs: elapsedMs(endpointStart),
      mercadoPublicoMs,
      recordsReturned: status === 200 ? 1 : 0,
      status,
      createdAt: new Date().toISOString()
    });
  }
}
