import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/env";
import { normalizeTenderListItem } from "@/lib/mercado-publico/normalizers";
import type { MercadoPublicoResponse, TenderListItem } from "@/lib/mercado-publico/types";
import { searchTenders } from "@/lib/mercado-publico/client";

const CACHE_TABLE = "licitaciones_cache";
const STOP_WORDS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "los",
  "para",
  "por",
  "un",
  "una",
  "y",
  "o",
  "e",
  "servicio",
  "servicios",
  "adquisicion",
  "contratacion",
  "suministro",
  "compra"
]);

export type DashboardSummary = {
  generatedAt: string;
  source: "supabase_cache" | "mercado_publico";
  totalActiveTenders: number;
  closingNext48Hours: number;
  topBuyers: SummaryBucket[];
  topStatuses: SummaryBucket[];
  topWords: SummaryBucket[];
  closingByDate: SummaryBucket[];
};

export type SummaryBucket = {
  label: string;
  value: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  let tenders = await readTendersFromCache();
  let source: DashboardSummary["source"] = "supabase_cache";

  if (tenders.length === 0) {
    tenders = await searchTenders({ status: "activas" });
    source = "mercado_publico";
  }

  const activeTenders = dedupeByCode(tenders).filter(isActiveTender);

  return {
    generatedAt: new Date().toISOString(),
    source,
    totalActiveTenders: activeTenders.length,
    closingNext48Hours: countClosingNext48Hours(activeTenders),
    topBuyers: topBuckets(activeTenders.map((tender) => tender.buyerName || "Organismo no informado"), 8),
    topStatuses: topBuckets(activeTenders.map((tender) => tender.statusLabel || "Sin estado"), 8),
    topWords: topWords(activeTenders, 12),
    closingByDate: closingByDate(activeTenders)
  };
}

async function readTendersFromCache() {
  const supabase = createCacheClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select("payload, params, fetched_at")
    .eq("resource", "licitaciones")
    .order("fetched_at", { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return data.flatMap((row) => {
    const payload = row.payload as MercadoPublicoResponse;
    return Array.isArray(payload.Listado) ? payload.Listado.map(normalizeTenderListItem) : [];
  });
}

function dedupeByCode(tenders: TenderListItem[]) {
  const map = new Map<string, TenderListItem>();
  for (const tender of tenders) {
    map.set(tender.code, tender);
  }

  return Array.from(map.values());
}

function isActiveTender(tender: TenderListItem) {
  const status = String(tender.status).toLowerCase();
  const label = tender.statusLabel.toLowerCase();
  return status === "5" || status === "activas" || label.includes("publicada") || label.includes("activa");
}

function countClosingNext48Hours(tenders: TenderListItem[]) {
  const now = Date.now();
  const max = now + 48 * 60 * 60 * 1000;

  return tenders.filter((tender) => {
    const closeTime = tender.closeDate ? new Date(tender.closeDate).getTime() : Number.NaN;
    return Number.isFinite(closeTime) && closeTime >= now && closeTime <= max;
  }).length;
}

function topBuckets(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value.trim() || "Sin informar";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function topWords(tenders: TenderListItem[], limit: number) {
  const words = tenders.flatMap((tender) =>
    normalizeText(tender.name)
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
  );

  return topBuckets(words, limit);
}

function closingByDate(tenders: TenderListItem[]) {
  const dates = tenders
    .map((tender) => {
      if (!tender.closeDate) return undefined;
      const date = new Date(tender.closeDate);
      if (Number.isNaN(date.getTime())) return undefined;
      return date.toISOString().slice(0, 10);
    })
    .filter((date): date is string => Boolean(date));

  return topBuckets(dates, 14).sort((left, right) => left.label.localeCompare(right.label));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
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
