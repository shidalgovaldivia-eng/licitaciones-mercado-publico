import "server-only";
import { normalizeTenderDetail, normalizeTenderListItem } from "@/lib/mercado-publico/normalizers";
import type { TenderDetail, TenderListItem, TenderSearchParams } from "@/lib/mercado-publico/types";
import { getLicitacionCompleta, searchLicitaciones } from "@/services/mercadoPublico";

export async function searchTenders(params: TenderSearchParams = {}): Promise<TenderListItem[]> {
  const result = await searchLicitaciones(params);
  return Array.isArray(result.data.Listado) ? result.data.Listado.map(normalizeTenderListItem) : [];
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
