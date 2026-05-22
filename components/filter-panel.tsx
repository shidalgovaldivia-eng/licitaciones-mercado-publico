"use client";

import { CalendarDays, DollarSign, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <SlidersHorizontal className="h-4 w-4 text-ocean" />
              Filtros inteligentes
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.35fr_220px_180px]">
              <label className="relative block">
                <span className="sr-only">Buscar por palabra o codigo</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={filters.query}
                  onChange={(event) => setValue("query", event.target.value)}
                  placeholder="Buscar por palabra, codigo u organismo"
                  className="pl-10"
                />
              </label>

              <label>
                <span className="sr-only">Estado</span>
                <select
                  value={filters.status}
                  onChange={(event) => setValue("status", event.target.value)}
                  className="flex h-11 w-full rounded-xl border border-line bg-white/90 px-3.5 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-ocean/50 focus:bg-white focus:ring-4 focus:ring-ocean/10"
                >
                  {TENDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="relative block">
                <span className="sr-only">Fecha</span>
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(event) => setValue("date", event.target.value)}
                  className="pl-10"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px_auto] xl:w-[620px]">
            <Input
              value={filters.buyer}
              onChange={(event) => setValue("buyer", event.target.value)}
              placeholder="Organismo comprador"
            />
            <label className="relative block">
              <span className="sr-only">Monto minimo</span>
              <DollarSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                inputMode="numeric"
                value={filters.minAmount}
                onChange={(event) => setValue("minAmount", event.target.value)}
                placeholder="Minimo"
                className="pl-10"
              />
            </label>
            <Input
              inputMode="numeric"
              value={filters.maxAmount}
              onChange={(event) => setValue("maxAmount", event.target.value)}
              placeholder="Maximo"
            />
            <Button type="button" onClick={onRefresh} disabled={isLoading} className="h-11 px-5">
              Buscar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
