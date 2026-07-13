"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS, STATUS_CONFIG, ApplicationStatus, PIPELINE_STAGES } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";
import { differenceInDays } from "@/lib/utils";
import {
  Search,
  Plus,
  GitBranch,
  Building2,
  MapPin,
  Calendar,
  Copy,
  Archive,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";

const ALL_STATUSES: (ApplicationStatus | "Todas")[] = [
  "Todas", ...PIPELINE_STAGES, "Archivado"
];

export function BranchesContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "Todas">("Todas");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = APPLICATIONS.filter((app) => {
    if (!showArchived && app.archived) return false;
    if (statusFilter !== "Todas" && app.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        app.company.toLowerCase().includes(q) ||
        app.role.toLowerCase().includes(q) ||
        app.techStack.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ramas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} proceso{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-3.5 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nueva Rama
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresa, rol, tecnología…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "Todas")}
              className="appearance-none bg-card border border-border rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 cursor-pointer"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm transition-colors ${
              showArchived
                ? "bg-secondary border-border text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Archivadas
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const count = APPLICATIONS.filter((a) => a.status === stage && !a.archived).length;
          const cfg = STATUS_CONFIG[stage];
          return (
            <button
              key={stage}
              onClick={() => setStatusFilter(statusFilter === stage ? "Todas" : stage)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === stage
                  ? `${cfg.bg} ${cfg.color} border-current/30`
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {stage}
              <span className="font-mono">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Branches grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No se encontraron ramas</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Ajusta los filtros o crea una nueva rama</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((app) => {
            const daysSince = differenceInDays(new Date(), new Date(app.lastUpdated));
            const isGhosting = daysSince >= 7 && app.status !== "Oferta" && app.status !== "Rechazado" && app.status !== "Archivado";
            return (
              <Link
                key={app.id}
                href={`/branches/${app.id}`}
                className="group bg-card border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-card/80 transition-all block"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{app.company}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.role}</p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </div>

                {/* Timeline mini progress */}
                <div className="flex items-center gap-1 mb-3">
                  {PIPELINE_STAGES.filter(s => s !== "Rechazado").map((stage, i) => {
                    const stageIdx = PIPELINE_STAGES.filter(s => s !== "Rechazado").indexOf(app.status as ApplicationStatus);
                    const isReached = i <= stageIdx;
                    const isCurrent = stage === app.status;
                    const cfg = STATUS_CONFIG[stage];
                    return (
                      <div key={stage} className="flex items-center gap-1 flex-1">
                        <div className={`h-1 rounded-full flex-1 transition-colors ${
                          app.status === "Rechazado"
                            ? "bg-red-400/30"
                            : isReached
                            ? cfg.dot.replace("bg-", "bg-")
                            : "bg-border"
                        } ${isCurrent ? "opacity-100" : isReached ? "opacity-60" : "opacity-30"}`} />
                      </div>
                    );
                  })}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {app.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {app.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(app.appliedDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </span>
                  {app.salary && (
                    <span className="text-emerald-400/80">{app.salary}</span>
                  )}
                  {isGhosting && (
                    <span className="text-red-400 font-medium">{daysSince}d sin resp.</span>
                  )}
                </div>

                {/* Tech stack */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {app.techStack.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                      {t}
                    </span>
                  ))}
                  {app.techStack.length > 4 && (
                    <span className="text-[10px] text-muted-foreground/60">+{app.techStack.length - 4}</span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <span className="text-[11px] font-mono text-muted-foreground/70 bg-secondary px-2 py-0.5 rounded">
                    {app.cvVersion.split(" — ")[0]}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.preventDefault(); }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Clonar rama"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); }}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Archivar"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
