"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bell, BookmarkCheck, LayoutGrid, List, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { MainNav } from "@/components/main-nav";
import { TenderCard, TenderCompactRow } from "@/components/tender-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [error, setError] = useState<string | null>(null);

  const favoriteCount = Object.keys(favorites).length;

  const fetchTenders = useCallback(async () => {
    void refreshToken;
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
      const response = await fetch(`/api/tenders?${params.toString()}`);
      const data = (await response.json()) as {
        tenders?: TenderListItem[];
        pagination?: PaginationState;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "No fue posible consultar licitaciones");
      setTenders(data.tenders ?? []);
      setPagination(data.pagination ?? initialPagination);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Error desconocido");
      setTenders([]);
      setPagination(initialPagination);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, page, pagination.pageSize, refreshToken]);

  useEffect(() => {
    void fetchTenders();
  }, [fetchTenders]);

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
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <MainNav />
            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-ocean">Mercado Publico Chile</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
              Radar profesional de licitaciones publicas
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Busca, filtra y prioriza oportunidades con cache, rate limiting y datos normalizados desde Mercado Publico.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <SummaryCard label="Resultados" value={pagination.total} />
            <SummaryCard label="Favoritos" value={favoriteCount} />
          </div>
        </header>

        <FilterPanel filters={filters} isLoading={isLoading} onChange={setFilters} onRefresh={applySearch} />

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-600" aria-live="polite">
                  {isLoading
                    ? "Consultando Mercado Publico..."
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
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="hidden grid-cols-[140px_1fr_220px_130px_44px] border-b border-line bg-paper px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
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
                      className="block rounded-lg border border-line bg-paper p-3 hover:border-ocean"
                    >
                      <p className="text-xs font-semibold text-ocean">{favorite.code}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-bold text-ink">{favorite.name}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Marca licitaciones para mantener una lista rapida en este dispositivo.
                </p>
              )}
            </SidePanel>

            <SidePanel title="Alertas" icon={<Bell className="h-4 w-4" />}>
              <p className="text-sm leading-6 text-slate-600">
                La estructura Supabase permite guardar alertas por palabra clave, estado, organismo y monto.
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </Card>
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
    <div className="inline-flex rounded-md border border-line bg-white p-1">
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
    <Card className="border-red-200 bg-red-50 text-red-700" role="alert">
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
          <Skeleton key={index} className="mb-3 h-10 last:mb-0" />
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-6 w-4/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <h2 className="text-lg font-bold text-ink">No hay resultados para estos filtros</h2>
        <p className="mt-2 text-sm text-slate-600">Prueba con otra palabra, estado o fecha.</p>
      </CardContent>
    </Card>
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
        <p className="text-sm font-semibold text-slate-600">
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
