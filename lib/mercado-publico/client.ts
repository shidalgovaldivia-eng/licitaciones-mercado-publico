import "server-only";
import { ENV_KEYS, requireEnv } from "@/lib/env";
import { normalizeTenderDetail, normalizeTenderListItem } from "@/lib/mercado-publico/normalizers";
import type {
  MercadoPublicoResponse,
  TenderDetail,
  TenderListItem,
  TenderSearchParams
} from "@/lib/mercado-publico/types";

const BASE_URL = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json";

export async function searchTenders(params: TenderSearchParams = {}): Promise<TenderListItem[]> {
  const data = await mercadoPublicoRequest(params);
  return Array.isArray(data.Listado) ? data.Listado.map(normalizeTenderListItem) : [];
}

export async function getTenderDetail(code: string): Promise<TenderDetail | null> {
  const data = await mercadoPublicoRequest({ code });
  const first = Array.isArray(data.Listado) ? data.Listado[0] : null;
  return first ? normalizeTenderDetail(first) : null;
}

async function mercadoPublicoRequest(params: TenderSearchParams & { code?: string }) {
  const ticket = requireEnv(ENV_KEYS.mercadoPublicoTicket);
  const url = new URL(BASE_URL);

  url.searchParams.set("ticket", ticket);

  if (params.code) {
    url.searchParams.set("codigo", params.code);
  } else if (params.status) {
    url.searchParams.set("estado", params.status);
  }

  if (params.date) {
    url.searchParams.set("fecha", toMercadoPublicoDate(params.date));
  }

  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Mercado Público respondió ${response.status}`);
  }

  return (await response.json()) as MercadoPublicoResponse;
}

function toMercadoPublicoDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${day}${month}${year}`;
}
