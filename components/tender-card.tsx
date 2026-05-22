"use client";

import Link from "next/link";
import { Bell, Building2, CalendarClock, Heart, Wallet } from "lucide-react";
import { clsx } from "clsx";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { TenderListItem } from "@/lib/mercado-publico/types";

type TenderCardProps = {
  tender: TenderListItem;
  isFavorite: boolean;
  onToggleFavorite: (tender: TenderListItem) => void;
};

export function TenderCard({ tender, isFavorite, onToggleFavorite }: TenderCardProps) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm transition hover:border-ocean/40 hover:shadow-subtle sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={tender.status} />
            <span className="text-xs font-semibold text-slate-500">{tender.code}</span>
          </div>
          <Link
            href={`/licitaciones/${encodeURIComponent(tender.code)}`}
            className="mt-3 block text-lg font-bold leading-snug text-ink hover:text-ocean"
          >
            {tender.name}
          </Link>
        </div>
        <button
          type="button"
          aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          onClick={() => onToggleFavorite(tender)}
          className={clsx(
            "grid h-10 w-10 shrink-0 place-items-center rounded-md border transition",
            isFavorite
              ? "border-alert bg-orange-50 text-alert"
              : "border-line bg-white text-slate-500 hover:border-ocean hover:text-ocean"
          )}
        >
          <Heart className={clsx("h-5 w-5", isFavorite && "fill-current")} />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
        {tender.description || "Sin descripción disponible."}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <Meta icon={<Building2 className="h-4 w-4" />} text={tender.buyerName || "Organismo no informado"} />
        <Meta icon={<CalendarClock className="h-4 w-4" />} text={`Cierre: ${formatShortDate(tender.closeDate)}`} />
        <Meta icon={<Wallet className="h-4 w-4" />} text={formatCurrency(tender.amount)} />
        <Meta icon={<Bell className="h-4 w-4" />} text={tender.type || "Tipo no informado"} />
      </div>
    </article>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-ocean">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}
