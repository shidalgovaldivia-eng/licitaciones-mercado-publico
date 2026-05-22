"use client";

import Link from "next/link";
import type { Route } from "next";
import { Building2, CalendarClock, HandCoins, Truck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCLP, formatShortDate } from "@/lib/format";
import type { PurchaseOrderListItem } from "@/types/purchaseOrder";

type Props = {
  order: PurchaseOrderListItem;
};

export function PurchaseOrderCard({ order }: Props) {
  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-ocean/20 hover:bg-white hover:shadow-premium">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
            {order.code}
          </span>
          <StatusBadge status={order.statusCode} label={order.statusLabel} />
        </div>
        <Link
          href={`/ordenes-compra/${encodeURIComponent(order.code)}` as Route}
          className="mt-4 block text-xl font-semibold leading-snug tracking-[-0.01em] text-ink transition group-hover:text-ocean sm:text-2xl"
        >
          {order.name}
        </Link>

        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <Meta icon={<Building2 className="h-4 w-4" />} label="Comprador" value={order.buyerName || "Disponible en detalle"} />
          <Meta icon={<Truck className="h-4 w-4" />} label="Proveedor" value={order.supplierName || "Disponible en detalle"} />
          <Meta icon={<HandCoins className="h-4 w-4" />} label="Total" value={formatCLP(order.total, order.currency)} />
          <Meta icon={<CalendarClock className="h-4 w-4" />} label="Envio" value={formatShortDate(order.sentAt)} accent />
        </div>
      </CardContent>
    </Card>
  );
}

export function PurchaseOrderCompactRow({ order }: Props) {
  return (
    <div className="grid gap-3 border-b border-line/80 px-4 py-4 text-sm transition hover:bg-white/70 last:border-b-0 md:grid-cols-[160px_1fr_220px_145px] md:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-ocean">{order.code}</span>
        <StatusBadge status={order.statusCode} label={order.statusLabel} />
      </div>
      <Link href={`/ordenes-compra/${encodeURIComponent(order.code)}` as Route} className="font-semibold leading-6 text-ink transition hover:text-ocean">
        {order.name}
      </Link>
      <span className="truncate text-slate-600">{order.supplierName || order.buyerName || "Disponible en detalle"}</span>
      <span className="font-medium text-ink">{formatCLP(order.total, order.currency)}</span>
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
    <div className="rounded-xl border border-line/80 bg-slate-50/70 p-3.5 transition group-hover:border-ocean/15 group-hover:bg-white">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span className="text-ocean">{icon}</span>
        {label}
      </div>
      <p className={accent ? "mt-1.5 truncate font-semibold text-ocean" : "mt-1.5 truncate font-semibold text-ink"}>{value}</p>
    </div>
  );
}
