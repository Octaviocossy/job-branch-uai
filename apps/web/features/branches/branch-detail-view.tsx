"use client";

import { Archive, ArrowLeft, Calendar, Clock, Copy, DollarSign, ExternalLink, FileText, GitBranch, Linkedin, Loader2, Mail, MapPin, Tag, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG } from "@/config/status.config";
import { useAddHito } from "@/hooks/use-add-hito";
import { useApplication } from "@/hooks/use-application";
import { useArchiveApplication } from "@/hooks/use-archive-application";
import { useCloneApplication } from "@/hooks/use-clone-application";
import { usePermissions } from "@/hooks/use-permissions";
import { type Application, type ApplicationStatus, EResult, PIPELINE_STAGES } from "@/models";
import { differenceInDays } from "@/utilities/date.utility";
import { cn } from "@/utilities/tailwind.utility";

const TERMINAL_STATUSES: ApplicationStatus[] = ["Oferta", "Rechazado", "Archivado"];

interface BranchDetailViewProps {
  id: string;
}

export function BranchDetailView({ id }: BranchDetailViewProps) {
  const applicationQuery = useApplication(id);

  if (applicationQuery.isPending || !applicationQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando rama…</div>;
  }

  const result = applicationQuery.data;

  if (result.type === EResult.ERROR) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Link href="/branches" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Ramas
        </Link>
        <p className="text-sm text-destructive">{result.value.getUserMessage()}</p>
      </div>
    );
  }

  return <BranchDetail app={result.value} />;
}

function BranchDetail({ app }: { app: Application }) {
  const daysSinceUpdate = differenceInDays(new Date(), new Date(app.lastUpdated));
  const cloneApplication = useCloneApplication();
  const archiveApplication = useArchiveApplication();
  const { canDo } = usePermissions();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href="/branches" className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Ramas
        </Link>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <h1 className="font-bold text-2xl text-foreground">{app.company}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="text-base text-muted-foreground">{app.role}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-sm">
              {app.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {app.location}
                </span>
              )}
              {app.salary && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  {app.salary}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Aplicado el {new Date(app.appliedDate).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {app.source && (
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {app.source}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canDo("cloneBranch") && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled={cloneApplication.isPending} onClick={() => cloneApplication.mutate(app.id)}>
                {cloneApplication.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                Clonar
              </Button>
            )}
            {canDo("archiveBranch") && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled={archiveApplication.isPending || app.archived} onClick={() => archiveApplication.mutate(app.id)}>
                {archiveApplication.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                Archivar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold text-foreground text-sm">Estado del Proceso</h2>
        <div className="flex items-center gap-0">
          {PIPELINE_STAGES.map((stage, i) => {
            const config = STATUS_CONFIG[stage];
            const currentIdx = PIPELINE_STAGES.indexOf(app.status as ApplicationStatus);
            const isRejected = app.status === "Rechazado";
            const reached = i <= currentIdx;
            const isCurrent = stage === app.status;

            return (
              <div key={stage} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-xs transition-all",
                      isCurrent
                        ? cn(config.dot, "border-transparent text-background", "ring-2 ring-current/30 ring-offset-2 ring-offset-card")
                        : reached && !isRejected
                          ? "border-current/40 bg-secondary text-muted-foreground"
                          : "border-border bg-transparent text-muted-foreground/40",
                    )}
                  >
                    {reached && !isCurrent ? "✓" : i + 1}
                  </div>
                  <span className={cn("max-w-[60px] text-center text-[10px] font-medium leading-tight", isCurrent ? config.color : "text-muted-foreground/50")}>{stage}</span>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className={cn("mx-1 h-0.5 flex-1 rounded transition-colors", i < currentIdx && !isRejected ? "bg-border" : "bg-border/40")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Timeline de Hitos
          </h2>
          <div className="relative">
            <div className="absolute bottom-0 left-3 top-0 w-px bg-border" />
            <div className="space-y-5">
              {app.timeline.map((event, idx) => {
                const config = STATUS_CONFIG[event.status];
                const isLast = idx === app.timeline.length - 1;
                return (
                  <div key={event.id} className="relative flex gap-4 pl-8">
                    <div
                      className={cn(
                        "absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background",
                        config.dot,
                        isLast && "ring-2 ring-current/20 ring-offset-2 ring-offset-card",
                      )}
                    >
                      <span className="font-bold text-[8px] text-background">{idx + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className={cn("font-semibold text-xs", config.color)}>{event.status}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {new Date(event.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                          {event.daysInStage !== undefined && <span className="ml-2 text-muted-foreground/60">+{event.daysInStage}d</span>}
                        </span>
                      </div>
                      {event.note && <p className="text-muted-foreground text-xs">{event.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-border/50 border-t pt-4 text-muted-foreground text-xs">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Última actividad hace {daysSinceUpdate} día{daysSinceUpdate !== 1 ? "s" : ""}
            </span>
          </div>
          <AddHitoForm app={app} />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">Perfil Utilizado</h3>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium text-foreground text-sm">{app.cvVersion}</span>
            </div>
          </div>

          {app.recruiter && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">Reclutador</h3>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground text-sm">{app.recruiter.name}</span>
                </div>
                {app.recruiter.linkedin && (
                  <a
                    href={`https://${app.recruiter.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 text-xs transition-colors hover:text-blue-300"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                )}
                {app.recruiter.email && (
                  <a href={`mailto:${app.recruiter.email}`} className="flex items-center gap-2 text-muted-foreground text-xs transition-colors hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {app.recruiter.email}
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 flex items-center gap-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">
              <Tag className="h-3.5 w-3.5" />
              Stack Requerido
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {app.techStack.map((t) => (
                <span key={t} className="rounded bg-secondary px-2 py-1 font-mono text-muted-foreground text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {app.notes && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">Post-Mortem / Notas</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{app.notes}</p>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <GitBranch className="h-3.5 w-3.5" />
            {app.id}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddHitoForm({ app }: { app: Application }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>("Enviado");
  const [note, setNote] = useState("");
  const addHito = useAddHito();
  const { canDo } = usePermissions();

  const isTerminal = TERMINAL_STATUSES.includes(app.status);

  if (isTerminal || !canDo("addHito")) {
    return null;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-primary text-xs transition-colors hover:text-primary/80">
        + Agregar hito
      </button>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addHito.mutate(
      {
        id: app.id,
        input: {
          ramaId: app.id,
          date: new Date().toISOString().slice(0, 10),
          status,
          note: note.trim() || undefined,
        },
      },
      {
        onSuccess: (result) => {
          if (result.type === EResult.SUCCESS) {
            setOpen(false);
            setNote("");
          }
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 border-border/50 border-t pt-3">
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
          className="rounded-md border border-border bg-secondary px-2 py-1.5 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota (opcional)"
          className="flex-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      {addHito.data?.type === EResult.ERROR && <p className="text-destructive text-xs">{addHito.data.value.getUserMessage()}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={addHito.isPending}>
          {addHito.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Guardar hito
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
