"use client";

import { Search, SlidersHorizontal } from "lucide-react";
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
    <Card className="shadow-subtle">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <SlidersHorizontal className="h-4 w-4 text-ocean" />
          Filtros
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_180px_170px]">
          <label className="relative block">
            <span className="sr-only">Buscar por palabra o codigo</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
              className="flex h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/15"
            >
              {TENDER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <Input type="date" value={filters.date} onChange={(event) => setValue("date", event.target.value)} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_160px_auto]">
          <Input
            value={filters.buyer}
            onChange={(event) => setValue("buyer", event.target.value)}
            placeholder="Organismo comprador"
          />
          <Input
            inputMode="numeric"
            value={filters.minAmount}
            onChange={(event) => setValue("minAmount", event.target.value)}
            placeholder="Monto minimo"
          />
          <Input
            inputMode="numeric"
            value={filters.maxAmount}
            onChange={(event) => setValue("maxAmount", event.target.value)}
            placeholder="Monto maximo"
          />
          <Button type="button" onClick={onRefresh} disabled={isLoading}>
            Buscar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
