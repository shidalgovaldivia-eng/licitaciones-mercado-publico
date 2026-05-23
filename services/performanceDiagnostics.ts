import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export type OperationalDataCounts = {
  cachedResponses: number;
  normalizedTenders: number;
  normalizedPurchaseOrders: number;
};

export async function getOperationalDataCounts(): Promise<OperationalDataCounts> {
  const env = getSupabaseServerEnv();
  if (!env) {
    return {
      cachedResponses: 0,
      normalizedTenders: 0,
      normalizedPurchaseOrders: 0
    };
  }

  const supabase = createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const [cache, tenders, purchaseOrders] = await Promise.all([
    supabase.from("licitaciones_cache").select("cache_key", { count: "exact", head: true }),
    supabase.from("tenders_normalized").select("code", { count: "exact", head: true }),
    supabase.from("purchase_orders_normalized").select("code", { count: "exact", head: true })
  ]);

  return {
    cachedResponses: cache.error ? 0 : cache.count ?? 0,
    normalizedTenders: tenders.error ? 0 : tenders.count ?? 0,
    normalizedPurchaseOrders: purchaseOrders.error ? 0 : purchaseOrders.count ?? 0
  };
}
