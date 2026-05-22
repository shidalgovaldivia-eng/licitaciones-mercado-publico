import type React from "react";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, FileText, Package, Truck, Wallet } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP, formatDateTime } from "@/lib/format";
import { getPurchaseOrderDetail } from "@/services/ordenesCompra";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { code } = await params;
  const order = await getPurchaseOrderDetail(decodeURIComponent(code));

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <MainNav />
            <Button asChild variant="secondary">
              <Link href={"/ordenes-compra" as Route}>
                <ArrowLeft className="h-4 w-4" />
                Volver a ordenes
              </Link>
            </Button>
          </div>

          <div className="mt-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ocean shadow-sm">
                {order.code}
              </span>
              <StatusBadge status={order.statusCode} label={order.statusLabel} />
            </div>
            <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
              {order.name}
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600">
              {order.description || "Orden de compra sin descripcion adicional."}
            </p>
          </div>
        </header>

        <section className="mt-5 grid gap-5">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={<Wallet className="h-5 w-5" />} label="Total neto" value={formatCLP(order.netTotal, order.currency)} />
            <InfoCard icon={<Wallet className="h-5 w-5" />} label="IVA / impuestos" value={formatCLP(order.taxAmount, order.currency)} />
            <InfoCard icon={<Wallet className="h-5 w-5" />} label="Total final" value={formatCLP(order.grossTotal ?? order.total, order.currency)} />
            <InfoCard icon={<FileText className="h-5 w-5" />} label="Licitacion" value={order.tenderCode || "No especificada"} />
          </dl>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-ocean" />
                  Comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataRow label="Organismo" value={order.buyer.name || "No especificado"} />
                <DataRow label="Codigo organismo" value={order.buyer.code || "No especificado"} />
                <DataRow label="Unidad" value={order.buyer.unit || "No especificada"} />
                <DataRow label="Comuna" value={order.buyer.commune || "No especificada"} />
                <DataRow label="Region" value={order.buyer.region || "No especificada"} />
                <DataRow label="Contacto" value={order.buyer.contactName || "No especificado"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-5 w-5 text-ocean" />
                  Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataRow label="Proveedor" value={order.supplier.name || "No especificado"} />
                <DataRow label="Codigo" value={order.supplier.code || "No especificado"} />
                <DataRow label="RUT sucursal" value={order.supplier.rut || "No especificado"} />
                <DataRow label="Comuna" value={order.supplier.commune || "No especificada"} />
                <DataRow label="Region" value={order.supplier.region || "No especificada"} />
                <DataRow label="Estado proveedor" value={order.supplierStatus || "No especificado"} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-5 w-5 text-ocean" />
                Fechas relevantes
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DataRow label="Creacion" value={formatDateTime(order.dates.createdAt)} />
              <DataRow label="Envio" value={formatDateTime(order.dates.sentAt)} />
              <DataRow label="Aceptacion" value={formatDateTime(order.dates.acceptedAt)} />
              <DataRow label="Cancelacion" value={formatDateTime(order.dates.cancelledAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5 text-ocean" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.items.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-line/80 bg-white">
                  <div className="hidden grid-cols-[1fr_120px_140px_140px] bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:grid">
                    <span>Producto</span>
                    <span>Cantidad</span>
                    <span>Precio neto</span>
                    <span>Total</span>
                  </div>
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.productCode ?? item.product ?? "item"}-${index}`}
                      className="grid gap-2 border-t border-line/80 px-4 py-4 text-sm first:border-t-0 lg:grid-cols-[1fr_120px_140px_140px]"
                    >
                      <div>
                        <p className="font-medium leading-6 text-ink">{item.product || item.category || "Item sin nombre"}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.buyerSpecification || item.supplierSpecification}</p>
                      </div>
                      <span className="text-slate-600">{item.quantity ?? "No especificada"}</span>
                      <span className="text-slate-600">{formatCLP(item.netPrice, item.currency || order.currency)}</span>
                      <span className="font-medium text-ink">{formatCLP(item.total, item.currency || order.currency)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line bg-slate-50 p-4 text-sm text-slate-600">
                  Mercado Publico no envio items para esta orden.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm ring-1 ring-slate-950/[0.03]">
      <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {icon ? <span className="text-ocean">{icon}</span> : null}
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</dd>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/80 pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[70%] text-right font-medium leading-6 text-ink">{value}</span>
    </div>
  );
}
