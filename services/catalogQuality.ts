import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";

export type CatalogItem = {
  id?: string;
  label: string;
  code?: string | null;
  value: number;
};

export type CatalogQualityReport = {
  generatedAt: string;
  buyers: {
    total: number;
    withoutCode: number;
    withoutRegion: number;
    withTenders: number;
    withPurchaseOrders: number;
    topByAmount: CatalogItem[];
  };
  suppliers: {
    total: number;
    withoutCode: number;
    withOrders: number;
    topByAmount: CatalogItem[];
  };
  categories: {
    total: number;
    withoutCode: number;
    withTenders: number;
    withPurchaseOrders: number;
    topByAmount: CatalogItem[];
  };
  source: {
    enrichedPurchaseOrders: number;
    pendingPurchaseOrders: number;
    failedPurchaseOrders: number;
    totalPurchaseAmount: number;
    dataQualityPercent: number;
  };
  alerts: string[];
};

export async function getCatalogQualityReport(): Promise<CatalogQualityReport> {
  const supabase = createServiceClient();

  const [
    buyersTotal,
    buyersWithoutCode,
    buyersWithoutRegion,
    buyersWithTenders,
    buyersWithPurchaseOrders,
    suppliersTotal,
    suppliersWithoutCode,
    suppliersWithOrders,
    categoriesTotal,
    categoriesWithoutCode,
    categoriesWithTenders,
    categoriesWithPurchaseOrders,
    enrichedPurchaseOrders,
    pendingPurchaseOrders,
    failedPurchaseOrders,
    totalPurchaseAmount,
    topBuyers,
    topSuppliers,
    topCategories
  ] = await Promise.all([
    countRows(supabase, "buyers_normalized"),
    countRows(supabase, "buyers_normalized", "buyer_code", "is", null),
    countRows(supabase, "buyers_normalized", "region", "is", null),
    countRows(supabase, "buyers_normalized", "total_tenders", "gt", 0),
    countRows(supabase, "buyers_normalized", "total_purchase_orders", "gt", 0),
    countRows(supabase, "suppliers_normalized"),
    countRows(supabase, "suppliers_normalized", "supplier_code", "is", null),
    countRows(supabase, "suppliers_normalized", "total_orders", "gt", 0),
    countRows(supabase, "categories_normalized"),
    countRows(supabase, "categories_normalized", "category_code", "is", null),
    countRows(supabase, "categories_normalized", "tender_count", "gt", 0),
    countRows(supabase, "categories_normalized", "purchase_order_count", "gt", 0),
    countRows(supabase, "purchase_orders_normalized", "enriched", "eq", true),
    countPurchaseOrdersByEnrichmentStatus(supabase, "pending"),
    countPurchaseOrdersByEnrichmentStatus(supabase, "failed"),
    readTotalPurchaseAmount(supabase),
    readTopBuyers(supabase),
    readTopSuppliers(supabase),
    readTopCategories(supabase)
  ]);

  const dataQualityPercent = calculateDataQualityPercent({
    buyersTotal,
    buyersWithoutCode,
    suppliersTotal,
    suppliersWithoutCode,
    categoriesTotal,
    categoriesWithoutCode
  });

  const report: CatalogQualityReport = {
    generatedAt: new Date().toISOString(),
    buyers: {
      total: buyersTotal,
      withoutCode: buyersWithoutCode,
      withoutRegion: buyersWithoutRegion,
      withTenders: buyersWithTenders,
      withPurchaseOrders: buyersWithPurchaseOrders,
      topByAmount: topBuyers
    },
    suppliers: {
      total: suppliersTotal,
      withoutCode: suppliersWithoutCode,
      withOrders: suppliersWithOrders,
      topByAmount: topSuppliers
    },
    categories: {
      total: categoriesTotal,
      withoutCode: categoriesWithoutCode,
      withTenders: categoriesWithTenders,
      withPurchaseOrders: categoriesWithPurchaseOrders,
      topByAmount: topCategories
    },
    source: {
      enrichedPurchaseOrders,
      pendingPurchaseOrders,
      failedPurchaseOrders,
      totalPurchaseAmount,
      dataQualityPercent
    },
    alerts: []
  };

  report.alerts = buildAlerts(report);
  return report;
}

function buildAlerts(report: Omit<CatalogQualityReport, "alerts">) {
  const alerts: string[] = [];

  if (report.buyers.total > 0 && report.buyers.withoutCode / report.buyers.total > 0.5) {
    alerts.push("Mas del 50% de compradores no tiene codigo.");
  }

  if (report.suppliers.total > 0 && report.suppliers.withoutCode / report.suppliers.total > 0.5) {
    alerts.push("Mas del 50% de proveedores no tiene codigo.");
  }

  const amountRows = [
    ...report.buyers.topByAmount,
    ...report.suppliers.topByAmount,
    ...report.categories.topByAmount
  ];
  const positiveAmountRows = amountRows.filter((item) => item.value > 0).length;
  if (amountRows.length > 0 && positiveAmountRows / amountRows.length < 0.1) {
    alerts.push("total_amount esta en cero para casi todos los registros principales.");
  }

  if (report.categories.total < 10) {
    alerts.push("No hay categorias suficientes para analisis confiable.");
  }

  if (report.source.enrichedPurchaseOrders === 0) {
    alerts.push("No hay datos de ordenes de compra enriquecidas.");
  }

  return alerts;
}

async function countRows(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  column?: string,
  operator?: "eq" | "gt" | "is",
  value?: string | number | boolean | null
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  if (column && operator === "eq") query = query.eq(column, value);
  if (column && operator === "gt") query = query.gt(column, value);
  if (column && operator === "is") query = query.is(column, value);

  const { count, error } = await query;
  if (isMissingSchemaError(error)) return 0;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function countPurchaseOrdersByEnrichmentStatus(
  supabase: ReturnType<typeof createServiceClient>,
  status: "pending" | "failed"
) {
  const { count, error } = await supabase
    .from("purchase_orders_normalized")
    .select("id", { count: "exact", head: true })
    .or("enriched.eq.false,enriched.is.null")
    .eq("enrichment_status", status);

  if (isMissingSchemaError(error)) return 0;
  if (error) throw new Error(`purchase_orders_normalized: ${error.message}`);
  return count ?? 0;
}

async function readTotalPurchaseAmount(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("purchase_orders_normalized")
    .select("gross_total")
    .not("gross_total", "is", null)
    .limit(10000);

  if (isMissingSchemaError(error)) return 0;
  if (error) throw new Error(`purchase_orders_normalized: ${error.message}`);

  return (data ?? []).reduce((sum, row) => sum + Number(row.gross_total ?? 0), 0);
}

async function readTopBuyers(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("buyers_normalized")
    .select("id, buyer_code, buyer_name, total_amount")
    .order("total_amount", { ascending: false })
    .limit(10);

  if (isMissingSchemaError(error)) return [];
  if (error) throw new Error(`buyers_normalized: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.buyer_code,
    label: row.buyer_name,
    value: Number(row.total_amount ?? 0)
  }));
}

async function readTopSuppliers(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("suppliers_normalized")
    .select("id, supplier_code, supplier_name, total_amount")
    .order("total_amount", { ascending: false })
    .limit(10);

  if (isMissingSchemaError(error)) return [];
  if (error) throw new Error(`suppliers_normalized: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.supplier_code,
    label: row.supplier_name,
    value: Number(row.total_amount ?? 0)
  }));
}

async function readTopCategories(supabase: ReturnType<typeof createServiceClient>) {
  const { data, error } = await supabase
    .from("categories_normalized")
    .select("id, category_code, category_name, total_amount")
    .order("total_amount", { ascending: false })
    .limit(10);

  if (isMissingSchemaError(error)) return [];
  if (error) throw new Error(`categories_normalized: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.category_code,
    label: row.category_name,
    value: Number(row.total_amount ?? 0)
  }));
}

function calculateDataQualityPercent({
  buyersTotal,
  buyersWithoutCode,
  suppliersTotal,
  suppliersWithoutCode,
  categoriesTotal,
  categoriesWithoutCode
}: {
  buyersTotal: number;
  buyersWithoutCode: number;
  suppliersTotal: number;
  suppliersWithoutCode: number;
  categoriesTotal: number;
  categoriesWithoutCode: number;
}) {
  const total = buyersTotal + suppliersTotal + categoriesTotal;
  if (total === 0) return 0;

  const missing = buyersWithoutCode + suppliersWithoutCode + categoriesWithoutCode;
  return Math.max(0, Math.min(100, Math.round(((total - missing) / total) * 100)));
}

function isMissingSchemaError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message).toLowerCase() : "";

  return (
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("could not find the column") ||
    message.includes("schema cache")
  );
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
