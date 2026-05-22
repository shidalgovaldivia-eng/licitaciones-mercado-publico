"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { TENDER_STATUS_OPTIONS } from "@/lib/mercado-publico/status";

export type Filters = {
  query: string;
  status: string;
  date: string;
  buyer: string;
  minAmount: string;
  maxAmount: string;
};

type FilterPanelProps = {
  filters: Filters;
  isLoading: boolean;
  onChange: (filters: Filters) => void;
  onRefresh: () => void;
};

export function FilterPanel({ filters, isLoading, onChange, onRefresh }: FilterPanelProps) {
  const setValue = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-subtle">
      <div className="flex items-center gap-2 text-sm font-bold text-ink">
        <SlidersHorizontal className="h-4 w-4 text-ocean" />
        Filtros
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_180px_170px]">
        <label className="relative block">
          <span className="sr-only">Buscar por palabra o código</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.query}
            onChange={(event) => setValue("query", event.target.value)}
            placeholder="Buscar por palabra, código u organismo"
            className="h-11 w-full rounded-md border border-line bg-paper pl-10 pr-3 text-sm outline-none focus:border-ocean focus:bg-white"
          />
        </label>

        <label>
          <span className="sr-only">Estado</span>
          <select
            value={filters.status}
            onChange={(event) => setValue("status", event.target.value)}
            className="h-11 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-ocean focus:bg-white"
          >
            {TENDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Fecha</span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setValue("date", event.target.value)}
            className="h-11 w-full rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-ocean focus:bg-white"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <input
          value={filters.buyer}
          onChange={(event) => setValue("buyer", event.target.value)}
          placeholder="Organismo comprador"
          className="h-11 rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-ocean focus:bg-white"
        />
        <input
          inputMode="numeric"
          value={filters.minAmount}
          onChange={(event) => setValue("minAmount", event.target.value)}
          placeholder="Monto mínimo"
          className="h-11 rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-ocean focus:bg-white"
        />
        <div className="flex gap-3">
          <input
            inputMode="numeric"
            value={filters.maxAmount}
            onChange={(event) => setValue("maxAmount", event.target.value)}
            placeholder="Monto máximo"
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-paper px-3 text-sm outline-none focus:border-ocean focus:bg-white"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-11 rounded-md bg-ocean px-4 text-sm font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Buscar
          </button>
        </div>
      </div>
    </section>
  );
}
