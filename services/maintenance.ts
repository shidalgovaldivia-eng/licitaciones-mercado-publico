import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export async function cleanupOperationalData() {
  const supabase = createServiceClient();
  const cacheCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const logCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const cacheDelete = await supabase
    .from("licitaciones_cache")
    .delete()
    .lt("expires_at", cacheCutoff)
    .select("cache_key");

  const logDelete = await supabase
    .from("api_request_log")
    .delete()
    .lt("created_at", logCutoff)
    .select("id");

  if (cacheDelete.error) {
    throw new Error(cacheDelete.error.message);
  }

  if (logDelete.error) {
    throw new Error(logDelete.error.message);
  }

  return {
    cacheCutoff,
    logCutoff,
    deletedCacheRows: cacheDelete.data?.length ?? 0,
    deletedApiRequestLogRows: logDelete.data?.length ?? 0
  };
}

function createServiceClient() {
  const env = getSupabaseServerEnv();
  if (!env) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no esta configurada.");
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
