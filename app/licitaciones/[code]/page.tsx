import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ExternalLink, MapPin, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { getTenderDetail } from "@/lib/mercado-publico/client";
import { formatCurrency, formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TenderDetailPage({ params }: PageProps) {
  const { code } = await params;
  const tender = await getTenderDetail(decodeURIComponent(code));

  if (!tender) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ocean hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>

        <section className="mt-5 rounded-lg border border-line bg-white p-5 shadow-subtle sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ocean">{tender.code}</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight text-ink sm:text-4xl">
                {tender.name}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                {tender.description || "Sin descripción disponible en la respuesta de Mercado Público."}
              </p>
            </div>
            <StatusBadge status={tender.status} />
          </div>

          <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={<CalendarClock className="h-5 w-5" />} label="Cierre" value={formatDateTime(tender.closeDate)} />
            <InfoCard icon={<Wallet className="h-5 w-5" />} label="Monto estimado" value={formatCurrency(tender.amount)} />
            <InfoCard icon={<MapPin className="h-5 w-5" />} label="Región" value={tender.region || "No informada"} />
            <InfoCard label="Tipo" value={tender.type || "No informado"} />
          </dl>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section>
              <h2 className="text-base font-bold text-ink">Comprador</h2>
              <div className="mt-3 rounded-lg border border-line bg-paper p-4">
                <p className="font-semibold">{tender.buyerName || "No informado"}</p>
                <p className="mt-1 text-sm text-slate-600">Código organismo: {tender.buyerCode || "No informado"}</p>
              </div>
            </section>

            <section>
              <h2 className="text-base font-bold text-ink">Fechas relevantes</h2>
              <div className="mt-3 space-y-2 rounded-lg border border-line bg-paper p-4 text-sm">
                <Row label="Publicación" value={formatDateTime(tender.publishDate)} />
                <Row label="Inicio preguntas" value={formatDateTime(tender.questionStartDate)} />
                <Row label="Cierre preguntas" value={formatDateTime(tender.questionEndDate)} />
                <Row label="Adjudicación" value={formatDateTime(tender.awardDate)} />
              </div>
            </section>
          </div>

          {tender.items.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-base font-bold text-ink">Ítems solicitados</h2>
              <div className="mt-3 overflow-hidden rounded-lg border border-line">
                <div className="hidden grid-cols-[1fr_120px_140px] bg-paper px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid">
                  <span>Descripción</span>
                  <span>Cantidad</span>
                  <span>Unidad</span>
                </div>
                {tender.items.map((item) => (
                  <div key={item.id} className="grid gap-1 border-t border-line bg-white px-4 py-3 text-sm sm:grid-cols-[1fr_120px_140px]">
                    <span className="font-medium text-ink">{item.description}</span>
                    <span className="text-slate-600">{item.quantity ?? "No informada"}</span>
                    <span className="text-slate-600">{item.unit ?? "No informada"}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
            <a
              href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(tender.code)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ocean px-4 py-3 text-sm font-semibold text-white hover:bg-ink"
            >
              Ver en Mercado Público
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  icon,
  label,
  value
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}
