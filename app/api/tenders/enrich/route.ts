import { NextResponse } from "next/server";
import { getTenderDetail } from "@/lib/mercado-publico/client";
import type { TenderDetail } from "@/lib/mercado-publico/types";

const MAX_CODES_PER_REQUEST = 20;
const ENRICH_CONCURRENCY = 4;

type EnrichBody = {
  codes?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EnrichBody;
    const codes = normalizeCodes(body.codes).slice(0, MAX_CODES_PER_REQUEST);

    if (codes.length === 0) {
      return NextResponse.json({ tenders: [], failed: [], limit: MAX_CODES_PER_REQUEST });
    }

    const tenders: TenderDetail[] = [];
    const failed: Array<{ code: string; error: string }> = [];

    for (let index = 0; index < codes.length; index += ENRICH_CONCURRENCY) {
      const batch = codes.slice(index, index + ENRICH_CONCURRENCY);
      const results = await Promise.all(batch.map(readTenderDetailSafely));

      for (const result of results) {
        if (result.tender) {
          tenders.push(result.tender);
        } else {
          failed.push({ code: result.code, error: result.error ?? "No fue posible enriquecer la licitacion" });
        }
      }
    }

    return NextResponse.json({
      tenders,
      failed,
      limit: MAX_CODES_PER_REQUEST
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible enriquecer licitaciones"
      },
      { status: 400 }
    );
  }
}

async function readTenderDetailSafely(code: string) {
  try {
    const tender = await getTenderDetail(code);
    return { code, tender };
  } catch (error) {
    return {
      code,
      tender: null,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

function normalizeCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.trim())
        .filter(Boolean)
    )
  );
}
