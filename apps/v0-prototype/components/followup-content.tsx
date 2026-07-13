"use client";

import { useState } from "react";
import Link from "next/link";
import { APPLICATIONS } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";
import { differenceInDays } from "@/lib/utils";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Settings2,
  Mail,
  Linkedin,
  User,
  Building2,
  ChevronRight,
  Zap,
} from "lucide-react";

const THRESHOLDS = { warn: 7, critical: 15 };

type Urgency = "ok" | "warn" | "critical";

interface FollowupItem {
  app: typeof APPLICATIONS[0];
  daysSince: number;
  urgency: Urgency;
}

const followupItems: FollowupItem[] = APPLICATIONS.filter(
  (a) => !a.archived && a.status !== "Archivado" && a.status !== "Oferta" && a.status !== "Rechazado"
).map((app) => {
  const daysSince = differenceInDays(new Date(), new Date(app.lastUpdated));
  let urgency: Urgency = "ok";
  if (daysSince >= THRESHOLDS.critical) urgency = "critical";
  else if (daysSince >= THRESHOLDS.warn) urgency = "warn";
  return { app, daysSince, urgency };
}).sort((a, b) => b.daysSince - a.daysSince);

const URGENCY_CONFIG = {
  ok:       { label: "Al día",         color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: <CheckCircle2 className="w-4 h-4" /> },
  warn:     { label: "Follow-up",      color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   icon: <Clock className="w-4 h-4" /> },
  critical: { label: "Ghosting",       color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icon: <AlertTriangle className="w-4 h-4" /> },
};

const FOLLOWUP_TEMPLATES = [
  {
    id: "t1",
    label: "Follow-up estándar (7 días)",
    subject: "Re: Proceso de selección — [ROL]",
    body: `Hola [NOMBRE],\n\nEspero que estés muy bien. Me comunico para hacer un seguimiento sobre el proceso de selección para el puesto de [ROL] en [EMPRESA].\n\nQuedo atento/a a cualquier novedad. Muchas gracias por tu tiempo.\n\nSaludos,\n[TU NOMBRE]`,
  },
  {
    id: "t2",
    label: "Follow-up post entrevista técnica",
    subject: "Seguimiento entrevista técnica — [ROL]",
    body: `Hola [NOMBRE],\n\nFue un placer participar de la entrevista técnica para el puesto de [ROL]. Quería escribirte para reiterar mi interés en la posición y consultar si hay novedades sobre los próximos pasos del proceso.\n\nQuedo a disposición.\n\nSaludos,\n[TU NOMBRE]`,
  },
  {
    id: "t3",
    label: "Última consulta (15+ días)",
    subject: "Consulta final — [ROL] en [EMPRESA]",
    body: `Hola [NOMBRE],\n\nEntiendo que los procesos de selección pueden llevar tiempo. Me gustaría saber si continúa abierta la búsqueda para el puesto de [ROL] o si se tomó una decisión.\n\nAgradezco tu respuesta.\n\nSaludos,\n[TU NOMBRE]`,
  },
];

export function FollowupContent() {
  const [threshold, setThreshold] = useState(7);
  const [selectedTemplate, setSelectedTemplate] = useState(FOLLOWUP_TEMPLATES[0].id);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const critical = followupItems.filter((i) => i.urgency === "critical" && !doneIds.has(i.app.id));
  const warn = followupItems.filter((i) => i.urgency === "warn" && !doneIds.has(i.app.id));
  const ok = followupItems.filter((i) => i.urgency === "ok" && !doneIds.has(i.app.id));

  const template = FOLLOWUP_TEMPLATES.find((t) => t.id === selectedTemplate)!;

  const markDone = (id: string) => {
    setDoneIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Follow-up & Anti-Ghosting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestiona el tiempo de respuesta de tus aplicaciones activas
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-md px-3 py-2">
          <Settings2 className="w-4 h-4" />
          <span>Alerta a los</span>
          <select
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="bg-transparent text-foreground focus:outline-none cursor-pointer"
          >
            <option value={7}>7 días</option>
            <option value={10}>10 días</option>
            <option value={15}>15 días</option>
          </select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["critical", "warn", "ok"] as Urgency[]).map((u) => {
          const cfg = URGENCY_CONFIG[u];
          const count = u === "critical" ? critical.length : u === "warn" ? warn.length : ok.length;
          return (
            <div key={u} className={`flex items-center gap-3 rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
              <span className={cfg.color}>{cfg.icon}</span>
              <div>
                <p className={`text-xl font-bold ${cfg.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Follow-up list */}
        <div className="lg:col-span-3 space-y-4">
          {critical.length > 0 && (
            <Section
              title="Ghosting crítico"
              subtitle={`Sin actividad por +${THRESHOLDS.critical} días`}
              urgency="critical"
              items={critical}
              onDone={markDone}
            />
          )}
          {warn.length > 0 && (
            <Section
              title="Follow-up recomendado"
              subtitle={`Sin actividad por +${THRESHOLDS.warn} días`}
              urgency="warn"
              items={warn}
              onDone={markDone}
            />
          )}
          {ok.length > 0 && (
            <Section
              title="Al día"
              subtitle="Actividad reciente"
              urgency="ok"
              items={ok}
              onDone={markDone}
            />
          )}
          {followupItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No hay aplicaciones activas</p>
            </div>
          )}
        </div>

        {/* Right: Template builder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Plantillas de Follow-up</h2>
            </div>
            <div className="space-y-2 mb-4">
              {FOLLOWUP_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border text-sm transition-colors ${
                    selectedTemplate === t.id
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Asunto</label>
                <div className="mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-xs text-foreground font-mono">
                  {template.subject}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Cuerpo</label>
                <pre className="mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-xs text-muted-foreground font-sans whitespace-pre-wrap leading-relaxed">
                  {template.body}
                </pre>
              </div>
            </div>
            <button className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm px-3 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
              <Send className="w-3.5 h-3.5" />
              Usar plantilla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  urgency,
  items,
  onDone,
}: {
  title: string;
  subtitle: string;
  urgency: Urgency;
  items: FollowupItem[];
  onDone: (id: string) => void;
}) {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={cfg.color}>{cfg.icon}</span>
        <div>
          <span className={`text-sm font-semibold ${cfg.color}`}>{title}</span>
          <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map(({ app, daysSince }) => (
          <div
            key={app.id}
            className={`flex items-center gap-3 p-3.5 bg-card border rounded-lg transition-all ${cfg.border}`}
          >
            <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{app.company}</p>
                <StatusBadge status={app.status} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground truncate">{app.role}</p>
              {app.recruiter && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    <User className="w-3 h-3" /> {app.recruiter.name}
                  </span>
                  {app.recruiter.email && (
                    <a href={`mailto:${app.recruiter.email}`} className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                      <Mail className="w-3 h-3" /> Email
                    </a>
                  )}
                  {app.recruiter.linkedin && (
                    <a href={`https://${app.recruiter.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                      <Linkedin className="w-3 h-3" /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-xs font-mono font-semibold ${cfg.color}`}>
                {daysSince}d
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDone(app.id)}
                  className="text-[11px] text-muted-foreground hover:text-emerald-400 border border-border hover:border-emerald-400/40 px-2 py-0.5 rounded transition-colors"
                >
                  Hecho
                </button>
                <Link
                  href={`/branches/${app.id}`}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
