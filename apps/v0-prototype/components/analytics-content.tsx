"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { APPLICATIONS, CV_VERSIONS, PIPELINE_STAGES, ApplicationStatus } from "@/lib/data";
import { TrendingUp, Target, Zap, AlertCircle } from "lucide-react";

/* ── Derived data ── */
const total = APPLICATIONS.length;
const byStatus = PIPELINE_STAGES.reduce<Record<string, number>>((acc, s) => {
  acc[s] = APPLICATIONS.filter((a) => a.status === s).length;
  return acc;
}, {});

// Tech heatmap: count appearances in rejected vs advanced
const techRejected: Record<string, number> = {};
const techAdvanced: Record<string, number> = {};

APPLICATIONS.forEach((app) => {
  app.techStack.forEach((tech) => {
    if (app.status === "Rechazado") {
      techRejected[tech] = (techRejected[tech] || 0) + 1;
    } else if (["Entrevista Técnica", "RRHH", "Oferta"].includes(app.status)) {
      techAdvanced[tech] = (techAdvanced[tech] || 0) + 1;
    }
  });
});

const allTechs = Array.from(new Set([...Object.keys(techRejected), ...Object.keys(techAdvanced)]));
const techHeatmap = allTechs
  .map((tech) => ({
    tech,
    rechazado: techRejected[tech] || 0,
    avanzado: techAdvanced[tech] || 0,
    score: (techAdvanced[tech] || 0) - (techRejected[tech] || 0),
  }))
  .sort((a, b) => b.rechazado - a.rechazado)
  .slice(0, 10);

// CV ROI
const cvRoi = CV_VERSIONS.map((cv) => ({
  name: cv.name.split(" — ")[0],
  fullName: cv.name,
  rate: cv.applications > 0 ? Math.round((cv.interviews / cv.applications) * 100) : 0,
  apps: cv.applications,
  interviews: cv.interviews,
}));

// Funnel data
const funnelData = [
  { name: "Enviado", value: APPLICATIONS.length, fill: "#60a5fa" },
  { name: "RRHH", value: byStatus["RRHH"] + byStatus["Entrevista Técnica"] + byStatus["Oferta"], fill: "#34d399" },
  { name: "Entrevista Técnica", value: byStatus["Entrevista Técnica"] + byStatus["Oferta"], fill: "#fbbf24" },
  { name: "Oferta", value: byStatus["Oferta"], fill: "#4ade80" },
];

// Source distribution
const sourceCount: Record<string, number> = {};
APPLICATIONS.forEach((a) => {
  const s = a.source || "Otro";
  sourceCount[s] = (sourceCount[s] || 0) + 1;
});
const sourceData = Object.entries(sourceCount).map(([name, value]) => ({ name, value }));
const SLICE_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function AnalyticsContent() {
  const conversionRate = Math.round((byStatus["Oferta"] / total) * 100);
  const techInterviewRate = Math.round(
    ((byStatus["Entrevista Técnica"] + byStatus["Oferta"]) / total) * 100
  );
  const bestCv = [...cvRoi].sort((a, b) => b.rate - a.rate)[0];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analítica</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Métricas de rendimiento de tu pipeline de búsqueda
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Target className="w-4 h-4" />}
          label="Tasa de Conversión"
          value={`${conversionRate}%`}
          sub="aplicaciones → oferta"
          color="text-emerald-400"
        />
        <KpiCard
          icon={<Zap className="w-4 h-4" />}
          label="Llegan a Técnica"
          value={`${techInterviewRate}%`}
          sub="aplicaciones → entrevista"
          color="text-amber-400"
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Mejor CV"
          value={bestCv?.name ?? "—"}
          sub={`${bestCv?.rate ?? 0}% entrevistas/apps`}
          color="text-blue-400"
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Rechazos"
          value={byStatus["Rechazado"]}
          sub={`${Math.round((byStatus["Rechazado"] / total) * 100)}% del total`}
          color="text-red-400"
        />
      </div>

      {/* Row 1: Funnel + Source pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Métrica de Conversión del Pipeline</h2>
          <p className="text-xs text-muted-foreground mb-4">Porcentaje de éxito por etapa</p>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const pct = Math.round((stage.value / total) * 100);
              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{stage.name}</span>
                    <span className="text-xs font-mono text-foreground">
                      {stage.value} <span className="text-muted-foreground/60">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: stage.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-4">
            Basado en {total} aplicaciones totales
          </p>
        </div>

        {/* Source distribution */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-1">Fuente de Aplicaciones</h2>
          <p className="text-xs text-muted-foreground mb-4">De dónde vienen tus aplicaciones</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={130}>
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border rounded-md px-3 py-2 text-xs shadow-lg">
                        <p className="text-foreground font-semibold">{payload[0].name}</p>
                        <p className="text-muted-foreground">{payload[0].value} aplicaciones</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {sourceData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-mono text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Heatmap */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Heatmap de Tecnologías</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Tecnologías en vacantes donde avanzaste vs. fuiste rechazado
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={techHeatmap} barGap={4} barSize={16}>
            <XAxis
              dataKey="tech"
              tick={{ fontSize: 11, fill: "oklch(0.55 0 0)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "oklch(0.18 0 0)" }} />
            <Bar dataKey="avanzado" name="Avanzó" fill="#34d399" radius={[3, 3, 0, 0]} />
            <Bar dataKey="rechazado" name="Rechazado" fill="#f87171" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400/80 inline-block" />Avanzó en el proceso</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400/80 inline-block" />Fue rechazado</span>
        </div>
      </div>

      {/* CV ROI */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">ROI por Versión de CV</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Índice de éxito: entrevistas obtenidas / aplicaciones totales
        </p>
        <div className="space-y-3">
          {cvRoi.map((cv) => (
            <div key={cv.name}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-sm font-medium text-foreground">{cv.fullName}</span>
                  <span className="text-xs text-muted-foreground ml-2">{cv.interviews}/{cv.apps} entrevistas</span>
                </div>
                <span className="text-sm font-bold text-blue-400 font-mono">{cv.rate}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-400 transition-all"
                  style={{ width: `${cv.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Gap de habilidades */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <h3 className="text-xs font-semibold text-foreground mb-3">Análisis de Gap de Habilidades</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {techHeatmap
              .filter((t) => t.rechazado > t.avanzado)
              .map((t) => (
                <div key={t.tech} className="flex items-center justify-between bg-red-400/5 border border-red-400/20 rounded-md px-3 py-2">
                  <span className="text-xs font-mono text-foreground">{t.tech}</span>
                  <span className="text-[11px] text-red-400">{t.rechazado}x rechazo</span>
                </div>
              ))}
          </div>
          {techHeatmap.filter((t) => t.rechazado > t.avanzado).length === 0 && (
            <p className="text-xs text-muted-foreground">No se detectaron gaps críticos de habilidades.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
