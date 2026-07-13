"use client";

import { AlertCircle, Target, TrendingUp, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/hooks/use-analytics";
import { EResult } from "@/models";
import { conversionRateFor, formatPercent, toCvRoiBars, toFunnelBars, toSourceSlices } from "./analytics.metrics";

const SOURCE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function AnalyticsView() {
  const { data, isPending, isError } = useAnalytics();

  if (isPending) {
    return <StateMessage>Cargando analítica…</StateMessage>;
  }

  if (isError || !data) {
    return <StateMessage>No se pudo cargar la analítica. Intenta nuevamente.</StateMessage>;
  }

  if (data.type === EResult.ERROR) {
    return <StateMessage>{data.value.getUserMessage()}</StateMessage>;
  }

  const overview = data.value;
  const funnelBars = toFunnelBars(overview.conversion);
  const sourceSlices = toSourceSlices(overview.sources);
  const cvRoiBars = toCvRoiBars(overview.roi);
  const conversionRate = conversionRateFor(overview.conversion, "Oferta");
  const technicalRate = conversionRateFor(overview.conversion, "Entrevista Técnica");
  const totalApplications = funnelBars.find((bar) => bar.stage === "Enviado")?.count ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analítica</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Métricas de rendimiento de tu pipeline de búsqueda</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={<Target className="h-4 w-4" />} label="Tasa de Conversión" value={formatPercent(conversionRate)} sub="aplicaciones → oferta" colorClassName="text-chart-4" />
        <KpiCard icon={<Zap className="h-4 w-4" />} label="Llegan a Técnica" value={formatPercent(technicalRate)} sub="aplicaciones → entrevista" colorClassName="text-chart-3" />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="ROI Global" value={formatPercent(overview.stats.roiGlobal)} sub="entrevistas / aplicaciones" colorClassName="text-chart-1" />
        <KpiCard icon={<AlertCircle className="h-4 w-4" />} label="Gaps de Habilidades" value={overview.stats.gapHabilidades.length} sub="tecnologías a reforzar" colorClassName="text-chart-5" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Métrica de Conversión del Pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">Porcentaje de éxito por etapa</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelBars.map((bar) => (
                <div key={bar.stage}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{bar.stage}</span>
                    <span className="font-mono text-xs text-foreground">
                      {bar.count} <span className="text-muted-foreground/60">({bar.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-chart-1 transition-all" style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground/60">Basado en {totalApplications} aplicaciones totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fuente de Aplicaciones</CardTitle>
            <p className="text-xs text-muted-foreground">De dónde vienen tus aplicaciones</p>
          </CardHeader>
          <CardContent>
            {sourceSlices.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin datos de fuentes todavía.</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={130}>
                  <PieChart>
                    <Pie data={sourceSlices} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                      {sourceSlices.map((slice, index) => (
                        <Cell key={slice.name} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) {
                          return null;
                        }

                        return (
                          <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                            <p className="font-semibold text-foreground">{payload[0]?.name}</p>
                            <p className="text-muted-foreground">{payload[0]?.value} aplicaciones</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sourceSlices.map((slice, index) => (
                    <div key={slice.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />
                        <span className="text-muted-foreground">{slice.name}</span>
                      </div>
                      <span className="font-mono text-foreground">{slice.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Heatmap de Tecnologías</CardTitle>
          <p className="text-xs text-muted-foreground">Tecnologías en vacantes donde avanzaste vs. fuiste rechazado</p>
        </CardHeader>
        <CardContent>
          {overview.heatmap.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin datos de tecnologías todavía.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overview.heatmap} barGap={4} barSize={16}>
                  <XAxis dataKey="technology" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="advances" name="Avanzó" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="rejections" name="Rechazado" fill="var(--chart-5)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-chart-2" />
                  Avanzó en el proceso
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded bg-chart-5" />
                  Fue rechazado
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ROI por Versión de CV</CardTitle>
          <p className="text-xs text-muted-foreground">Índice de éxito: entrevistas obtenidas / aplicaciones totales</p>
        </CardHeader>
        <CardContent>
          {cvRoiBars.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aún no tienes versiones de CV con aplicaciones.</p>
          ) : (
            <div className="space-y-3">
              {cvRoiBars.map((bar) => (
                <div key={bar.cvVersionId}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-foreground">{bar.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {bar.interviews}/{bar.applications} entrevistas
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-chart-1">{bar.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-chart-1 transition-all" style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-border/50 pt-4">
            <h3 className="mb-3 text-xs font-semibold text-foreground">Análisis de Gap de Habilidades</h3>
            {overview.gaps.length === 0 ? (
              <p className="text-xs text-muted-foreground">No se detectaron gaps críticos de habilidades.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {overview.gaps.map((gap) => (
                  <div key={gap.skill} className="flex items-center justify-between rounded-md border border-chart-5/20 bg-chart-5/5 px-3 py-2">
                    <span className="font-mono text-xs text-foreground">{gap.skill}</span>
                    <span className="text-[11px] text-chart-5">{gap.missingCount}x rechazo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StateMessage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  colorClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub: string;
  colorClassName: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className={colorClassName}>{icon}</span>
        </div>
        <p className={`text-xl font-bold leading-tight ${colorClassName}`}>{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
