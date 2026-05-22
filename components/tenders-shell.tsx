"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, BookmarkCheck, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { FilterPanel, type Filters } from "@/components/filter-panel";
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

export function TendersShell() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [tenders, setTenders] = useState<TenderListItem[]>([]);
  const [favorites, setFavorites] = useState<Record<string, TenderListItem>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    const stored = window.localStorage.getItem(FAVORITES_KEY);
    return stored ? (JSON.parse(stored) as Record<string, TenderListItem>) : {};
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredTenders = useMemo(() => {
    const query = normalize(filters.query);
    const buyer = normalize(filters.buyer);
    const minAmount = parseAmount(filters.minAmount);
    const maxAmount = parseAmount(filters.maxAmount);

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
      const matchesMin = minAmount === undefined || (tender.amount ?? 0) >= minAmount;
      const matchesMax = maxAmount === undefined || (tender.amount ?? 0) <= maxAmount;

      return matchesQuery && matchesBuyer && matchesMin && matchesMax;
    });
  }, [filters, tenders]);

  const favoriteCount = Object.keys(favorites).length;

  const fetchTenders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("status", filters.status);

    if (filters.date) {
      params.set("date", filters.date);
    }

    try {
      const response = await fetch(`/api/tenders?${params.toString()}`);
      const data = (await response.json()) as { tenders?: TenderListItem[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No fue posible consultar licitaciones");
      }

      setTenders(data.tenders ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Error desconocido");
      setTenders([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters.date, filters.status]);

  useEffect(() => {
    void fetchTenders();
  }, [fetchTenders]);

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
            <p className="text-sm font-bold uppercase tracking-wide text-ocean">Mercado Público Chile</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-5xl">
              Radar moderno para buscar y seguir licitaciones públicas
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Consulta procesos activos, filtra por organismo, monto y fecha, revisa detalles y guarda oportunidades para seguimiento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <SummaryCard label="Resultados" value={filteredTenders.length} />
            <SummaryCard label="Favoritos" value={favoriteCount} />
          </div>
        </header>

        <FilterPanel
          filters={filters}
          isLoading={isLoading}
          onChange={setFilters}
          onRefresh={fetchTenders}
        />

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-600" aria-live="polite">
                {isLoading ? "Consultando Mercado Público..." : `${filteredTenders.length} licitaciones encontradas`}
              </p>
              <button
                type="button"
                onClick={fetchTenders}
                disabled={isLoading}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-ocean hover:text-ocean disabled:opacity-60"
              >
                <RefreshCw className={clsx("h-4 w-4", isLoading && "animate-spin")} />
                Actualizar
              </button>
            </div>

            {error ? <ErrorBox message={error} onRetry={fetchTenders} /> : null}

            {isLoading ? (
              <LoadingList />
            ) : filteredTenders.length > 0 ? (
              filteredTenders.map((tender) => (
                <TenderCard
                  key={tender.code}
                  tender={tender}
                  isFavorite={Boolean(favorites[tender.code])}
                  onToggleFavorite={toggleFavorite}
                />
              ))
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

function normalize(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseAmount(value: string) {
  const clean = value.replace(/\D/g, "");
  if (!clean) {
    return undefined;
  }

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : undefined;
}
