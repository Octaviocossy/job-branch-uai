"use client";

import { Archive, Building2, Calendar, ChevronDown, Copy, GitBranch, MapPin, Plus, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_CONFIG } from "@/config/status.config";
import { useApplications } from "@/hooks/use-applications";
import { useArchiveApplication } from "@/hooks/use-archive-application";
import { useCloneApplication } from "@/hooks/use-clone-application";
import { type Application, type ApplicationStatus, EResult, PIPELINE_STAGES } from "@/models";
import { differenceInDays } from "@/utilities/date.utility";
import { cn } from "@/utilities/tailwind.utility";

const ALL_STATUSES: (ApplicationStatus | "Todas")[] = ["Todas", ...PIPELINE_STAGES, "Archivado"];

export function BranchesView() {
  const applicationsQuery = useApplications();

  if (applicationsQuery.isPending || !applicationsQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando ramas…</div>;
  }

  const result = applicationsQuery.data;

  if (result.type === EResult.ERROR) {
    return <div className="p-6 text-sm text-destructive">{result.value.getUserMessage()}</div>;
  }

  return <BranchesList applications={result.value} />;
}

function BranchesList({ applications }: { applications: Application[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "Todas">("Todas");
  const [showArchived, setShowArchived] = useState(false);

  const cloneApplication = useCloneApplication();
  const archiveApplication = useArchiveApplication();

  const filtered = applications.filter((app) => {
    if (!showArchived && app.archived) {
      return false;
    }
    if (statusFilter !== "Todas" && app.status !== statusFilter) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return app.company.toLowerCase().includes(q) || app.role.toLowerCase().includes(q) || app.techStack.some((t) => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ramas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {filtered.length} proceso{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva Rama
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresa, rol, tecnología…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "Todas")}
              className="cursor-pointer appearance-none rounded-md border border-border bg-card py-2 pr-8 pl-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
              showArchived ? "border-border bg-secondary text-foreground" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Archive className="h-3.5 w-3.5" />
            Archivadas
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const count = applications.filter((a) => a.status === stage && !a.archived).length;
          const config = STATUS_CONFIG[stage];
          return (
            <button
              key={stage}
              type="button"
              onClick={() => setStatusFilter(statusFilter === stage ? "Todas" : stage)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === stage ? cn(config.bg, config.color, "border-current/30") : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              {stage}
              <span className="font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No se encontraron ramas</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Ajusta los filtros o crea una nueva rama</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((app) => (
            <BranchCard key={app.id} app={app} onClone={() => cloneApplication.mutate(app.id)} onArchive={() => archiveApplication.mutate(app.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface BranchCardProps {
  app: Application;
  onClone: () => void;
  onArchive: () => void;
}

function BranchCard({ app, onClone, onArchive }: BranchCardProps) {
  const daysSince = differenceInDays(new Date(), new Date(app.lastUpdated));
  const isGhosting = daysSince >= 7 && app.status !== "Oferta" && app.status !== "Rechazado" && app.status !== "Archivado";
  const visibleStages: ApplicationStatus[] = PIPELINE_STAGES.filter((s) => s !== "Rechazado");
  const stageIdx = visibleStages.indexOf(app.status);

  return (
    <Link href={`/branches/${app.id}`} className="group block rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-card/80">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{app.company}</p>
            <p className="truncate text-xs text-muted-foreground">{app.role}</p>
          </div>
        </div>
        <StatusBadge status={app.status} size="sm" />
      </div>

      <div className="mb-3 flex items-center gap-1">
        {visibleStages.map((stage, i) => {
          const isReached = i <= stageIdx;
          const isCurrent = stage === app.status;
          const config = STATUS_CONFIG[stage];
          return (
            <div key={stage} className="flex flex-1 items-center gap-1">
              <div
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  app.status === "Rechazado" ? "bg-red-400/30" : isReached ? config.dot : "bg-border",
                  isCurrent ? "opacity-100" : isReached ? "opacity-60" : "opacity-30",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {app.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {app.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(app.appliedDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </span>
        {app.salary && <span className="text-emerald-400/80">{app.salary}</span>}
        {isGhosting && <span className="font-medium text-red-400">{daysSince}d sin resp.</span>}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {app.techStack.slice(0, 4).map((t) => (
          <span key={t} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {t}
          </span>
        ))}
        {app.techStack.length > 4 && <span className="text-[10px] text-muted-foreground/60">+{app.techStack.length - 4}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between border-border/50 border-t pt-3">
        <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground/70">{app.cvVersion.split(" — ")[0]}</span>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClone();
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Clonar rama"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onArchive();
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Archivar"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Link>
  );
}
