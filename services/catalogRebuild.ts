import "server-only";
import { createClient } from "@supabase/supabase-js";
import { elapsedMs, nowMs } from "@/lib/performance";
import { getSupabaseServerEnv } from "@/lib/env";
import type { TenderDetail } from "@/lib/mercado-publico/types";
import type { PurchaseOrderDetail } from "@/types/purchaseOrder";

type TenderCatalogRow = {
  code: string;
  buyer_code?: string | null;
  buyer_name?: string | null;
  region?: string | null;
  category?: string | null;
  amount?: number | null;
  close_date?: string | null;
  updated_at?: string | null;
  normalized?: TenderDetail | null;
};

type PurchaseOrderCatalogRow = {
  code: string;
  buyer_code?: string | null;
  buyer_name?: string | null;
  supplier_code?: string | null;
  supplier_name?: string | null;
  category?: string | null;
  region?: string | null;
  gross_total?: number | null;
  sent_at?: string | null;
  updated_at?: string | null;
  normalized?: PurchaseOrderDetail | null;
};

type BuyerAggregate = {
  buyer_key: string;
  buyer_code?: string;
  buyer_name: string;
  region?: string;
  total_tenders: number;
  total_purchase_orders: number;
  total_amount: number;
  last_activity_at?: string;
  source_updated_at?: string;
  updated_at: string;
};

type SupplierAggregate = {
  supplier_key: string;
  supplier_code?: string;
  supplier_name: string;
  total_orders: number;
  total_amount: number;
  last_activity_at?: string;
  source_updated_at?: string;
  updated_at: string;
};

type CategoryAggregate = {
  category_key: string;
  category_code?: string;
  category_name: string;
  tender_count: number;
  purchase_order_count: number;
  total_amount: number;
  last_activity_at?: string;
  updated_at: string;
};

export type CatalogRebuildResult = {
  buyersProcessed: number;
  suppliersProcessed: number;
  categoriesProcessed: number;
  durationMs: number;
  errors: string[];
};

export async function rebuildCatalogs(): Promise<CatalogRebuildResult> {
  const startedAt = nowMs();
  const errors: string[] = [];
  const supabase = createServiceClient();

  const [tenders, purchaseOrders] = await Promise.all([
    readTenders(supabase, errors),
    readPurchaseOrders(supabase, errors)
  ]);

  const now = new Date().toISOString();
  const buyers = new Map<string, BuyerAggregate>();
  const suppliers = new Map<string, SupplierAggregate>();
  const categories = new Map<string, CategoryAggregate>();

  for (const tender of tenders) {
    addTenderBuyer(buyers, tender, now);
    addTenderCategory(categories, tender, now);
  }

  for (const order of purchaseOrders) {
    addPurchaseOrderBuyer(buyers, order, now);
    addPurchaseOrderSupplier(suppliers, order, now);
    addPurchaseOrderCategory(categories, order, now);
  }

  await Promise.all([
    upsertChunks(supabase, "buyers_normalized", Array.from(buyers.values()), "buyer_key", errors),
    upsertChunks(supabase, "suppliers_normalized", Array.from(suppliers.values()), "supplier_key", errors),
    upsertChunks(supabase, "categories_normalized", Array.from(categories.values()), "category_key", errors)
  ]);

  return {
    buyersProcessed: buyers.size,
    suppliersProcessed: suppliers.size,
    categoriesProcessed: categories.size,
    durationMs: elapsedMs(startedAt),
    errors
  };
}

async function readTenders(supabase: ReturnType<typeof createServiceClient>, errors: string[]) {
  const { data, error } = await supabase
    .from("tenders_normalized")
    .select("code, buyer_code, buyer_name, region, category, amount, close_date, updated_at, normalized")
    .limit(10000);

  if (error) {
    errors.push(`tenders_normalized: ${error.message}`);
    return [];
  }

  return (data ?? []) as TenderCatalogRow[];
}

async function readPurchaseOrders(supabase: ReturnType<typeof createServiceClient>, errors: string[]) {
  const { data, error } = await supabase
    .from("purchase_orders_normalized")
    .select("code, buyer_code, buyer_name, supplier_code, supplier_name, category, region, gross_total, sent_at, updated_at, normalized")
    .limit(10000);

  if (error) {
    errors.push(`purchase_orders_normalized: ${error.message}`);
    return [];
  }

  return (data ?? []) as PurchaseOrderCatalogRow[];
}

function addTenderBuyer(buyers: Map<string, BuyerAggregate>, tender: TenderCatalogRow, now: string) {
  const buyerName = cleanText(tender.buyer_name ?? tender.normalized?.buyerName ?? tender.normalized?.buyer?.name);
  if (!buyerName) return;

  const buyerCode = cleanText(tender.buyer_code ?? tender.normalized?.buyerCode ?? tender.normalized?.buyer?.code);
  const key = entityKey("buyer", buyerCode, buyerName);
  const current = buyers.get(key) ?? {
    buyer_key: key,
    buyer_code: buyerCode,
    buyer_name: buyerName,
    total_tenders: 0,
    total_purchase_orders: 0,
    total_amount: 0,
    updated_at: now
  };

  current.region = current.region ?? cleanText(tender.region ?? tender.normalized?.region ?? tender.normalized?.buyer?.region);
  current.total_tenders += 1;
  current.last_activity_at = maxDate(current.last_activity_at, tender.close_date ?? tender.normalized?.closeDate);
  current.source_updated_at = maxDate(current.source_updated_at, tender.updated_at);
  buyers.set(key, current);
}

function addPurchaseOrderBuyer(buyers: Map<string, BuyerAggregate>, order: PurchaseOrderCatalogRow, now: string) {
  const buyerName = cleanText(order.buyer_name ?? order.normalized?.buyerName ?? order.normalized?.buyer?.name);
  if (!buyerName) return;

  const buyerCode = cleanText(order.buyer_code ?? order.normalized?.buyer?.code);
  const key = entityKey("buyer", buyerCode, buyerName);
  const current = buyers.get(key) ?? {
    buyer_key: key,
    buyer_code: buyerCode,
    buyer_name: buyerName,
    total_tenders: 0,
    total_purchase_orders: 0,
    total_amount: 0,
    updated_at: now
  };

  current.region = current.region ?? cleanText(order.region ?? order.normalized?.buyer?.region);
  current.total_purchase_orders += 1;
  current.total_amount += numeric(order.gross_total ?? order.normalized?.grossTotal ?? order.normalized?.total);
  current.last_activity_at = maxDate(current.last_activity_at, order.sent_at ?? order.normalized?.sentAt ?? order.normalized?.dates?.sentAt);
  current.source_updated_at = maxDate(current.source_updated_at, order.updated_at);
  buyers.set(key, current);
}

function addPurchaseOrderSupplier(suppliers: Map<string, SupplierAggregate>, order: PurchaseOrderCatalogRow, now: string) {
  const supplierName = cleanText(order.supplier_name ?? order.normalized?.supplierName ?? order.normalized?.supplier?.name);
  if (!supplierName) return;

  const supplierCode = cleanText(order.supplier_code ?? order.normalized?.supplier?.code);
  const key = entityKey("supplier", supplierCode, supplierName);
  const current = suppliers.get(key) ?? {
    supplier_key: key,
    supplier_code: supplierCode,
    supplier_name: supplierName,
    total_orders: 0,
    total_amount: 0,
    updated_at: now
  };

  current.total_orders += 1;
  current.total_amount += numeric(order.gross_total ?? order.normalized?.grossTotal ?? order.normalized?.total);
  current.last_activity_at = maxDate(current.last_activity_at, order.sent_at ?? order.normalized?.sentAt ?? order.normalized?.dates?.sentAt);
  current.source_updated_at = maxDate(current.source_updated_at, order.updated_at);
  suppliers.set(key, current);
}

function addTenderCategory(categories: Map<string, CategoryAggregate>, tender: TenderCatalogRow, now: string) {
  const item = tender.normalized?.items?.find((entry) => entry.category || entry.categoryCode);
  const categoryName = cleanText(tender.category ?? tender.normalized?.category ?? item?.category);
  if (!categoryName) return;

  const categoryCode = cleanText(tender.normalized?.categoryCode ?? item?.categoryCode);
  const key = entityKey("category", categoryCode, categoryName);
  const current = categories.get(key) ?? {
    category_key: key,
    category_code: categoryCode,
    category_name: categoryName,
    tender_count: 0,
    purchase_order_count: 0,
    total_amount: 0,
    updated_at: now
  };

  current.tender_count += 1;
  current.last_activity_at = maxDate(current.last_activity_at, tender.close_date ?? tender.normalized?.closeDate);
  categories.set(key, current);
}

function addPurchaseOrderCategory(categories: Map<string, CategoryAggregate>, order: PurchaseOrderCatalogRow, now: string) {
  const item = order.normalized?.items?.find((entry) => entry.category || entry.categoryCode);
  const categoryName = cleanText(order.category ?? item?.category);
  if (!categoryName) return;

  const categoryCode = cleanText(item?.categoryCode);
  const key = entityKey("category", categoryCode, categoryName);
  const current = categories.get(key) ?? {
    category_key: key,
    category_code: categoryCode,
    category_name: categoryName,
    tender_count: 0,
    purchase_order_count: 0,
    total_amount: 0,
    updated_at: now
  };

  current.purchase_order_count += 1;
  current.total_amount += numeric(order.gross_total ?? order.normalized?.grossTotal ?? order.normalized?.total);
  current.last_activity_at = maxDate(current.last_activity_at, order.sent_at ?? order.normalized?.sentAt ?? order.normalized?.dates?.sentAt);
  categories.set(key, current);
}

async function upsertChunks(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  rows: Array<Record<string, unknown>>,
  onConflict: string,
  errors: string[]
) {
  for (let index = 0; index < rows.length; index += 500) {
    const chunk = rows.slice(index, index + 500);
    if (chunk.length === 0) continue;

    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      errors.push(`${table}: ${error.message}`);
    }
  }
}

function entityKey(prefix: string, code: string | undefined, name: string) {
  return code ? `${prefix}:code:${code}` : `${prefix}:name:${slugify(name)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function numeric(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function maxDate(current?: string, candidate?: string | null) {
  if (!candidate) return current;
  const candidateTime = new Date(candidate).getTime();
  if (!Number.isFinite(candidateTime)) return current;
  if (!current) return new Date(candidateTime).toISOString();
  const currentTime = new Date(current).getTime();
  return candidateTime > currentTime ? new Date(candidateTime).toISOString() : current;
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
