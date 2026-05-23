"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Bell, BookmarkCheck, DatabaseZap, LayoutGrid, List, RefreshCw, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { MainNav } from "@/components/main-nav";
import { TenderCard, TenderCompactRow } from "@/components/tender-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isTenderIncomplete } from "@/lib/mercado-publico/completeness";
import type { TenderListItem } from "@/lib/mercado-publico/types";

const FAVORITES_KEY = "radar-licitaciones:favorites";

const initialFilters: Filters = {
  query: "",
  status: "activas",
  date: "",
  buyer: "",
  minAmount: "",
  maxAmount: ""
};

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

export function TendersShell() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [favorites, setFavorites] = useState<Record<string, TenderListItem>>(() => {
    if (typeof window === "undefined") return {};
    const stored = window.localStorage.getItem(FAVORITES_KEY);
    return stored ? (JSON.parse(stored) as Record<string, TenderListItem>) : {};
  });
  const [isLoading, setIsLoading] = useState(true);
  const [enrichingCodes, setEnrichingCodes] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const attemptedEnrichmentRef = useRef<Set<string>>(new Set());
  const fetchAbortRef = useRef<AbortController | null>(null);
  const enrichAbortRef = useRef<AbortController | null>(null);

  const favoriteCount = Object.keys(favorites).length;

  const fetchTenders = useCallback(async () => {
    void refreshToken;
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("status", appliedFilters.status);
    params.set("page", String(page));
    params.set("pageSize", String(pagination.pageSize));
    if (appliedFilters.date) params.set("date", appliedFilters.date);
    if (appliedFilters.query) params.set("query", appliedFilters.query);
    if (appliedFilters.buyer) params.set("buyer", appliedFilters.buyer);
    if (appliedFilters.minAmount) params.set("minAmount", appliedFilters.minAmount);
    if (appliedFilters.maxAmount) params.set("maxAmount", appliedFilters.maxAmount);

    try {
      const response = await fetch(`/api/tenders?${params.toString()}`, {
        signal: controller.signal
      });
      const data = (await response.json()) as {
        tenders?: TenderListItem[];
        pagination?: PaginationState;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "No fue posible consultar licitaciones");
      setTenders(data.tenders ?? []);
      setPagination(data.pagination ?? initialPagination);
      setEnrichingCodes({});
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        return;
      }
      setError(fetchError instanceof Error ? fetchError.message : "Error desconocido");
      setTenders([]);
      setPagination(initialPagination);
    } finally {
      if (fetchAbortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [appliedFilters, page, pagination.pageSize, refreshToken]);

  useEffect(() => {
    void fetchTenders();
  }, [fetchTenders]);

  useEffect(() => {
    if (JSON.stringify(filters) === JSON.stringify(appliedFilters)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAppliedFilters(filters);
      setPage(1);
    }, 550);

    return () => window.clearTimeout(timeout);
  }, [appliedFilters, filters]);

  useEffect(() => {
    if (isLoading || tenders.length === 0) {
      return;
    }

    const codes = tenders
      .filter(isTenderIncomplete)
      .map((tender) => tender.code)
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

    async function enrichVisibleTenders() {
      try {
        const response = await fetch("/api/tenders/enrich", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ codes }),
          signal: controller.signal
        });
        const data = (await response.json()) as {
          tenders?: TenderListItem[];
          failed?: Array<{ code: string; error: string }>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No fue posible enriquecer licitaciones");
        }

        if (cancelled || !data.tenders?.length) {
          return;
        }

        const enrichedByCode = new Map(data.tenders.map((tender) => [tender.code, tender]));
        setTenders((current) =>
          current.map((tender) => {
            const enriched = enrichedByCode.get(tender.code);
            return enriched ? mergeTenderData(tender, enriched) : tender;
          })
        );
      } catch (enrichError) {
        if (enrichError instanceof DOMException && enrichError.name === "AbortError") {
          return;
        }
        console.info("[tenders:enrichment]", enrichError instanceof Error ? enrichError.message : "Unknown error");
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

    void enrichVisibleTenders();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isLoading, tenders]);

  function applySearch() {
    setAppliedFilters(filters);
    setPage(1);
    setRefreshToken((current) => current + 1);
  }

  function toggleFavorite(tender: TenderListItem) {
    setFavorites((current) => {
      const next = { ...current };
      if (next[tender.code]) delete next[tender.code];
      else next[tender.code] = tender;
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="relative z-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <MainNav />
              <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-ocean" />
                  Ticket server-side
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 shadow-sm">
                  <DatabaseZap className="h-3.5 w-3.5 text-ocean" />
                  Cache Supabase
                </span>
              </div>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_430px] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">Mercado Publico Chile</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                  Radar moderno para licitaciones publicas
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Busca oportunidades, compara compradores y prioriza procesos activos con datos normalizados, cache y control de cuota.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <HeroMetric label="Resultados activos" value={pagination.total} />
                <HeroMetric label="Pagina actual" value={`${pagination.page}/${pagination.totalPages}`} />
                <HeroMetric label="Favoritos locales" value={favoriteCount} />
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5">
          <FilterPanel filters={filters} isLoading={isLoading} onChange={setFilters} onRefresh={applySearch} />
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_330px]">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-slate-600" aria-live="polite">
                  {isLoading
                    ? "Sincronizando datos de Mercado Publico..."
                    : `${pagination.total} licitaciones encontradas - pagina ${pagination.page} de ${pagination.totalPages}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ViewToggle viewMode={viewMode} onChange={setViewMode} />
                  <Button type="button" variant="secondary" onClick={applySearch} disabled={isLoading}>
                    <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
                    Actualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error ? <ErrorBox message={error} onRetry={applySearch} /> : null}

            {isLoading ? (
              <LoadingList viewMode={viewMode} />
            ) : tenders.length > 0 ? (
              <>
                {viewMode === "cards" ? (
                  <div className="space-y-4">
                    {tenders.map((tender) => (
                      <TenderCard
                        key={tender.code}
                        tender={tender}
                        isFavorite={Boolean(favorites[tender.code])}
                        isEnriching={Boolean(enrichingCodes[tender.code])}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="hidden grid-cols-[150px_1fr_240px_135px_44px] border-b border-line/80 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:grid">
                      <span>Codigo</span>
                      <span>Licitacion</span>
                      <span>Comprador</span>
                      <span>Cierre</span>
                      <span />
                    </div>
                    {tenders.map((tender) => (
                      <TenderCompactRow
                        key={tender.code}
                        tender={tender}
                        isFavorite={Boolean(favorites[tender.code])}
                        isEnriching={Boolean(enrichingCodes[tender.code])}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </Card>
                )}
                <PaginationControls pagination={pagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState />
            )}
          </div>

          <aside className="space-y-4">
            <SidePanel title="Favoritos" icon={<BookmarkCheck className="h-4 w-4" />}>
              {favoriteCount > 0 ? (
                <div className="space-y-3">
                  {Object.values(favorites).slice(0, 5).map((favorite) => (
                    <a
                      key={favorite.code}
                      href={`/licitaciones/${encodeURIComponent(favorite.code)}`}
                      className="block rounded-xl border border-line/80 bg-slate-50/70 p-3 transition hover:border-ocean/30 hover:bg-white"
                    >
                      <p className="text-xs font-semibold text-ocean">{favorite.code}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{favorite.name}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Marca procesos relevantes para armar una vista corta en este dispositivo.
                </p>
              )}
            </SidePanel>

            <SidePanel title="Alertas" icon={<Bell className="h-4 w-4" />}>
              <p className="text-sm leading-6 text-slate-600">
                La base ya soporta alertas por palabra clave, estado, organismo y monto.
              </p>
              <Button type="button" variant="secondary" className="mt-4 w-full">
                Crear alerta
              </Button>
            </SidePanel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function mergeTenderData(tender: TenderListItem, enriched: TenderListItem): TenderListItem {
  return {
    ...tender,
    buyer: tender.buyer?.name ? tender.buyer : enriched.buyer,
    buyerName: tender.buyerName ?? enriched.buyerName,
    buyerCode: tender.buyerCode ?? enriched.buyerCode,
    category: tender.category ?? enriched.category,
    categoryCode: tender.categoryCode ?? enriched.categoryCode,
    region: tender.region ?? enriched.region,
    type: tender.type ?? enriched.type,
    amount: tender.amount ?? enriched.amount,
    amountText: tender.amountText ?? enriched.amountText,
    publishDate: tender.publishDate ?? enriched.publishDate,
    closeDate: tender.closeDate ?? enriched.closeDate
  };
}

function HeroMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-white/75 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{value}</p>
    </div>
  );
}

function SidePanel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="text-ocean">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ViewToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-white/80 p-1 shadow-sm">
      <Button type="button" size="sm" variant={viewMode === "cards" ? "default" : "ghost"} onClick={() => onChange("cards")}>
        <LayoutGrid className="h-4 w-4" />
        Tarjetas
      </Button>
      <Button type="button" size="sm" variant={viewMode === "compact" ? "default" : "ghost"} onClick={() => onChange("compact")}>
        <List className="h-4 w-4" />
        Compacto
      </Button>
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50/90 text-red-700" role="alert">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">No fue posible cargar licitaciones</p>
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

function LoadingList({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "compact") {
    return (
      <Card className="space-y-0 p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="mb-3 h-12 last:mb-0" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-5 h-7 w-4/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
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

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-ocean">
          <SearchIcon />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-ink">No hay resultados para estos filtros</h2>
        <p className="mt-2 text-sm text-slate-600">Prueba con otra palabra, estado o fecha.</p>
      </CardContent>
    </Card>
  );
}

function SearchIcon() {
  return <LayoutGrid className="h-5 w-5" />;
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
          Mostrando pagina {pagination.page} de {pagination.totalPages} - {pagination.pageSize} por pagina
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
