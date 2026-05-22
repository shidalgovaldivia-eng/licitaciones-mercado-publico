import { NextResponse } from "next/server";
import { searchTenders } from "@/lib/mercado-publico/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const tenders = await searchTenders({
      status: searchParams.get("status") || "activas",
      date: searchParams.get("date") || undefined
    });

    return NextResponse.json({ tenders });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible consultar Mercado Público"
      },
      { status: 502 }
    );
  }
}
