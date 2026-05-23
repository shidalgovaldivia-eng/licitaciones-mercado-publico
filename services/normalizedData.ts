import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";
import type { TenderDetail, TenderListItem } from "@/lib/mercado-publico/types";
import type { PurchaseOrderDetail, PurchaseOrderListItem } from "@/types/purchaseOrder";

type SupabaseQueryError = {
  code?: string;
  message: string;
};

export type NormalizedTenderRow = {
  code: string;
  name: string;
  description?: string;
  status_code?: string;
  status_label?: string;
  buyer_code?: string;
  buyer_name?: string;
  region?: string;
  commune?: string;
  category?: string;
  type?: string;
  amount?: number;
  amount_text?: string;
  publish_date?: string;
  close_date?: string;
  enriched: boolean;
  enriched_at?: string;
  normalized?: TenderDetail;
};

export type NormalizedPurchaseOrderRow = {
  code: string;
  name: string;
  description?: string;
  status_code?: string;
  status_label?: string;
  buyer_code?: string;
  buyer_name?: string;
  supplier_code?: string;
  supplier_name?: string;
  type?: string;
  currency?: string;
  net_total?: number;
  tax_amount?: number;
  gross_total?: number;
  sent_at?: string;
  enriched: boolean;
  enriched_at?: string;
  normalized?: PurchaseOrderDetail;
};

export async function upsertNormalizedTender(tender: TenderDetail) {
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { error } = await supabase.from("tenders_normalized").upsert(
    {
      code: tender.code,
      name: tender.name,
      description: tender.description,
      status_code: tender.status,
      status_label: tender.statusLabel,
      buyer_code: tender.buyerCode,
      buyer_name: tender.buyerName,
      region: tender.region,
      commune: tender.buyer?.commune,
      category: tender.category,
      type: tender.type,
      amount: tender.amount,
      amount_text: tender.amountText,
      publish_date: toIsoOrNull(tender.publishDate),
      close_date: toIsoOrNull(tender.closeDate),
      enriched: true,
      enriched_at: now,
      enrichment_status: "enriched",
      enrichment_error: null,
      retry_count: 0,
      normalized: tender,
      updated_at: now
    },
    { onConflict: "code" }
  );

  if (error) throw new Error(error.message);
}

export async function upsertPendingTender(tender: TenderListItem) {
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { error } = await supabase.from("tenders_normalized").upsert(
    {
      code: tender.code,
      name: tender.name,
      description: tender.description,
      status_code: tender.status,
      status_label: tender.statusLabel,
      buyer_code: tender.buyerCode,
      buyer_name: tender.buyerName,
      region: tender.region,
      category: tender.category,
      type: tender.type,
      amount: tender.amount,
      amount_text: tender.amountText,
      publish_date: toIsoOrNull(tender.publishDate),
      close_date: toIsoOrNull(tender.closeDate),
      enriched: false,
      enrichment_status: "pending",
      enrichment_error: null,
      retry_count: 0,
      normalized: tender,
      updated_at: now
    },
    { onConflict: "code", ignoreDuplicates: true }
  );

  if (error) throw new Error(error.message);
}

export async function upsertPendingTenders(tenders: TenderListItem[]) {
  if (tenders.length === 0) return;

  const now = new Date().toISOString();
  const supabase = createServiceClient();

  for (let index = 0; index < tenders.length; index += 500) {
    const chunk = tenders.slice(index, index + 500);
    const { error } = await supabase.from("tenders_normalized").upsert(
      chunk.map((tender) => ({
        code: tender.code,
        name: tender.name,
        description: tender.description,
        status_code: tender.status,
        status_label: tender.statusLabel,
        buyer_code: tender.buyerCode,
        buyer_name: tender.buyerName,
        region: tender.region,
        category: tender.category,
        type: tender.type,
        amount: tender.amount,
        amount_text: tender.amountText,
        publish_date: toIsoOrNull(tender.publishDate),
        close_date: toIsoOrNull(tender.closeDate),
        enriched: false,
        enrichment_status: "pending",
        enrichment_error: null,
        retry_count: 0,
        normalized: tender,
        updated_at: now
      })),
      { onConflict: "code", ignoreDuplicates: true }
    );

    if (error) throw new Error(error.message);
  }
}

export async function upsertNormalizedPurchaseOrder(order: PurchaseOrderDetail) {
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { error } = await supabase.from("purchase_orders_normalized").upsert(
    {
      code: order.code,
      name: order.name,
      description: order.description,
      status_code: order.statusCode,
      status_label: order.statusLabel,
      buyer_code: order.buyer.code,
      buyer_name: order.buyer.name,
      supplier_code: order.supplier.code,
      supplier_name: order.supplier.name,
      type: order.type,
      currency: order.currency,
      net_total: order.netTotal,
      tax_amount: order.taxAmount,
      gross_total: order.grossTotal ?? order.total,
      sent_at: toIsoOrNull(order.sentAt ?? order.dates.sentAt),
      enriched: true,
      enriched_at: now,
      normalized: order,
      updated_at: now
    },
    { onConflict: "code" }
  );

  if (error) throw new Error(error.message);
}

export async function upsertPendingPurchaseOrder(order: PurchaseOrderListItem) {
  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { error } = await supabase.from("purchase_orders_normalized").upsert(
    {
      code: order.code,
      name: order.name,
      status_code: order.statusCode,
      status_label: order.statusLabel,
      buyer_name: order.buyerName,
      supplier_name: order.supplierName,
      type: order.type,
      currency: order.currency,
      gross_total: order.total,
      sent_at: toIsoOrNull(order.sentAt),
      enriched: false,
      normalized: order,
      updated_at: now
    },
    { onConflict: "code", ignoreDuplicates: true }
  );

  if (error) throw new Error(error.message);
}

export async function getEnrichedTenderCodes(codes: string[]) {
  if (codes.length === 0) return new Set<string>();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("tenders_normalized").select("code").in("code", codes).eq("enriched", true);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row: { code: string }) => row.code));
}

export async function getPendingTenderCodes(limit: number) {
  if (limit <= 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenders_normalized")
    .select("code")
    .eq("enriched", false)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { code: string }) => row.code);
}

export async function getProcessableTenderCodes(limit: number, maxRetries: number) {
  if (limit <= 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenders_normalized")
    .select("code")
    .eq("enriched", false)
    .in("enrichment_status", ["pending", "failed"])
    .lt("retry_count", maxRetries)
    .order("retry_count", { ascending: true })
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { code: string }) => row.code);
}

export async function resetStaleTenderEnrichment(ageMinutes = 30) {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - ageMinutes * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("tenders_normalized")
    .update({
      enrichment_status: "failed",
      enrichment_error: "Enrichment quedo en running y fue marcado como stale.",
      updated_at: new Date().toISOString()
    })
    .eq("enriched", false)
    .eq("enrichment_status", "running")
    .lt("updated_at", cutoff);

  if (error) throw new Error(error.message);
}

export async function markTenderEnrichmentRunning(codes: string[]) {
  if (codes.length === 0) return;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("tenders_normalized")
    .update({
      enrichment_status: "running",
      enrichment_error: null,
      updated_at: new Date().toISOString()
    })
    .in("code", codes)
    .eq("enriched", false)
    .in("enrichment_status", ["pending", "failed"]);

  if (error) throw new Error(error.message);
}

export async function markTenderEnrichmentFailed(code: string, message: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("tenders_normalized")
    .select("retry_count")
    .eq("code", code)
    .maybeSingle();

  const retryCount = typeof data?.retry_count === "number" ? data.retry_count + 1 : 1;
  const { error } = await supabase
    .from("tenders_normalized")
    .update({
      enrichment_status: "failed",
      enrichment_error: message.slice(0, 500),
      retry_count: retryCount,
      updated_at: new Date().toISOString()
    })
    .eq("code", code);

  if (error) throw new Error(error.message);
}

export async function acquireEnrichmentLock(name: string, ttlSeconds = 900) {
  const supabase = createServiceClient();
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  const owner = `${name}:${now.toISOString()}`;

  const insert = await supabase
    .from("enrichment_locks")
    .insert({
      name,
      locked_at: now.toISOString(),
      locked_until: lockedUntil,
      owner,
      updated_at: now.toISOString()
    })
    .select("name, owner, locked_until")
    .maybeSingle();

  if (!insert.error && insert.data) {
    return { acquired: true, owner, lockedUntil };
  }

  const update = await supabase
    .from("enrichment_locks")
    .update({
      locked_at: now.toISOString(),
      locked_until: lockedUntil,
      owner,
      updated_at: now.toISOString()
    })
    .eq("name", name)
    .lt("locked_until", now.toISOString())
    .select("name, owner, locked_until")
    .maybeSingle();

  if (update.error) throw new Error(update.error.message);
  return { acquired: Boolean(update.data), owner, lockedUntil };
}

export async function releaseEnrichmentLock(name: string, owner: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("enrichment_locks")
    .update({
      locked_until: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("name", name)
    .eq("owner", owner);

  if (error) throw new Error(error.message);
}

export async function getNormalizedTendersByCodes(codes: string[]) {
  const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
  const tenders = new Map<string, TenderListItem>();
  if (uniqueCodes.length === 0) return tenders;

  const supabase = createServiceClient();

  for (let index = 0; index < uniqueCodes.length; index += 500) {
    const chunk = uniqueCodes.slice(index, index + 500);
    const { data, error } = await supabase
      .from("tenders_normalized")
      .select("*")
      .in("code", chunk);

    if (error && isMissingTableError(error)) return tenders;
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as NormalizedTenderRow[]) {
      tenders.set(row.code, normalizedTenderRowToListItem(row));
    }
  }

  return tenders;
}

export async function getEnrichedPurchaseOrderCodes(codes: string[]) {
  if (codes.length === 0) return new Set<string>();
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("purchase_orders_normalized").select("code").in("code", codes).eq("enriched", true);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row: { code: string }) => row.code));
}

export async function getNormalizedPurchaseOrdersByCodes(codes: string[]) {
  const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
  const orders = new Map<string, PurchaseOrderListItem>();
  if (uniqueCodes.length === 0) return orders;

  const supabase = createServiceClient();

  for (let index = 0; index < uniqueCodes.length; index += 500) {
    const chunk = uniqueCodes.slice(index, index + 500);
    const { data, error } = await supabase
      .from("purchase_orders_normalized")
      .select("*")
      .in("code", chunk);

    if (error && isMissingTableError(error)) return orders;
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as NormalizedPurchaseOrderRow[]) {
      orders.set(row.code, normalizedPurchaseOrderRowToListItem(row));
    }
  }

  return orders;
}

export async function readEnrichedTendersForDashboard() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tenders_normalized")
    .select("code, name, status_code, status_label, buyer_name, close_date, enriched")
    .eq("enriched", true)
    .order("updated_at", { ascending: false })
    .limit(5000);

  if (error && isMissingTableError(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as NormalizedTenderRow[];
}

export async function getNormalizationMetrics() {
  const supabase = createServiceClient();
  const [tendersTotal, tendersEnriched, purchaseOrdersTotal, purchaseOrdersEnriched] = await Promise.all([
    supabase.from("tenders_normalized").select("code", { count: "exact", head: true }),
    supabase.from("tenders_normalized").select("code", { count: "exact", head: true }).eq("enriched", true),
    supabase.from("purchase_orders_normalized").select("code", { count: "exact", head: true }),
    supabase.from("purchase_orders_normalized").select("code", { count: "exact", head: true }).eq("enriched", true)
  ]);

  for (const result of [tendersTotal, tendersEnriched, purchaseOrdersTotal, purchaseOrdersEnriched]) {
    if (result.error && isMissingTableError(result.error)) {
      return {
        tenders: buildMetric(0, 0),
        purchaseOrders: buildMetric(0, 0)
      };
    }

    if (result.error) throw new Error(result.error.message);
  }

  return {
    tenders: buildMetric(tendersTotal.count ?? 0, tendersEnriched.count ?? 0),
    purchaseOrders: buildMetric(purchaseOrdersTotal.count ?? 0, purchaseOrdersEnriched.count ?? 0)
  };
}

function isMissingTableError(error: SupabaseQueryError) {
  return error.code === "PGRST205" || error.message.toLowerCase().includes("could not find the table");
}

function normalizedTenderRowToListItem(row: NormalizedTenderRow): TenderListItem {
  if (row.enriched && row.normalized?.code) {
    return row.normalized;
  }

  return {
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status_code ?? "",
    statusLabel: row.status_label ?? "Sin estado",
    buyer: {
      code: row.buyer_code,
      name: row.buyer_name,
      region: row.region,
      commune: row.commune
    },
    buyerName: row.buyer_name,
    buyerCode: row.buyer_code,
    category: row.category,
    region: row.region,
    type: row.type,
    amount: row.amount,
    amountText: row.amount_text,
    publishDate: row.publish_date,
    closeDate: row.close_date
  };
}

function normalizedPurchaseOrderRowToListItem(row: NormalizedPurchaseOrderRow): PurchaseOrderListItem {
  if (row.enriched && row.normalized?.code) {
    return row.normalized;
  }

  return {
    code: row.code,
    name: row.name,
    statusCode: row.status_code,
    statusLabel: row.status_label ?? "Sin estado",
    type: row.type,
    buyerName: row.buyer_name,
    supplierName: row.supplier_name,
    total: row.gross_total,
    currency: row.currency,
    sentAt: row.sent_at
  };
}

function buildMetric(total: number, enriched: number) {
  const pending = Math.max(0, total - enriched);
  return {
    total,
    enriched,
    pending,
    enrichedPercent: total > 0 ? Math.round((enriched / total) * 100) : 0
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

function toIsoOrNull(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
