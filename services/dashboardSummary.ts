import "server-only";
import { getNormalizationMetrics, readEnrichedTendersForDashboard, type NormalizedTenderRow } from "@/services/normalizedData";

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
  source: "normalized_supabase";
  totalActiveTenders: number;
  closingNext48Hours: number;
  topBuyers: SummaryBucket[];
  topStatuses: SummaryBucket[];
  topWords: SummaryBucket[];
  closingByDate: SummaryBucket[];
  normalization: {
    tenders: NormalizationMetric;
    purchaseOrders: NormalizationMetric;
  };
};

export type SummaryBucket = {
  label: string;
  value: number;
};

export type NormalizationMetric = {
  total: number;
  enriched: number;
  pending: number;
  enrichedPercent: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [tenders, normalization] = await Promise.all([
    readEnrichedTendersForDashboard(),
    getNormalizationMetrics()
  ]);

  const activeTenders = tenders.filter(isActiveTender);

  return {
    generatedAt: new Date().toISOString(),
    source: "normalized_supabase",
    totalActiveTenders: activeTenders.length,
    closingNext48Hours: countClosingNext48Hours(activeTenders),
    topBuyers: topBuckets(activeTenders.map((tender) => tender.buyer_name).filter(isPresent), 8),
    topStatuses: topBuckets(activeTenders.map((tender) => tender.status_label || "Sin estado"), 8),
    topWords: topWords(activeTenders, 12),
    closingByDate: closingByDate(activeTenders),
    normalization
  };
}

function isActiveTender(tender: NormalizedTenderRow) {
  const status = String(tender.status_code ?? "").toLowerCase();
  const label = String(tender.status_label ?? "").toLowerCase();
  return status === "5" || status === "activas" || label.includes("publicada") || label.includes("activa");
}

function countClosingNext48Hours(tenders: NormalizedTenderRow[]) {
  const now = Date.now();
  const max = now + 48 * 60 * 60 * 1000;

  return tenders.filter((tender) => {
    const closeTime = tender.close_date ? new Date(tender.close_date).getTime() : Number.NaN;
    return Number.isFinite(closeTime) && closeTime >= now && closeTime <= max;
  }).length;
}

function topBuckets(values: string[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value.trim();
    if (!label || label === "No informado" || label === "No especificado") continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function topWords(tenders: NormalizedTenderRow[], limit: number) {
  const words = tenders.flatMap((tender) =>
    normalizeText(tender.name)
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
  );

  return topBuckets(words, limit);
}

function closingByDate(tenders: NormalizedTenderRow[]) {
  const dates = tenders
    .map((tender) => {
      if (!tender.close_date) return undefined;
      const date = new Date(tender.close_date);
      if (Number.isNaN(date.getTime())) return undefined;
      return date.toISOString().slice(0, 10);
    })
    .filter(isPresent);

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

function isPresent(value?: string | null): value is string {
  return Boolean(value && value.trim().length > 0);
}
