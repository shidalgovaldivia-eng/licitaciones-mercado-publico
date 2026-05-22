import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ENV_KEYS, getSupabaseServerEnv, requireEnv } from "@/lib/env";
import type { MercadoPublicoResponse, TenderSearchParams } from "@/lib/mercado-publico/types";

const API_BASE_URL = "https://api.mercadopublico.cl/servicios/v1";
const PUBLIC_BASE_URL = `${API_BASE_URL}/publico`;
const EMPRESAS_BASE_URL = `${API_BASE_URL}/Publico/Empresas`;
const CACHE_TABLE = "licitaciones_cache";

type MercadoPublicoFormat = "json";
type MercadoPublicoResource = "licitaciones" | "ordenesdecompra";

export type MercadoPublicoRequest = {
  resource: MercadoPublicoResource;
  params?: Record<string, string | undefined>;
  cacheTtlSeconds?: number;
  cacheStrategy?: "cache-first" | "network-only";
};

export type MercadoPublicoResult<T> = {
  data: T;
  cache: {
    key: string;
    hit: boolean;
    enabled: boolean;
    expiresAt?: string;
  };
};

export async function searchLicitaciones(params: TenderSearchParams = {}) {
  return mercadoPublicoRequest<MercadoPublicoResponse>({
    resource: "licitaciones",
    params: toLicitacionesParams(params),
    cacheTtlSeconds: 10 * 60
  });
}

export async function getLicitacionCompleta(codigo: string) {
  return mercadoPublicoRequest<MercadoPublicoResponse>({
    resource: "licitaciones",
    params: { codigo },
    cacheTtlSeconds: 24 * 60 * 60
  });
}

export async function searchOrdenesCompra(params: Record<string, string | undefined> = {}) {
  return mercadoPublicoRequest<MercadoPublicoResponse>({
    resource: "ordenesdecompra",
    params,
    cacheTtlSeconds: 10 * 60
  });
}

export async function buscarCompradores(texto: string) {
  return mercadoPublicoEmpresasRequest<MercadoPublicoResponse>({
    endpoint: "BuscarComprador",
    params: { texto },
    cacheTtlSeconds: 24 * 60 * 60
  });
}

export async function buscarProveedores(texto: string) {
  return mercadoPublicoEmpresasRequest<MercadoPublicoResponse>({
    endpoint: "BuscarProveedor",
    params: { texto },
    cacheTtlSeconds: 24 * 60 * 60
  });
}

export async function mercadoPublicoRequest<T>({
  resource,
  params = {},
  cacheTtlSeconds = 300,
  cacheStrategy = "cache-first"
}: MercadoPublicoRequest): Promise<MercadoPublicoResult<T>> {
  const ticket = requireEnv(ENV_KEYS.mercadoPublicoTicket);
  const normalizedParams = sanitizeParams({ ...params, ticket });
  const url = buildPublicUrl(resource, "json", normalizedParams);
  const cacheKey = buildCacheKey(resource, normalizedParams);

  if (cacheStrategy === "cache-first") {
    const cached = await readCache<T>(cacheKey);
    if (cached) {
      return {
        data: cached.payload,
        cache: {
          key: cacheKey,
          hit: true,
          enabled: true,
          expiresAt: cached.expiresAt
        }
      };
    }
  }

  const response = await fetch(url, {
    next: { revalidate: Math.min(cacheTtlSeconds, 3600) },
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Mercado Público respondió ${response.status} para ${resource}.`);
  }

  const data = (await response.json()) as T;
  const cacheWrite = await writeCache(cacheKey, resource, normalizedParams, data, cacheTtlSeconds);

  return {
    data,
    cache: {
      key: cacheKey,
      hit: false,
      enabled: cacheWrite,
      expiresAt: new Date(Date.now() + cacheTtlSeconds * 1000).toISOString()
    }
  };
}

async function mercadoPublicoEmpresasRequest<T>({
  endpoint,
  params,
  cacheTtlSeconds
}: {
  endpoint: "BuscarComprador" | "BuscarProveedor";
  params: Record<string, string | undefined>;
  cacheTtlSeconds: number;
}): Promise<MercadoPublicoResult<T>> {
  const ticket = requireEnv(ENV_KEYS.mercadoPublicoTicket);
  const normalizedParams = sanitizeParams({ ...params, ticket });
  const url = new URL(`${EMPRESAS_BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(normalizedParams)) {
    url.searchParams.set(key, value);
  }

  const cacheKey = buildCacheKey(endpoint, normalizedParams);
  const cached = await readCache<T>(cacheKey);
  if (cached) {
    return {
      data: cached.payload,
      cache: {
        key: cacheKey,
        hit: true,
        enabled: true,
        expiresAt: cached.expiresAt
      }
    };
  }

  const response = await fetch(url, {
    next: { revalidate: Math.min(cacheTtlSeconds, 3600) },
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Mercado Público respondió ${response.status} para ${endpoint}.`);
  }

  const data = (await response.json()) as T;
  const cacheWrite = await writeCache(cacheKey, endpoint, normalizedParams, data, cacheTtlSeconds);

  return {
    data,
    cache: {
      key: cacheKey,
      hit: false,
      enabled: cacheWrite,
      expiresAt: new Date(Date.now() + cacheTtlSeconds * 1000).toISOString()
    }
  };
}

function toLicitacionesParams(params: TenderSearchParams) {
  const apiParams: Record<string, string | undefined> = {
    estado: params.status,
    fecha: params.date ? toMercadoPublicoDate(params.date) : undefined,
    CodigoOrganismo: params.buyerCode,
    CodigoProveedor: params.supplierCode
  };

  return apiParams;
}

function buildPublicUrl(resource: MercadoPublicoResource, format: MercadoPublicoFormat, params: Record<string, string>) {
  const url = new URL(`${PUBLIC_BASE_URL}/${resource}.${format}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildCacheKey(resource: MercadoPublicoResource | "BuscarComprador" | "BuscarProveedor", params: Record<string, string>) {
  const stableParams = Object.entries(params)
    .filter(([key]) => key !== "ticket")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `${resource}:${stableParams || "default"}`;
}

function sanitizeParams(params: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(params)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
      .map(([key, value]) => [key, value.trim()])
  );
}

async function readCache<T>(cacheKey: string) {
  const supabase = createCacheClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    payload: data.payload as T,
    expiresAt: data.expires_at as string
  };
}

async function writeCache<T>(
  cacheKey: string,
  resource: MercadoPublicoResource | "BuscarComprador" | "BuscarProveedor",
  params: Record<string, string>,
  payload: T,
  ttlSeconds: number
) {
  const supabase = createCacheClient();
  if (!supabase) {
    return false;
  }

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const { error } = await supabase.from(CACHE_TABLE).upsert(
    {
      cache_key: cacheKey,
      resource,
      params,
      payload,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt
    },
    { onConflict: "cache_key" }
  );

  return !error;
}

function createCacheClient() {
  const env = getSupabaseServerEnv();
  if (!env) {
    return null;
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function toMercadoPublicoDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${day}${month}${year}`;
}
