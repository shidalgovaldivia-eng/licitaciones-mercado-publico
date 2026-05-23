import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, ExternalLink, MapPin, Package, Wallet } from "lucide-react";
import { ProductSidebar } from "@/components/product-sidebar";
import { ProductTopbar } from "@/components/product-topbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatTenderAmount } from "@/lib/format";
import { getTenderDetail } from "@/lib/mercado-publico/client";
import { buildMercadoPublicoUrl } from "@/lib/mercado-publico/url";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TenderDetailPage({ params }: PageProps) {
  const { code } = await params;
  const tender = await getTenderDetail(decodeURIComponent(code));

  if (!tender) {
    notFound();
  }

  const mercadoPublicoUrl = buildMercadoPublicoUrl(tender.code);

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-3 py-3 sm:px-4 lg:px-6">
      <div className="mx-auto grid max-w-[1540px] gap-4 lg:grid-cols-[260px_1fr]">
        <ProductSidebar />

        <div className="min-w-0 space-y-4">
          <ProductTopbar placeholder="Buscar otra licitación, comprador o categoría..." />

          <header className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <Button asChild variant="secondary">
              <Link href="/licitaciones">
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ocean shadow-sm">
                  {tender.code}
                </span>
                <StatusBadge status={tender.status} />
              </div>
              <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-5xl">
                {tender.name}
              </h1>
              <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600">
                {tender.description || "Sin descripcion disponible en la respuesta de Mercado Publico."}
              </p>
            </div>

            {mercadoPublicoUrl ? (
              <Button asChild>
                <a href={mercadoPublicoUrl} target="_blank" rel="noreferrer">
                  Buscar en Mercado Publico
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : null}
          </div>
        </header>

        <section className="grid gap-5">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={<CalendarClock className="h-5 w-5" />} label="Cierre" value={formatDateTime(tender.closeDate)} />
            <InfoCard
              icon={<Wallet className="h-5 w-5" />}
              label="Monto / rango"
              value={formatTenderAmount(tender.amount, tender.amountText)}
            />
            <InfoCard icon={<MapPin className="h-5 w-5" />} label="Region" value={tender.region || "No especificada"} />
            <InfoCard label="Tipo" value={tender.type || "No especificado"} />
          </dl>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-ocean" />
                  Comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataRow label="Organismo" value={tender.buyerName || "No especificado"} />
                <DataRow label="Codigo organismo" value={tender.buyerCode || "No especificado"} />
                <DataRow label="Unidad" value={tender.buyer?.unitName || "No especificada"} />
                <DataRow label="Comuna" value={tender.buyer?.commune || "No especificada"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="h-5 w-5 text-ocean" />
                  Fechas relevantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataRow label="Publicacion" value={formatDateTime(tender.publishDate)} />
                <DataRow label="Inicio preguntas" value={formatDateTime(tender.questionStartDate)} />
                <DataRow label="Cierre preguntas" value={formatDateTime(tender.questionEndDate)} />
                <DataRow label="Adjudicacion" value={formatDateTime(tender.awardDate)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5 text-ocean" />
                Items solicitados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tender.items.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-line/80 bg-white">
                  <div className="hidden grid-cols-[1fr_120px_140px] bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:grid">
                    <span>Descripcion</span>
                    <span>Cantidad</span>
                    <span>Unidad</span>
                  </div>
                  {tender.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-1 border-t border-line/80 px-4 py-4 text-sm first:border-t-0 sm:grid-cols-[1fr_120px_140px]"
                    >
                      <span className="font-medium leading-6 text-ink">{item.description}</span>
                      <span className="text-slate-600">{item.quantity ?? "No especificada"}</span>
                      <span className="text-slate-600">{item.unit ?? "No especificada"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line bg-slate-50 p-4 text-sm text-slate-600">
                  Mercado Publico no envio items para esta licitacion.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
        </div>
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
