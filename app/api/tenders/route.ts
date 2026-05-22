import { NextResponse } from "next/server";
import { enrichTenderPageWithDetails, searchTenders } from "@/lib/mercado-publico/client";
import type { TenderListItem } from "@/lib/mercado-publico/types";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const tenders = await searchTenders({
      status: searchParams.get("status") || "activas",
      date: searchParams.get("date") || undefined,
      buyerCode: searchParams.get("buyerCode") || undefined,
      supplierCode: searchParams.get("supplierCode") || undefined
    });

    const filtered = applyFilters(tenders, {
      query: searchParams.get("query") || "",
      buyer: searchParams.get("buyer") || "",
      minAmount: parseAmount(searchParams.get("minAmount") || ""),
      maxAmount: parseAmount(searchParams.get("maxAmount") || "")
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const paginated = await enrichTenderPageWithDetails(filtered.slice(start, start + pageSize));

    return NextResponse.json({
      tenders: paginated,
      pagination: {
        page: currentPage,
        pageSize,
        total,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      }
    });
  } catch (error) {
    const status = error instanceof Error && "status" in error && error.status === 429 ? 429 : 502;

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No fue posible consultar Mercado Público"
      },
      { status }
    );
  }
}

function applyFilters(
  tenders: TenderListItem[],
  filters: {
    query: string;
    buyer: string;
    minAmount?: number;
    maxAmount?: number;
  }
) {
  const query = normalize(filters.query);
  const buyer = normalize(filters.buyer);

  return tenders.filter((tender) => {
    const searchText = normalize(
      [
        tender.code,
        tender.name,
        tender.description,
        tender.buyerName,
        tender.type,
        tender.region,
        tender.category
      ].join(" ")
    );

    const matchesQuery = !query || searchText.includes(query);
    const matchesBuyer = !buyer || normalize(tender.buyerName).includes(buyer);
    const matchesMin = filters.minAmount === undefined || (tender.amount ?? 0) >= filters.minAmount;
    const matchesMax = filters.maxAmount === undefined || (tender.amount ?? 0) <= filters.maxAmount;

    return matchesQuery && matchesBuyer && matchesMin && matchesMax;
  });
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAmount(value: string) {
  const clean = value.replace(/\D/g, "");
  if (!clean) {
    return undefined;
  }

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalize(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
