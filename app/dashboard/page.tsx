import type React from "react";
import { AlertTriangle, BarChart3, CalendarClock, Database, FileText, TrendingUp } from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSummary, type SummaryBucket } from "@/services/dashboardSummary";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-premium ring-1 ring-slate-950/[0.03] backdrop-blur-xl sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <MainNav />
            <Card className="w-full lg:w-auto">
              <CardContent className="flex items-center justify-between gap-8 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fuente</p>
                  <p className="mt-1 text-sm font-semibold text-ink">Supabase normalizado</p>
                </div>
                <p className="text-right text-xs leading-5 text-slate-500">{formatDateTime(summary.generatedAt)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_460px] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ocean">Analisis operativo</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-ink sm:text-6xl">
                Inteligencia de licitaciones activas
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Vista ejecutiva para entender volumen, cierres, compradores recurrentes y patrones de demanda en Mercado Publico.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MiniMetric label="Activas" value={summary.totalActiveTenders} />
              <MiniMetric label="Cierran en 48h" value={summary.closingNext48Hours} />
              <MiniMetric label="Enriquecidas" value={`${summary.normalization.tenders.enrichedPercent}%`} />
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<FileText className="h-5 w-5" />}
            label="Activas"
            value={summary.totalActiveTenders}
            helper="Procesos publicados o activos"
          />
          <MetricCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Cierre proximo"
            value={summary.closingNext48Hours}
            helper="Oportunidades con cierre en 48 horas"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Organismos"
            value={summary.topBuyers.length}
            helper="Compradores frecuentes detectados"
          />
          <MetricCard
            icon={<Database className="h-5 w-5" />}
            label="Datos"
            value="Normalizado"
            helper="Dashboard alimentado solo por datos enriquecidos"
          />
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <MetricCard
            icon={<Database className="h-5 w-5" />}
            label="Licitaciones enriquecidas"
            value={summary.normalization.tenders.enriched}
            helper={`Datos enriquecidos: ${summary.normalization.tenders.enriched} de ${summary.normalization.tenders.total}. Pendientes: ${summary.normalization.tenders.pending}`}
          />
          <MetricCard
            icon={<Database className="h-5 w-5" />}
            label="Ordenes enriquecidas"
            value={summary.normalization.purchaseOrders.enriched}
            helper={`Datos enriquecidos: ${summary.normalization.purchaseOrders.enriched} de ${summary.normalization.purchaseOrders.total}. Pendientes: ${summary.normalization.purchaseOrders.pending}`}
          />
        </section>

        {summary.totalActiveTenders === 0 ? (
          <Card className="mt-5 border-amber-200 bg-amber-50/90 text-amber-800">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">No hay licitaciones activas disponibles para analizar.</p>
                <p className="mt-1">Ejecuta POST /api/admin/enrich-tenders para poblar la tabla normalizada.</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <SummaryTable title="Organismos compradores mas frecuentes" rows={summary.topBuyers} />
          <SummaryTable title="Estados mas frecuentes" rows={summary.topStatuses} />
          <SummaryTable title="Palabras mas repetidas" rows={summary.topWords} />
          <SummaryTable title="Licitaciones por fecha de cierre" rows={summary.closingByDate} />
        </section>
      </div>
    </main>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-white/75 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-premium">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <span className="rounded-xl border border-line bg-slate-50 p-2 text-ocean">{icon}</span>
        </div>
        <p className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-ink">{value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
      </CardContent>
    </Card>
  );
}

function SummaryTable({ title, rows }: { title: string; rows: SummaryBucket[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-ocean" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rows.length > 0 ? (
            rows.map((row) => (
              <div key={row.label} className="grid gap-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate font-medium text-ink">{row.label}</span>
                  <span className="shrink-0 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {row.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-ocean" style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-slate-50 p-4 text-sm text-slate-600">
              Sin datos suficientes.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
