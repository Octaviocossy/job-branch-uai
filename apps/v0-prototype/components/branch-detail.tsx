"use client";

import Link from "next/link";
import { Application, STATUS_CONFIG, PIPELINE_STAGES, ApplicationStatus } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";
import { differenceInDays } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Calendar,
  Linkedin,
  Mail,
  User,
  GitBranch,
  Copy,
  Archive,
  FileText,
  Clock,
  ExternalLink,
  Tag,
} from "lucide-react";

export function BranchDetail({ app }: { app: Application }) {
  const daysSinceUpdate = differenceInDays(new Date(), new Date(app.lastUpdated));
  const stagesOrder = PIPELINE_STAGES;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/branches"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Ramas
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{app.company}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="text-base text-muted-foreground">{app.role}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
              {app.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {app.location}
                </span>
              )}
              {app.salary && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  {app.salary}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Aplicado el {new Date(app.appliedDate).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {app.source && (
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {app.source}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Copy className="w-3.5 h-3.5" />
              Clonar
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Archive className="w-3.5 h-3.5" />
              Archivar
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline progress */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Estado del Proceso</h2>
        <div className="flex items-center gap-0">
          {stagesOrder.map((stage, i) => {
            const cfg = STATUS_CONFIG[stage];
            const currentIdx = stagesOrder.indexOf(app.status as ApplicationStatus);
            const isRejected = app.status === "Rechazado";
            const reached = isRejected
              ? i <= currentIdx
              : i <= currentIdx;
            const isCurrent = stage === app.status;

            return (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? `${cfg.dot} border-transparent text-background`
                        : reached && !isRejected
                        ? "border-current/40 bg-secondary text-muted-foreground"
                        : "border-border bg-transparent text-muted-foreground/40"
                    } ${isCurrent ? "ring-2 ring-offset-2 ring-offset-card ring-current/30" : ""}`}
                    style={isCurrent ? { color: cfg.color.replace("text-", "") } : {}}
                  >
                    {reached && !isCurrent ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight max-w-[60px] ${isCurrent ? cfg.color : "text-muted-foreground/50"}`}>
                    {stage}
                  </span>
                </div>
                {i < stagesOrder.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded transition-colors ${
                    i < currentIdx && !isRejected ? "bg-border" : "bg-border/40"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Timeline de Hitos
          </h2>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-5">
              {app.timeline.map((event, idx) => {
                const cfg = STATUS_CONFIG[event.status];
                const isLast = idx === app.timeline.length - 1;
                return (
                  <div key={event.id} className="relative flex gap-4 pl-8">
                    <div className={`absolute left-0 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center ${cfg.dot} ${isLast ? "ring-2 ring-offset-2 ring-offset-card ring-current/20" : ""}`}>
                      <span className="text-[8px] font-bold text-background">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${cfg.color}`}>{event.status}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(event.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          {event.daysInStage !== undefined && (
                            <span className="ml-2 text-muted-foreground/60">+{event.daysInStage}d</span>
                          )}
                        </span>
                      </div>
                      {event.note && (
                        <p className="text-xs text-muted-foreground">{event.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Última actividad hace {daysSinceUpdate} día{daysSinceUpdate !== 1 ? "s" : ""}
            </span>
            <button className="text-primary hover:text-primary/80 transition-colors">+ Agregar hito</button>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* CV Version */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Perfil Utilizado
            </h3>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{app.cvVersion}</span>
            </div>
          </div>

          {/* Recruiter */}
          {app.recruiter && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Reclutador
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{app.recruiter.name}</span>
                </div>
                {app.recruiter.linkedin && (
                  <a
                    href={`https://${app.recruiter.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    LinkedIn
                  </a>
                )}
                {app.recruiter.email && (
                  <a
                    href={`mailto:${app.recruiter.email}`}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {app.recruiter.email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Tech Stack */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Stack Requerido
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {app.techStack.map((t) => (
                <span key={t} className="text-xs font-mono bg-secondary text-muted-foreground px-2 py-1 rounded">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          {app.notes && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Post-Mortem / Notas
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{app.notes}</p>
            </div>
          )}

          {/* Branch ID */}
          <div className="px-3 py-2 rounded-md bg-secondary border border-border/50 font-mono text-[11px] text-muted-foreground flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5" />
            {app.id}
          </div>
        </div>
      </div>
    </div>
  );
}
