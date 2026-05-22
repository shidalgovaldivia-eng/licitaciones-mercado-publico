import type React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarClock, ExternalLink, MapPin, Package, Wallet } from "lucide-react";
import { MainNav } from "@/components/main-nav";
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
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <MainNav />

        <div className="mt-6">
          <Button asChild variant="ghost" className="pl-0">
            <Link href="/licitaciones">
              <ArrowLeft className="h-4 w-4" />
              Volver al listado
            </Link>
          </Button>
        </div>

        <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white shadow-subtle">
          <div className="border-b border-line bg-paper/70 p-5 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean">{tender.code}</span>
                  <StatusBadge status={tender.status} />
                </div>
                <h1 className="mt-4 max-w-4xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
                  {tender.name}
                </h1>
                <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
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
          </div>

          <div className="grid gap-5 p-5 sm:p-8">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard icon={<CalendarClock className="h-5 w-5" />} label="Cierre" value={formatDateTime(tender.closeDate)} />
              <InfoCard
                icon={<Wallet className="h-5 w-5" />}
                label="Monto / rango"
                value={formatTenderAmount(tender.amount, tender.amountText)}
              />
              <InfoCard icon={<MapPin className="h-5 w-5" />} label="Region" value={tender.region || "No informada"} />
              <InfoCard label="Tipo" value={tender.type || "No informado"} />
            </dl>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-ocean" />
                    Comprador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DataRow label="Organismo" value={tender.buyerName || "Ver detalle para comprador"} />
                  <DataRow label="Codigo organismo" value={tender.buyerCode || "No informado"} />
                  <DataRow label="Unidad" value={tender.buyer?.unitName || "No informada"} />
                  <DataRow label="Comuna" value={tender.buyer?.commune || "No informada"} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-ocean" />
                  Items solicitados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tender.items.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-line">
                    <div className="hidden grid-cols-[1fr_120px_140px] bg-paper px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid">
                      <span>Descripcion</span>
                      <span>Cantidad</span>
                      <span>Unidad</span>
                    </div>
                    {tender.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-1 border-t border-line bg-white px-4 py-3 text-sm first:border-t-0 sm:grid-cols-[1fr_120px_140px]"
                      >
                        <span className="font-medium text-ink">{item.description}</span>
                        <span className="text-slate-600">{item.quantity ?? "No informada"}</span>
                        <span className="text-slate-600">{item.unit ?? "No informada"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-line bg-paper p-4 text-sm text-slate-600">
                    Mercado Publico no envio items para esta licitacion.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-2 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[70%] text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
