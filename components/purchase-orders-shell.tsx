"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarDays, LayoutGrid, List, RefreshCw, Search, ShoppingCart } from "lucide-react";
import { clsx } from "clsx";
import { ProductSidebar } from "@/components/product-sidebar";
import { ProductTopbar } from "@/components/product-topbar";
import { PurchaseOrderCard, PurchaseOrderCompactRow } from "@/components/purchase-order-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isPurchaseOrderIncomplete } from "@/lib/purchase-orders/completeness";
import type { PurchaseOrderListItem } from "@/types/purchaseOrder";

type ViewMode = "cards" | "compact";

type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const initialPagination: PaginationState = {
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

const MAX_ENRICH_CODES_PER_PAGE = 20;

const statusOptions = [
  { value: "", label: "Todos los estados" },
  { value: "enviadaproveedor", label: "Enviada a proveedor" },
  { value: "aceptada", label: "Aceptada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "recepcionconforme", label: "Recepcion conforme" },
  { value: "pendienterecepcion", label: "Pendiente recepcion" }
];

export function PurchaseOrdersShell() {
  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("compact");
  const [refreshToken, setRefreshToken] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [enrichingCodes, setEnrichingCodes] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const attemptedEnrichmentRef = useRef<Set<string>>(new Set());
  const enrichAbortRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async () => {
    void refreshToken;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pagination.pageSize));
    if (query) params.set("q", query);
    if (date) params.set("fecha", date);
    if (status) params.set("estado", status);

    try {
      const response = await fetch(`/api/purchase-orders?${params.toString()}`);
      const data = (await response.json()) as {
        orders?: PurchaseOrderListItem[];
        pagination?: PaginationState;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "No fue posible consultar ordenes de compra");
      setOrders(data.orders ?? []);
      setPagination(data.pagination ?? initialPagination);
      setEnrichingCodes({});
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Error desconocido");
      setOrders([]);
      setPagination(initialPagination);
    } finally {
      setIsLoading(false);
    }
  }, [date, page, pagination.pageSize, query, refreshToken, status]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (isLoading || orders.length === 0) {
      return;
    }

    const codes = orders
      .filter(isPurchaseOrderIncomplete)
      .map((order) => order.code)
      .filter((code) => !attemptedEnrichmentRef.current.has(code))
      .slice(0, MAX_ENRICH_CODES_PER_PAGE);

    if (codes.length === 0) {
      return;
    }

    for (const code of codes) {
      attemptedEnrichmentRef.current.add(code);
    }

    enrichAbortRef.current?.abort();
    const controller = new AbortController();
    enrichAbortRef.current = controller;
    let cancelled = false;

    setEnrichingCodes((current) => ({
      ...current,
      ...Object.fromEntries(codes.map((code) => [code, true]))
    }));

    async function enrichVisibleOrders() {
      try {
        const response = await fetch("/api/purchase-orders/enrich", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ codes }),
          signal: controller.signal
        });
        const data = (await response.json()) as {
          orders?: PurchaseOrderListItem[];
          failed?: Array<{ code: string; error: string }>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible enriquecer ordenes de compra");
        }

        if (cancelled || !data.orders?.length) {
          return;
        }

        const enrichedByCode = new Map(data.orders.map((order) => [order.code, order]));
        setOrders((current) =>
          current.map((order) => {
            const enriched = enrichedByCode.get(order.code);
            return enriched ? mergePurchaseOrderData(order, enriched) : order;
          })
        );
      } catch (enrichError) {
        if (enrichError instanceof DOMException && enrichError.name === "AbortError") {
          return;
        }
        console.info("[purchase-orders:enrichment]", enrichError instanceof Error ? enrichError.message : "Unknown error");
      } finally {
        if (!cancelled) {
          setEnrichingCodes((current) => {
            const next = { ...current };
            for (const code of codes) {
              delete next[code];
            }
            return next;
          });
        }
      }
    }

    void enrichVisibleOrders();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isLoading, orders]);

  function applySearch() {
    setPage(1);
    setRefreshToken((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-3 py-3 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-[1540px] gap-4 lg:grid-cols-[260px_1fr]">
        <ProductSidebar />

        <div className="min-w-0 space-y-4">
          <ProductTopbar placeholder="Buscar orden, proveedor, comprador o licitación relacionada..." />

          <header className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              <ShoppingCart className="h-3.5 w-3.5 text-ocean" />
              Compras reales del Estado
            </span>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_430px] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">Ordenes de Compra</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                Seguimiento de compras publicas
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Consulta ordenes emitidas, compradores, proveedores, totales y estados usando Mercado Publico con cache defensivo.
              </p>
            </div>
            <div className="rounded-2xl border border-line/80 bg-white/75 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resultados</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{pagination.total}</p>
              <p className="mt-1 text-sm text-slate-500">Pagina {pagination.page} de {pagination.totalPages}</p>
            </div>
          </div>
        </header>

        <Card>
          <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_180px_220px_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar orden</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por palabra, codigo, comprador o proveedor"
                className="pl-10"
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Fecha</span>
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="pl-10" />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="flex h-11 w-full rounded-xl border border-line bg-white/90 px-3.5 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-ocean/50 focus:bg-white focus:ring-4 focus:ring-ocean/10"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="button" onClick={applySearch} disabled={isLoading} className="h-11">
              Buscar
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-600">
                {isLoading ? "Consultando ordenes..." : `${pagination.total} ordenes encontradas`}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex rounded-xl border border-line bg-white/80 p-1 shadow-sm">
                  <Button type="button" size="sm" variant={viewMode === "cards" ? "default" : "ghost"} onClick={() => setViewMode("cards")}>
                    <LayoutGrid className="h-4 w-4" />
                    Tarjetas
                  </Button>
                  <Button type="button" size="sm" variant={viewMode === "compact" ? "default" : "ghost"} onClick={() => setViewMode("compact")}>
                    <List className="h-4 w-4" />
                    Compacto
                  </Button>
                </div>
                <Button type="button" variant="secondary" onClick={applySearch} disabled={isLoading}>
                  <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
                  Actualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {error ? <ErrorBox message={error} onRetry={applySearch} /> : null}

          {isLoading ? (
            <LoadingList />
          ) : orders.length > 0 ? (
            <>
              {viewMode === "cards" ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <PurchaseOrderCard key={order.code} order={order} isEnriching={Boolean(enrichingCodes[order.code])} />
                  ))}
                </div>
              ) : (
                <Card className="overflow-hidden">
                  {orders.map((order) => (
                    <PurchaseOrderCompactRow key={order.code} order={order} isEnriching={Boolean(enrichingCodes[order.code])} />
                  ))}
                </Card>
              )}
              <PaginationControls pagination={pagination} isLoading={isLoading} onPageChange={setPage} />
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">No hay ordenes para estos filtros</h2>
                <p className="mt-2 text-sm text-slate-600">Prueba otra fecha, estado o palabra clave.</p>
              </CardContent>
            </Card>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50/90 text-red-700" role="alert">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">No fue posible cargar ordenes</p>
            <p className="mt-1 text-sm leading-6">{message}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={onRetry} className="mt-3">
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-5 h-7 w-4/5" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function PaginationControls({
  pagination,
  isLoading,
  onPageChange
}: {
  pagination: PaginationState;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-600">
          Pagina {pagination.page} de {pagination.totalPages} - {pagination.pageSize} por pagina
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !pagination.hasPreviousPage}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading || !pagination.hasNextPage}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function mergePurchaseOrderData(order: PurchaseOrderListItem, enriched: PurchaseOrderListItem): PurchaseOrderListItem {
  return {
    ...order,
    statusCode: order.statusCode ?? enriched.statusCode,
    statusLabel: order.statusLabel || enriched.statusLabel,
    type: order.type ?? enriched.type,
    buyerName: order.buyerName ?? enriched.buyerName,
    supplierName: order.supplierName ?? enriched.supplierName,
    total: order.total ?? enriched.total,
    currency: order.currency ?? enriched.currency,
    sentAt: order.sentAt ?? enriched.sentAt,
    tenderCode: order.tenderCode ?? enriched.tenderCode
  };
}
