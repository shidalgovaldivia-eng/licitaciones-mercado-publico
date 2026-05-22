import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ENV_KEYS, getNumberEnv, getSupabaseServerEnv, requireEnv } from "@/lib/env";
import type { MercadoPublicoResponse, TenderSearchParams } from "@/lib/mercado-publico/types";
import { countMercadoPublicoExternalRequestsToday, logApiRequest } from "@/services/apiRequestLog";

const API_BASE_URL = "https://api.mercadopublico.cl/servicios/v1";
const PUBLIC_BASE_URL = `${API_BASE_URL}/publico`;
const EMPRESAS_BASE_URL = `${API_BASE_URL}/Publico/Empresas`;
const CACHE_TABLE = "licitaciones_cache";
const RATE_LIMIT_SAFETY_RATIO = 0.95;

type MercadoPublicoFormat = "json";
type MercadoPublicoResource = "licitaciones" | "ordenesdecompra";
type MercadoPublicoEmpresaEndpoint = "BuscarComprador" | "BuscarProveedor";
type CacheResource = MercadoPublicoResource | MercadoPublicoEmpresaEndpoint;

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
    stale?: boolean;
    expiresAt?: string;
  };
};

export class MercadoPublicoRateLimitError extends Error {
  status = 429;

  constructor(limit: number) {
    super(
      `Límite preventivo de Mercado Público alcanzado. Límite diario configurado: ${limit}. Se evitó una llamada externa para proteger la cuota del ticket.`
    );
    this.name = "MercadoPublicoRateLimitError";
  }
}

export async function searchLicitaciones(params: TenderSearchParams = {}) {
  return mercadoPublicoRequest<MercadoPublicoResponse>({
    resource: "licitaciones",
    params: toLicitacionesParams(params),
    cacheTtlSeconds: getDefaultCacheTtlSeconds()
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
    cacheTtlSeconds: getDefaultCacheTtlSeconds()
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
  cacheTtlSeconds = getDefaultCacheTtlSeconds(),
  cacheStrategy = "cache-first"
}: MercadoPublicoRequest): Promise<MercadoPublicoResult<T>> {
  const apiParams = sanitizeParams(params);
  const requestParams = withTicket(apiParams);
  const url = buildPublicUrl(resource, "json", requestParams);

  return executeMercadoPublicoRequest<T>({
    resource,
    apiParams,
    url,
    cacheTtlSeconds,
    cacheStrategy
  });
}

async function mercadoPublicoEmpresasRequest<T>({
  endpoint,
  params,
  cacheTtlSeconds
}: {
  endpoint: MercadoPublicoEmpresaEndpoint;
  params: Record<string, string | undefined>;
  cacheTtlSeconds: number;
}): Promise<MercadoPublicoResult<T>> {
  const apiParams = sanitizeParams(params);
  const requestParams = withTicket(apiParams);
  const url = new URL(`${EMPRESAS_BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(requestParams)) {
    url.searchParams.set(key, value);
  }

  return executeMercadoPublicoRequest<T>({
    resource: endpoint,
    apiParams,
    url,
    cacheTtlSeconds,
    cacheStrategy: "cache-first"
  });
}

async function executeMercadoPublicoRequest<T>({
  resource,
  apiParams,
  url,
  cacheTtlSeconds,
  cacheStrategy
}: {
  resource: CacheResource;
  apiParams: Record<string, string>;
  url: URL;
  cacheTtlSeconds: number;
  cacheStrategy: "cache-first" | "network-only";
}) {
  const cacheKey = buildCacheKey(resource, apiParams);

  if (cacheStrategy === "cache-first") {
    const cached = await readCache<T>(cacheKey, "fresh");
    if (cached) {
      await logApiRequest({
        resource,
        params: apiParams,
        status: 200,
        cacheHit: true
      });

      return {
        data: cached.payload,
        cache: {
          key: cacheKey,
          hit: true,
          enabled: true,
          stale: false,
          expiresAt: cached.expiresAt
        }
      };
    }
  }

  const dailyLimit = getMercadoPublicoDailyLimit();
  const requestsToday = await countMercadoPublicoExternalRequestsToday();
  const nearLimit = requestsToday >= Math.floor(dailyLimit * RATE_LIMIT_SAFETY_RATIO);

  if (nearLimit) {
    const staleCache = await readCache<T>(cacheKey, "stale");
    if (staleCache) {
      await logApiRequest({
        resource,
        params: apiParams,
        status: 200,
        cacheHit: true,
        errorMessage: "Se devolvió cache vencido por límite preventivo diario."
      });

      return {
        data: staleCache.payload,
        cache: {
          key: cacheKey,
          hit: true,
          enabled: true,
          stale: true,
          expiresAt: staleCache.expiresAt
        }
      };
    }

    const rateLimitError = new MercadoPublicoRateLimitError(dailyLimit);
    await logApiRequest({
      resource,
      params: apiParams,
      status: rateLimitError.status,
      cacheHit: false,
      errorMessage: rateLimitError.message
    });
    throw rateLimitError;
  }

  try {
    const response = await fetch(url, {
      next: { revalidate: Math.min(cacheTtlSeconds, 3600) },
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const message = `Mercado Público respondió ${response.status} para ${resource}.`;
      await logApiRequest({
        resource,
        params: apiParams,
        status: response.status,
        cacheHit: false,
        errorMessage: message
      });
      throw new Error(message);
    }

    const data = (await response.json()) as T;
    const cacheWrite = await writeCache(cacheKey, resource, apiParams, data, cacheTtlSeconds);

    await logApiRequest({
      resource,
      params: apiParams,
      status: response.status,
      cacheHit: false
    });

    return {
      data,
      cache: {
        key: cacheKey,
        hit: false,
        enabled: cacheWrite,
        stale: false,
        expiresAt: new Date(Date.now() + cacheTtlSeconds * 1000).toISOString()
      }
    };
  } catch (error) {
    if (error instanceof MercadoPublicoRateLimitError) {
      throw error;
    }

    const staleCache = await readCache<T>(cacheKey, "stale");
    if (staleCache) {
      await logApiRequest({
        resource,
        params: apiParams,
        status: 200,
        cacheHit: true,
        errorMessage: error instanceof Error ? `Fallback a cache vencido: ${error.message}` : "Fallback a cache vencido."
      });

      return {
        data: staleCache.payload,
        cache: {
          key: cacheKey,
          hit: true,
          enabled: true,
          stale: true,
          expiresAt: staleCache.expiresAt
        }
      };
    }

    await logApiRequest({
      resource,
      params: apiParams,
      status: 502,
      cacheHit: false,
      errorMessage: error instanceof Error ? error.message : "Error desconocido al consultar Mercado Público."
    });

    throw error;
  }
}

function toLicitacionesParams(params: TenderSearchParams) {
  return {
    estado: params.status,
    fecha: params.date ? toMercadoPublicoDate(params.date) : undefined,
    CodigoOrganismo: params.buyerCode,
    CodigoProveedor: params.supplierCode
  };
}

function buildPublicUrl(resource: MercadoPublicoResource, format: MercadoPublicoFormat, params: Record<string, string>) {
  const url = new URL(`${PUBLIC_BASE_URL}/${resource}.${format}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildCacheKey(resource: CacheResource, params: Record<string, string>) {
  const stableParams = Object.entries(params)
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

async function readCache<T>(cacheKey: string, mode: "fresh" | "stale") {
  const supabase = createCacheClient();
  if (!supabase) {
    return null;
  }

  let query = supabase.from(CACHE_TABLE).select("payload, expires_at").eq("cache_key", cacheKey);

  if (mode === "fresh") {
    query = query.gt("expires_at", new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();

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
  resource: CacheResource,
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
      expires_at: expiresAt,
      updated_at: new Date().toISOString()
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

function withTicket(params: Record<string, string>) {
  return {
    ...params,
    ticket: requireEnv(ENV_KEYS.mercadoPublicoTicket)
  };
}

function getMercadoPublicoDailyLimit() {
  return getNumberEnv(ENV_KEYS.mercadoPublicoDailyLimit, 10000);
}

function getDefaultCacheTtlSeconds() {
  return getNumberEnv(ENV_KEYS.mercadoPublicoCacheTtlMinutes, 60) * 60;
}

function toMercadoPublicoDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return date;
  }

  return `${day}${month}${year}`;
}
