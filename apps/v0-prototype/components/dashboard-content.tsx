"use client";

import { useState } from "react";
import Link from "next/link";
import {
  APPLICATIONS,
  PIPELINE_STAGES,
  STATUS_CONFIG,
  ApplicationStatus,
} from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";
import {
  GitBranch,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  Building2,
  ExternalLink,
} from "lucide-react";
import { differenceInDays } from "@/lib/utils";

const activeApps = APPLICATIONS.filter((a) => !a.archived && a.status !== "Archivado");
const totalActive = activeApps.length;
const offers = activeApps.filter((a) => a.status === "Oferta").length;
const interviews = activeApps.filter((a) => a.status === "Entrevista Técnica" || a.status === "RRHH").length;
const ghostingRisk = activeApps.filter((a) => {
  const days = differenceInDays(new Date(), new Date(a.lastUpdated));
  return days >= 7 && a.status !== "Oferta" && a.status !== "Rechazado";
}).length;

const conversionRate = Math.round((offers / totalActive) * 100);

export function DashboardContent() {
  const [activeStage, setActiveStage] = useState<ApplicationStatus | null>(null);

  const filteredApps = activeStage
    ? activeApps.filter((a) => a.status === activeStage)
    : activeApps;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pipeline activo — {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-3.5 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nueva Rama
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Procesos Activos"
          value={totalActive}
          icon={<GitBranch className="w-4 h-4" />}
          sub="aplicaciones en curso"
          color="text-blue-400"
        />
        <StatCard
          label="En Entrevistas"
          value={interviews}
          icon={<Clock className="w-4 h-4" />}
          sub="técnica + RRHH"
          color="text-amber-400"
        />
        <StatCard
          label="Ofertas Recibidas"
          value={offers}
          icon={<TrendingUp className="w-4 h-4" />}
          sub={`${conversionRate}% conversión`}
          color="text-emerald-400"
        />
        <StatCard
          label="Riesgo Ghosting"
          value={ghostingRisk}
          icon={<AlertTriangle className="w-4 h-4" />}
          sub="sin actividad +7 días"
          color="text-red-400"
          alert={ghostingRisk > 0}
        />
      </div>

      {/* Pipeline Kanban */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Pipeline Visual</h2>
          <button
            onClick={() => setActiveStage(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {activeStage ? "Limpiar filtro" : `${totalActive} procesos activos`}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const apps = activeApps.filter((a) => a.status === stage);
            const config = STATUS_CONFIG[stage];
            const isActive = activeStage === stage;
            return (
              <button
                key={stage}
                onClick={() => setActiveStage(isActive ? null : stage)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  isActive
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-card hover:border-border/80 hover:bg-secondary"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className={`text-xs font-semibold ${config.color}`}>{apps.length}</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-tight">{stage}</p>
                <div className="mt-2 space-y-1">
                  {apps.slice(0, 2).map((a) => (
                    <div key={a.id} className="text-[10px] text-muted-foreground truncate">{a.company}</div>
                  ))}
                  {apps.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">+{apps.length - 2} más</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">
            {activeStage ? `Ramas — ${activeStage}` : "Ramas Activas"}
          </h2>
          <Link href="/branches" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {filteredApps.slice(0, 6).map((app) => {
            const daysSince = differenceInDays(new Date(), new Date(app.lastUpdated));
            const isGhosting = daysSince >= 7 && app.status !== "Oferta" && app.status !== "Rechazado";
            return (
              <Link
                key={app.id}
                href={`/branches/${app.id}`}
                className="flex items-center gap-4 p-3.5 bg-card border border-border rounded-lg hover:border-primary/30 hover:bg-card/80 transition-all group"
              >
                <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{app.company}</p>
                    {isGhosting && (
                      <span className="text-[10px] bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded font-medium">ghosting</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span className="bg-secondary px-2 py-0.5 rounded text-xs">{app.cvVersion.split(" — ")[0]}</span>
                </div>
                <StatusBadge status={app.status} size="sm" />
                <div className="text-[11px] text-muted-foreground text-right shrink-0 hidden md:block">
                  <p>{daysSince === 0 ? "hoy" : `hace ${daysSince}d`}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Follow-up Alerts */}
      {ghostingRisk > 0 && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-red-400">Alertas Anti-Ghosting</h3>
          </div>
          <div className="space-y-2">
            {activeApps
              .filter((a) => {
                const days = differenceInDays(new Date(), new Date(a.lastUpdated));
                return days >= 7 && a.status !== "Oferta" && a.status !== "Rechazado";
              })
              .map((app) => {
                const days = differenceInDays(new Date(), new Date(app.lastUpdated));
                return (
                  <div key={app.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground font-medium">{app.company}</span>
                      <span className="text-xs text-muted-foreground">— {app.role}</span>
                    </div>
                    <span className="text-xs text-red-400 font-mono">{days} días sin respuesta</span>
                  </div>
                );
              })}
          </div>
          <Link href="/followup" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80">
            Gestionar follow-ups <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
  color,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub: string;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 ${alert ? "border-red-400/30" : "border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
