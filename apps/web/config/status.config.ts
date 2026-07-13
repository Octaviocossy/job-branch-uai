import type { ApplicationStatus } from "@/models";

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; dot: string }> = {
  Enviado: { label: "Enviado", color: "text-blue-400", bg: "bg-blue-400/10", dot: "bg-blue-400" },
  "Entrevista Técnica": { label: "Entrevista Técnica", color: "text-amber-400", bg: "bg-amber-400/10", dot: "bg-amber-400" },
  RRHH: { label: "RRHH", color: "text-cyan-400", bg: "bg-cyan-400/10", dot: "bg-cyan-400" },
  Oferta: { label: "Oferta", color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
  Rechazado: { label: "Rechazado", color: "text-red-400", bg: "bg-red-400/10", dot: "bg-red-400" },
  Archivado: { label: "Archivado", color: "text-zinc-500", bg: "bg-zinc-500/10", dot: "bg-zinc-500" },
};
