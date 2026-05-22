import "server-only";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

const PROVIDER = "mercado_publico";
const LOG_TABLE = "api_request_log";

export type ApiRequestLogInput = {
  resource: string;
  params: Record<string, string>;
  status?: number;
  cacheHit: boolean;
  errorMessage?: string;
};

export type ApiUsageSummary = {
  externalRequestsToday: number;
  cacheHitsToday: number;
  errorsToday: number;
  latest: ApiRequestLogRow[];
};

export type ApiRequestLogRow = {
  id: string;
  provider: string;
  resource: string;
  params: Record<string, unknown>;
  params_hash: string | null;
  status: number | null;
  cache_hit: boolean;
  error_message: string | null;
  created_at: string;
};

export async function logApiRequest(input: ApiRequestLogInput) {
  const supabase = createLogClient();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from(LOG_TABLE).insert({
    provider: PROVIDER,
    resource: input.resource,
    params: input.params,
    params_hash: hashParams(input.params),
    status: input.status,
    cache_hit: input.cacheHit,
    error_message: input.errorMessage
  });

  return !error;
}

export async function countMercadoPublicoExternalRequestsToday() {
  const supabase = createLogClient();
  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from(LOG_TABLE)
    .select("id")
    .eq("provider", PROVIDER)
    .eq("cache_hit", false)
    .gte("created_at", startOfTodayIso());

  if (error) {
    return 0;
  }

  return data?.length ?? 0;
}

export async function getApiUsageSummary(): Promise<ApiUsageSummary> {
  const supabase = createLogClient();
  if (!supabase) {
    return {
      externalRequestsToday: 0,
      cacheHitsToday: 0,
      errorsToday: 0,
      latest: []
    };
  }

  const today = startOfTodayIso();
  const [external, cacheHits, errors, latest] = await Promise.all([
    supabase
      .from(LOG_TABLE)
      .select("id")
      .eq("provider", PROVIDER)
      .eq("cache_hit", false)
      .gte("created_at", today),
    supabase
      .from(LOG_TABLE)
      .select("id")
      .eq("provider", PROVIDER)
      .eq("cache_hit", true)
      .gte("created_at", today),
    supabase
      .from(LOG_TABLE)
      .select("id")
      .eq("provider", PROVIDER)
      .not("error_message", "is", null)
      .gte("created_at", today),
    supabase
      .from(LOG_TABLE)
      .select("id, provider, resource, params, params_hash, status, cache_hit, error_message, created_at")
      .eq("provider", PROVIDER)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  return {
    externalRequestsToday: external.data?.length ?? 0,
    cacheHitsToday: cacheHits.data?.length ?? 0,
    errorsToday: errors.data?.length ?? 0,
    latest: (latest.data ?? []) as ApiRequestLogRow[]
  };
}

export function hashParams(params: Record<string, string>) {
  return createHash("sha256").update(stableSerialize(params)).digest("hex");
}

function createLogClient() {
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

function startOfTodayIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function stableSerialize(params: Record<string, string>) {
  return JSON.stringify(Object.fromEntries(Object.entries(params).sort(([left], [right]) => left.localeCompare(right))));
}
