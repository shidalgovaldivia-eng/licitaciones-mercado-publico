import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";
import { isTenderIncomplete } from "@/lib/mercado-publico/completeness";
import { normalizeTenderDetail, normalizeTenderListItem } from "@/lib/mercado-publico/normalizers";
import type { MercadoPublicoResponse, TenderDetail, TenderListItem, TenderSearchParams } from "@/lib/mercado-publico/types";
import { getLicitacionCompleta, searchLicitaciones } from "@/services/mercadoPublico";

const CACHE_TABLE = "licitaciones_cache";

export async function searchTenders(params: TenderSearchParams = {}): Promise<TenderListItem[]> {
  const result = await searchLicitaciones(params);
  const tenders = Array.isArray(result.data.Listado) ? result.data.Listado.map(normalizeTenderListItem) : [];
  logIncompleteTenderMetadata(tenders, "list");
  const enriched = await enrichTendersFromCachedDetails(tenders);
  logIncompleteTenderMetadata(enriched, "list_after_cache_enrichment");
  return enriched;
}

export async function getTenderDetail(code: string): Promise<TenderDetail | null> {
  const result = await getLicitacionCompleta(code);
  const first = Array.isArray(result.data.Listado) ? result.data.Listado[0] : null;
  return first ? normalizeTenderDetail(first) : null;
}

export async function getTenderFullDetail(code: string) {
  const result = await getLicitacionCompleta(code);
  const first = Array.isArray(result.data.Listado) ? result.data.Listado[0] : null;

  return {
    tender: first ? normalizeTenderDetail(first) : null,
    raw: result.data,
    cache: result.cache
  };
}

async function enrichTendersFromCachedDetails(tenders: TenderListItem[]) {
  const missingCodes = new Set(
    tenders
      .filter(isTenderIncomplete)
      .map((tender) => tender.code)
  );

  if (missingCodes.size === 0) {
    return tenders;
  }

  const details = await readCachedTenderDetails();
  if (details.size === 0) {
    return tenders;
  }

  return tenders.map((tender) => {
    const detail = details.get(tender.code);
    if (!detail) {
      return tender;
    }

    return mergeTenderData(tender, detail);
  });
}

function mergeTenderData(tender: TenderListItem, detail: TenderDetail): TenderListItem {
  return {
    ...tender,
    buyer: tender.buyer?.name ? tender.buyer : detail.buyer,
    buyerName: tender.buyerName ?? detail.buyerName,
    buyerCode: tender.buyerCode ?? detail.buyerCode,
    category: tender.category ?? detail.category,
    categoryCode: tender.categoryCode ?? detail.categoryCode,
    region: tender.region ?? detail.region,
    type: tender.type ?? detail.type,
    amount: tender.amount ?? detail.amount,
    amountText: tender.amountText ?? detail.amountText,
    publishDate: tender.publishDate ?? detail.publishDate,
    closeDate: tender.closeDate ?? detail.closeDate
  };
}

async function readCachedTenderDetails() {
  const env = getSupabaseServerEnv();
  if (!env) {
    return new Map<string, TenderDetail>();
  }

  const supabase = createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("payload")
    .eq("resource", "licitaciones")
    .like("cache_key", "licitaciones:codigo=%")
    .order("fetched_at", { ascending: false })
    .limit(200);

  if (error || !data) {
    return new Map<string, TenderDetail>();
  }

  const details = new Map<string, TenderDetail>();
  for (const row of data) {
    const payload = row.payload as MercadoPublicoResponse;
    const first = Array.isArray(payload.Listado) ? payload.Listado[0] : null;
    if (!first) {
      continue;
    }

    const detail = normalizeTenderDetail(first);
    if (!details.has(detail.code)) {
      details.set(detail.code, detail);
    }
  }

  return details;
}

function logIncompleteTenderMetadata(tenders: TenderListItem[], stage: string) {
  const incomplete = tenders
    .filter((tender) => !tender.buyerName || !tender.amountText)
    .slice(0, 10)
    .map((tender) => ({
      code: tender.code,
      missingBuyer: !tender.buyerName,
      missingAmountRange: !tender.amountText,
      hasNumericAmount: tender.amount !== undefined
    }));

  if (incomplete.length === 0) {
    return;
  }

  console.info("[mercado-publico:normalization]", {
    stage,
    incompleteCount: tenders.filter((tender) => !tender.buyerName || !tender.amountText).length,
    sample: incomplete
  });
}
