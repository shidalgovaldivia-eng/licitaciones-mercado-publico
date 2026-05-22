"use client";

import type React from "react";
import Link from "next/link";
import { Building2, CalendarClock, Heart, MapPin, Wallet } from "lucide-react";
import { clsx } from "clsx";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatShortDate, formatTenderAmount } from "@/lib/format";
import type { TenderListItem } from "@/lib/mercado-publico/types";

type TenderCardProps = {
  tender: TenderListItem;
  isFavorite: boolean;
  isEnriching?: boolean;
  onToggleFavorite: (tender: TenderListItem) => void;
};

export function TenderCard({ tender, isFavorite, isEnriching = false, onToggleFavorite }: TenderCardProps) {
  const buyerValue = tender.buyerName ?? (isEnriching ? "Cargando comprador..." : "No especificado");
  const amountValue =
    tender.amountText || tender.amount !== undefined
      ? formatTenderAmount(tender.amount, tender.amountText)
      : isEnriching
        ? "Cargando monto..."
        : "Monto no especificado";
  const regionValue = tender.region || tender.type || (isEnriching ? "Cargando region..." : "No especificado");

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-ocean/20 hover:bg-white hover:shadow-premium">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                {tender.code}
              </span>
              <StatusBadge status={tender.status} />
            </div>
            <Link
              href={`/licitaciones/${encodeURIComponent(tender.code)}`}
              className="mt-4 block text-xl font-semibold leading-snug tracking-[-0.01em] text-ink transition group-hover:text-ocean sm:text-2xl"
            >
              {tender.name}
            </Link>
          </div>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            onClick={() => onToggleFavorite(tender)}
            className={clsx("shrink-0 rounded-xl", isFavorite && "border-alert/30 bg-orange-50 text-alert")}
          >
            <Heart className={clsx("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
        </div>

        <p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-slate-600">
          {tender.description || "Sin descripcion disponible."}
        </p>

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <Meta icon={<Building2 className="h-4 w-4" />} label="Comprador" value={buyerValue} loading={isEnriching && !tender.buyerName} />
          <Meta icon={<CalendarClock className="h-4 w-4" />} label="Cierre" value={formatShortDate(tender.closeDate)} accent />
          <Meta icon={<Wallet className="h-4 w-4" />} label="Monto" value={amountValue} loading={isEnriching && !tender.amountText && tender.amount === undefined} />
          <Meta icon={<MapPin className="h-4 w-4" />} label="Region / tipo" value={regionValue} loading={isEnriching && !tender.region && !tender.type} />
        </div>
      </CardContent>
    </Card>
  );
}

export function TenderCompactRow({ tender, isFavorite, isEnriching = false, onToggleFavorite }: TenderCardProps) {
  const buyerValue = tender.buyerName ?? (isEnriching ? "Cargando comprador..." : "No especificado");

  return (
    <div className="grid gap-3 border-b border-line/80 px-4 py-4 text-sm transition hover:bg-white/70 last:border-b-0 md:grid-cols-[150px_1fr_240px_135px_44px] md:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ocean">{tender.code}</span>
        <StatusBadge status={tender.status} />
      </div>
      <Link
        href={`/licitaciones/${encodeURIComponent(tender.code)}`}
        className="font-semibold leading-6 text-ink transition hover:text-ocean"
      >
        {tender.name}
      </Link>
      <span className={clsx("truncate text-slate-600", isEnriching && !tender.buyerName && "animate-pulse")}>{buyerValue}</span>
      <span className="font-medium text-ink">{formatShortDate(tender.closeDate)}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        onClick={() => onToggleFavorite(tender)}
      >
        <Heart className={clsx("h-4 w-4", isFavorite && "fill-current text-alert")} />
      </Button>
    </div>
  );
}

function Meta({
  icon,
  label,
  value,
  accent,
  loading
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line/80 bg-slate-50/70 p-3.5 transition group-hover:border-ocean/15 group-hover:bg-white">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span className="text-ocean">{icon}</span>
        {label}
      </div>
      <p className={clsx("mt-1.5 truncate font-semibold", accent ? "text-ocean" : "text-ink", loading && "animate-pulse text-slate-500")}>{value}</p>
    </div>
  );
}
