import "server-only";
import { normalizeTenderDetail, normalizeTenderListItem } from "@/lib/mercado-publico/normalizers";
import type { TenderDetail, TenderListItem, TenderSearchParams } from "@/lib/mercado-publico/types";
import { getLicitacionCompleta, searchLicitaciones } from "@/services/mercadoPublico";

export async function searchTenders(params: TenderSearchParams = {}): Promise<TenderListItem[]> {
  const result = await searchTendersWithMeta(params);
  return result.tenders;
}

export async function searchTendersWithMeta(params: TenderSearchParams = {}) {
  const result = await searchLicitaciones(params);
  const tenders = Array.isArray(result.data.Listado) ? result.data.Listado.map(normalizeTenderListItem) : [];
  logIncompleteTenderMetadata(tenders, "list");

  return {
    tenders,
    cache: result.cache
  };
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

function logIncompleteTenderMetadata(tenders: TenderListItem[], stage: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

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
