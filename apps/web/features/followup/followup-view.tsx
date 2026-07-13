"use client";

import { AlertTriangle, Bell, Building2, CheckCircle2, ChevronRight, Clock, Linkedin, Mail, Send, Settings2, User, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useFollowups } from "@/hooks/use-followups";
import { useMarkFollowupDone } from "@/hooks/use-mark-followup-done";
import { EResult, type FollowupItem, type FollowupUrgency } from "@/models";
import { cn } from "@/utilities/tailwind.utility";

const THRESHOLD_OPTIONS = [7, 10, 15] as const;

const FOLLOWUP_TEMPLATES = [
  {
    id: "t1",
    label: "Follow-up estándar (7 días)",
    subject: "Re: Proceso de selección — [ROL]",
    body: "Hola [NOMBRE],\n\nEspero que estés muy bien. Me comunico para hacer un seguimiento sobre el proceso de selección para el puesto de [ROL] en [EMPRESA].\n\nQuedo atento/a a cualquier novedad. Muchas gracias por tu tiempo.\n\nSaludos,\n[TU NOMBRE]",
  },
  {
    id: "t2",
    label: "Follow-up post entrevista técnica",
    subject: "Seguimiento entrevista técnica — [ROL]",
    body: "Hola [NOMBRE],\n\nFue un placer participar de la entrevista técnica para el puesto de [ROL]. Quería escribirte para reiterar mi interés en la posición y consultar si hay novedades sobre los próximos pasos del proceso.\n\nQuedo a disposición.\n\nSaludos,\n[TU NOMBRE]",
  },
  {
    id: "t3",
    label: "Última consulta (15+ días)",
    subject: "Consulta final — [ROL] en [EMPRESA]",
    body: "Hola [NOMBRE],\n\nEntiendo que los procesos de selección pueden llevar tiempo. Me gustaría saber si continúa abierta la búsqueda para el puesto de [ROL] o si se tomó una decisión.\n\nAgradezco tu respuesta.\n\nSaludos,\n[TU NOMBRE]",
  },
] as const;

const URGENCY_CONFIG: Record<FollowupUrgency, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  ok: { label: "Al día", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle2 },
  warn: { label: "Follow-up", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: Clock },
  critical: { label: "Ghosting", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", icon: AlertTriangle },
};

export function FollowupView() {
  const [threshold, setThreshold] = useState<number>(THRESHOLD_OPTIONS[0]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(FOLLOWUP_TEMPLATES[0].id);
  const followupsQuery = useFollowups(threshold);
  const markFollowupDone = useMarkFollowupDone();

  if (followupsQuery.isPending || !followupsQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando seguimientos…</div>;
  }

  const result = followupsQuery.data;

  if (result.type === EResult.ERROR) {
    return <div className="p-6 text-sm text-destructive">{result.value.getUserMessage()}</div>;
  }

  const { items, summary } = result.value;
  const critical = items.filter((item) => item.urgency === "critical");
  const warn = items.filter((item) => item.urgency === "warn");
  const ok = items.filter((item) => item.urgency === "ok");
  const template = FOLLOWUP_TEMPLATES.find((candidate) => candidate.id === selectedTemplateId) ?? FOLLOWUP_TEMPLATES[0];

  const handleDone = (ramaId: string) => markFollowupDone.mutate(ramaId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Follow-up &amp; Anti-Ghosting</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Gestiona el tiempo de respuesta de tus aplicaciones activas</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <Settings2 className="h-4 w-4" />
          <span>Alerta a los</span>
          <select value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="cursor-pointer bg-transparent text-foreground focus:outline-none">
            {THRESHOLD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} días
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["critical", "warn", "ok"] as const).map((urgency) => {
          const config = URGENCY_CONFIG[urgency];
          return (
            <div key={urgency} className={cn("flex items-center gap-3 rounded-lg border p-4", config.border, config.bg)}>
              <config.icon className={cn("h-4 w-4", config.color)} />
              <div>
                <p className={cn("text-xl font-bold", config.color)}>{summary[urgency]}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {critical.length > 0 && <FollowupSection title="Ghosting crítico" subtitle="Sin actividad prolongada" urgency="critical" items={critical} onDone={handleDone} />}
          {warn.length > 0 && <FollowupSection title="Follow-up recomendado" subtitle="Requiere seguimiento" urgency="warn" items={warn} onDone={handleDone} />}
          {ok.length > 0 && <FollowupSection title="Al día" subtitle="Actividad reciente" urgency="ok" items={ok} onDone={handleDone} />}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No hay aplicaciones activas</p>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="sticky top-6 rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Plantillas de Follow-up</h2>
            </div>
            <div className="mb-4 space-y-2">
              {FOLLOWUP_TEMPLATES.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(candidate.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                    selectedTemplateId === candidate.id
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {candidate.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" htmlFor="followup-template-subject">
                  Asunto
                </label>
                <div id="followup-template-subject" className="mt-1 rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs text-foreground">
                  {template.subject}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" htmlFor="followup-template-body">
                  Cuerpo
                </label>
                <pre
                  id="followup-template-body"
                  className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-secondary px-3 py-2 font-sans text-xs leading-relaxed text-muted-foreground"
                >
                  {template.body}
                </pre>
              </div>
            </div>
            <Button className="mt-4 w-full" size="sm">
              <Send className="h-3.5 w-3.5" />
              Usar plantilla
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FollowupSectionProps {
  title: string;
  subtitle: string;
  urgency: FollowupUrgency;
  items: FollowupItem[];
  onDone: (ramaId: string) => void;
}

function FollowupSection({ title, subtitle, urgency, items, onDone }: FollowupSectionProps) {
  const config = URGENCY_CONFIG[urgency];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <config.icon className={cn("h-4 w-4", config.color)} />
        <div>
          <span className={cn("text-sm font-semibold", config.color)}>{title}</span>
          <span className="ml-2 text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.ramaId} className={cn("flex items-center gap-3 rounded-lg border bg-card p-3.5 transition-all", config.border)}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{item.company}</p>
                <StatusBadge status={item.status} size="sm" />
              </div>
              <p className="truncate text-xs text-muted-foreground">{item.role}</p>
              {item.recruiter && (
                <div className="mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                    <User className="h-3 w-3" /> {item.recruiter.name}
                  </span>
                  {item.recruiter.email && (
                    <a href={`mailto:${item.recruiter.email}`} className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300">
                      <Mail className="h-3 w-3" /> Email
                    </a>
                  )}
                  {item.recruiter.linkedin && (
                    <a
                      href={`https://${item.recruiter.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
                    >
                      <Linkedin className="h-3 w-3" /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className={cn("font-mono text-xs font-semibold", config.color)}>{item.daysSince}d</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDone(item.ramaId)}
                  className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-400"
                >
                  Hecho
                </button>
                <Link href={`/branches/${item.ramaId}`} className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
