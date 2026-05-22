"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bell, BookmarkCheck, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { FilterPanel, type Filters } from "@/components/filter-panel";
import { MainNav } from "@/components/main-nav";
import { TenderCard } from "@/components/tender-card";
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
  const [favorites, setFavorites] = useState<Record<string, TenderListItem>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

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

      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible consultar licitaciones");
      }

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

  function goToPage(nextPage: number) {
    setPage(nextPage);
  }

  function toggleFavorite(tender: TenderListItem) {
    setFavorites((current) => {
      const next = { ...current };

      if (next[tender.code]) {
        delete next[tender.code];
      } else {
        next[tender.code] = tender;
      }

      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <MainNav />
            <p className="text-sm font-bold uppercase tracking-wide text-ocean">Mercado Público Chile</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
              Radar moderno para buscar y seguir licitaciones públicas
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Consulta procesos activos, filtra por organismo, monto y fecha, revisa detalles y guarda oportunidades para seguimiento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <SummaryCard label="Resultados" value={pagination.total} />
            <SummaryCard label="Favoritos" value={favoriteCount} />
          </div>
        </header>

        <FilterPanel
          filters={filters}
          isLoading={isLoading}
          onChange={setFilters}
          onRefresh={applySearch}
        />

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-600" aria-live="polite">
                {isLoading
                  ? "Consultando Mercado Público..."
                  : `${pagination.total} licitaciones encontradas - página ${pagination.page} de ${pagination.totalPages}`}
              </p>
              <button
                type="button"
                onClick={applySearch}
                disabled={isLoading}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean disabled:opacity-60"
              >
                <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
                Actualizar
              </button>
            </div>

            {error ? <ErrorBox message={error} onRetry={applySearch} /> : null}

            {isLoading ? (
              <LoadingList />
            ) : tenders.length > 0 ? (
              <>
                {tenders.map((tender) => (
                  <TenderCard
                    key={tender.code}
                    tender={tender}
                    isFavorite={Boolean(favorites[tender.code])}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
                <PaginationControls pagination={pagination} isLoading={isLoading} onPageChange={goToPage} />
              </>
            ) : (
              <EmptyState />
            )}
          </div>

          <aside className="space-y-4">
            <Panel title="Favoritos" icon={<BookmarkCheck className="h-4 w-4" />}>
              {favoriteCount > 0 ? (
                <div className="space-y-3">
                  {Object.values(favorites).slice(0, 5).map((favorite) => (
                    <a
                      key={favorite.code}
                      href={`/licitaciones/${encodeURIComponent(favorite.code)}`}
                      className="block rounded-md border border-line bg-paper p-3 hover:border-ocean"
                    >
                      <p className="text-xs font-semibold text-ocean">{favorite.code}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-bold text-ink">{favorite.name}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Marca licitaciones para mantener una lista rápida en este dispositivo.
                </p>
              )}
            </Panel>

            <Panel title="Alertas" icon={<Bell className="h-4 w-4" />}>
              <p className="text-sm leading-6 text-slate-600">
                La estructura Supabase incluida permite guardar alertas por palabra clave, estado, organismo y monto.
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean"
              >
                Crear alerta
              </button>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="text-ocean">{icon}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">No fue posible cargar licitaciones</p>
          <p className="mt-1 leading-6">{message}</p>
          <p className="mt-1 text-red-600">
            Revisa `MERCADO_PUBLICO_TICKET` y prueba `/api/health` si el problema persiste.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:border-red-400"
      >
        Reintentar
      </button>
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-line bg-white p-5">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-6 w-4/5 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <div className="h-4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <h2 className="text-lg font-bold text-ink">No hay resultados para estos filtros</h2>
      <p className="mt-2 text-sm text-slate-600">Prueba con otra palabra, estado o fecha.</p>
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
    <nav className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-slate-600">
        Mostrando página {pagination.page} de {pagination.totalPages} - {pagination.pageSize} por página
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isLoading || !pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={isLoading || !pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
