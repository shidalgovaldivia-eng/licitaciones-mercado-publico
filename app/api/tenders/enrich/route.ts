import { NextResponse } from "next/server";
import { getTenderDetail } from "@/lib/mercado-publico/client";
import type { TenderDetail } from "@/lib/mercado-publico/types";
import { elapsedMs, nowMs, recordEndpointPerformance } from "@/lib/performance";
import { upsertNormalizedTender } from "@/services/normalizedData";

const MAX_CODES_PER_REQUEST = 20;
const ENRICH_CONCURRENCY = 4;

type EnrichBody = {
  codes?: unknown;
};

export async function POST(request: Request) {
  const endpointStart = nowMs();
  let mercadoPublicoMs = 0;
  let supabaseWriteMs = 0;
  let recordsProcessed = 0;
  let recordsReturned = 0;
  let status = 200;

  try {
    const body = (await request.json()) as EnrichBody;
    const codes = normalizeCodes(body.codes).slice(0, MAX_CODES_PER_REQUEST);
    recordsProcessed = codes.length;

    if (codes.length === 0) {
      return NextResponse.json({ tenders: [], failed: [], limit: MAX_CODES_PER_REQUEST });
    }

    const tenders: TenderDetail[] = [];
    const failed: Array<{ code: string; error: string }> = [];

    for (let index = 0; index < codes.length; index += ENRICH_CONCURRENCY) {
      const batch = codes.slice(index, index + ENRICH_CONCURRENCY);
      const results = await Promise.all(batch.map(readTenderDetailSafely));

      for (const result of results) {
        mercadoPublicoMs += result.mercadoPublicoMs;
        supabaseWriteMs += result.supabaseWriteMs;
        if (result.tender) {
          tenders.push(result.tender);
        } else {
          failed.push({ code: result.code, error: result.error ?? "No fue posible enriquecer la licitacion" });
        }
      }
    }
    recordsReturned = tenders.length;

    return NextResponse.json({
      tenders,
      failed,
      limit: MAX_CODES_PER_REQUEST
    });
  } catch (error) {
    status = 400;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible enriquecer licitaciones"
      },
      { status: 400 }
    );
  } finally {
    recordEndpointPerformance({
      endpoint: "/api/tenders/enrich",
      method: "POST",
      totalMs: elapsedMs(endpointStart),
      mercadoPublicoMs,
      supabaseWriteMs,
      recordsProcessed,
      recordsReturned,
      externalCalls: recordsProcessed,
      status,
      createdAt: new Date().toISOString()
    });
  }
}

async function readTenderDetailSafely(code: string) {
  let mercadoPublicoMs = 0;
  let supabaseWriteMs = 0;

  try {
    const mercadoPublicoStart = nowMs();
    const tender = await getTenderDetail(code);
    mercadoPublicoMs = elapsedMs(mercadoPublicoStart);
    if (tender) {
      const supabaseWriteStart = nowMs();
      await upsertNormalizedTender(tender);
      supabaseWriteMs = elapsedMs(supabaseWriteStart);
    }
    return { code, tender, mercadoPublicoMs, supabaseWriteMs };
  } catch (error) {
    return {
      code,
      tender: null,
      mercadoPublicoMs,
      supabaseWriteMs,
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
