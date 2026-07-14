"use client";

import { AlertTriangle, ArrowRight, Building2, Clock, ExternalLink, GitBranch, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_CONFIG } from "@/config/status.config";
import { useApplications } from "@/hooks/use-applications";
import { type Application, type ApplicationStatus, EResult, PIPELINE_STAGES } from "@/models";
import { differenceInDays } from "@/utilities/date.utility";

function isGhosting(app: Application): boolean {
  const days = differenceInDays(new Date(), new Date(app.lastUpdated));
  return days >= 7 && app.status !== "Oferta" && app.status !== "Rechazado";
}

export function DashboardView() {
  const applicationsQuery = useApplications();

  if (applicationsQuery.isPending || !applicationsQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando dashboard…</div>;
  }

  const result = applicationsQuery.data;

  if (result.type === EResult.ERROR) {
    return <div className="p-6 text-sm text-destructive">{result.value.getUserMessage()}</div>;
  }

  return <Dashboard applications={result.value} />;
}

function Dashboard({ applications }: { applications: Application[] }) {
  const [activeStage, setActiveStage] = useState<ApplicationStatus | null>(null);

  const activeApps = useMemo(() => applications.filter((a) => !a.archived && a.status !== "Archivado"), [applications]);

  const kpis = useMemo(() => {
    const totalActive = activeApps.length;
    const offers = activeApps.filter((a) => a.status === "Oferta").length;
    const interviews = activeApps.filter((a) => a.status === "Entrevista Técnica" || a.status === "RRHH").length;
    const ghostingApps = activeApps.filter(isGhosting);
    const conversionRate = totalActive > 0 ? Math.round((offers / totalActive) * 100) : 0;

    return { totalActive, offers, interviews, ghostingRisk: ghostingApps.length, ghostingApps, conversionRate };
  }, [activeApps]);

  const filteredApps = activeStage ? activeApps.filter((a) => a.status === activeStage) : activeApps;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-foreground text-xl">Dashboard</h1>
        <p className="mt-0.5 text-muted-foreground text-sm">Pipeline activo — {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Procesos Activos" value={kpis.totalActive} icon={<GitBranch className="h-4 w-4" />} sub="aplicaciones en curso" color="text-blue-400" />
        <StatCard label="En Entrevistas" value={kpis.interviews} icon={<Clock className="h-4 w-4" />} sub="técnica + RRHH" color="text-amber-400" />
        <StatCard label="Ofertas Recibidas" value={kpis.offers} icon={<TrendingUp className="h-4 w-4" />} sub={`${kpis.conversionRate}% conversión`} color="text-emerald-400" />
        <StatCard
          label="Riesgo Ghosting"
          value={kpis.ghostingRisk}
          icon={<AlertTriangle className="h-4 w-4" />}
          sub="sin actividad +7 días"
          color="text-red-400"
          alert={kpis.ghostingRisk > 0}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Pipeline Visual</h2>
          <button type="button" onClick={() => setActiveStage(null)} className="text-muted-foreground text-xs transition-colors hover:text-foreground">
            {activeStage ? "Limpiar filtro" : `${kpis.totalActive} procesos activos`}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const stageApps = activeApps.filter((a) => a.status === stage);
            const config = STATUS_CONFIG[stage];
            const isActive = activeStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(isActive ? null : stage)}
                className={
                  isActive
                    ? "rounded-lg border border-primary/60 bg-primary/10 p-3 text-left transition-all"
                    : "rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-border/80 hover:bg-secondary"
                }
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                  <span className={`font-semibold text-xs ${config.color}`}>{stageApps.length}</span>
                </div>
                <p className="font-medium text-foreground text-xs leading-tight">{stage}</p>
                <div className="mt-2 space-y-1">
                  {stageApps.slice(0, 2).map((a) => (
                    <div key={a.id} className="truncate text-[10px] text-muted-foreground">
                      {a.company}
                    </div>
                  ))}
                  {stageApps.length > 2 && <div className="text-[10px] text-muted-foreground">+{stageApps.length - 2} más</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">{activeStage ? `Ramas — ${activeStage}` : "Ramas Activas"}</h2>
          <Link href="/branches" className="flex items-center gap-1 text-primary text-xs transition-colors hover:text-primary/80">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {filteredApps.slice(0, 6).map((app) => {
            const daysSince = differenceInDays(new Date(), new Date(app.lastUpdated));
            const ghosting = isGhosting(app);
            return (
              <Link
                key={app.id}
                href={`/branches/${app.id}`}
                className="group flex items-center gap-4 rounded-lg border border-border bg-card p-3.5 transition-all hover:border-primary/30 hover:bg-card/80"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground text-sm">{app.company}</p>
                    {ghosting && <span className="rounded bg-red-400/10 px-1.5 py-0.5 font-medium text-[10px] text-red-400">ghosting</span>}
                  </div>
                  <p className="truncate text-muted-foreground text-xs">{app.role}</p>
                </div>
                <div className="hidden items-center gap-2 font-mono text-[11px] text-muted-foreground sm:flex">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs">{app.cvVersion.split(" — ")[0]}</span>
                </div>
                <StatusBadge status={app.status} size="sm" />
                <div className="hidden shrink-0 text-right text-[11px] text-muted-foreground md:block">
                  <p>{daysSince === 0 ? "hoy" : `hace ${daysSince}d`}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </div>

      {kpis.ghostingRisk > 0 && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="font-semibold text-red-400 text-sm">Alertas Anti-Ghosting</h3>
          </div>
          <div className="space-y-2">
            {kpis.ghostingApps.map((app) => {
              const days = differenceInDays(new Date(), new Date(app.lastUpdated));
              return (
                <div key={app.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{app.company}</span>
                    <span className="text-muted-foreground text-xs">— {app.role}</span>
                  </div>
                  <span className="font-mono text-red-400 text-xs">{days} días sin respuesta</span>
                </div>
              );
            })}
          </div>
          <Link href="/followup" className="mt-3 inline-flex items-center gap-1 text-primary text-xs hover:text-primary/80">
            Gestionar follow-ups <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, sub, color, alert }: { label: string; value: number; icon: React.ReactNode; sub: string; color: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-4 ${alert ? "border-red-400/30" : "border-border"}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-muted-foreground text-xs">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className={`font-bold text-2xl ${color}`}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
