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
  onToggleFavorite: (tender: TenderListItem) => void;
};

export function TenderCard({ tender, isFavorite, onToggleFavorite }: TenderCardProps) {
  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:border-ocean/40 hover:shadow-subtle">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-slate-600">{tender.code}</span>
              <StatusBadge status={tender.status} />
            </div>
            <Link
              href={`/licitaciones/${encodeURIComponent(tender.code)}`}
              className="mt-3 block text-xl font-bold leading-snug text-ink transition group-hover:text-ocean"
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
            className={clsx(isFavorite && "border-alert bg-orange-50 text-alert")}
          >
            <Heart className={clsx("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {tender.description || "Sin descripcion disponible."}
        </p>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Meta icon={<Building2 className="h-4 w-4" />} label="Comprador" value={tender.buyerName || "Ver detalle para comprador"} />
          <Meta icon={<CalendarClock className="h-4 w-4" />} label="Cierre" value={formatShortDate(tender.closeDate)} accent />
          <Meta icon={<Wallet className="h-4 w-4" />} label="Monto" value={formatTenderAmount(tender.amount, tender.amountText)} />
          <Meta icon={<MapPin className="h-4 w-4" />} label="Region / tipo" value={tender.region || tender.type || "No informado"} />
        </div>
      </CardContent>
    </Card>
  );
}

export function TenderCompactRow({ tender, isFavorite, onToggleFavorite }: TenderCardProps) {
  return (
    <div className="grid gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0 md:grid-cols-[140px_1fr_220px_130px_44px] md:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ocean">{tender.code}</span>
        <StatusBadge status={tender.status} />
      </div>
      <Link href={`/licitaciones/${encodeURIComponent(tender.code)}`} className="font-semibold text-ink hover:text-ocean">
        {tender.name}
      </Link>
      <span className="truncate text-slate-600">{tender.buyerName || "Ver detalle para comprador"}</span>
      <span className="font-semibold text-ink">{formatShortDate(tender.closeDate)}</span>
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
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper/70 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="text-ocean">{icon}</span>
        {label}
      </div>
      <p className={clsx("mt-1 truncate font-semibold", accent ? "text-ocean" : "text-ink")}>{value}</p>
    </div>
  );
}
