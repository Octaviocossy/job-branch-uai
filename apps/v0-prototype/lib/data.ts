export type ApplicationStatus =
  | "Enviado"
  | "Entrevista Técnica"
  | "RRHH"
  | "Oferta"
  | "Rechazado"
  | "Archivado";

export interface TimelineEvent {
  id: string;
  date: string;
  status: ApplicationStatus;
  note?: string;
  daysInStage?: number;
}

export interface Recruiter {
  name: string;
  linkedin?: string;
  email?: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  cvVersion: string;
  appliedDate: string;
  lastUpdated: string;
  recruiter?: Recruiter;
  techStack: string[];
  notes?: string;
  timeline: TimelineEvent[];
  salary?: string;
  location?: string;
  source?: string;
  archived?: boolean;
}

export interface CvVersion {
  id: string;
  name: string;
  focus: string;
  applications: number;
  interviews: number;
  createdAt: string;
}

export const CV_VERSIONS: CvVersion[] = [
  { id: "cv-1", name: "v1.0 — Fullstack General", focus: "General", applications: 12, interviews: 3, createdAt: "2024-01-10" },
  { id: "cv-2", name: "v2.0 — Frontend Focused", focus: "Frontend", applications: 18, interviews: 7, createdAt: "2024-02-15" },
  { id: "cv-3", name: "v2.1 — React + TypeScript", focus: "Frontend", applications: 9, interviews: 5, createdAt: "2024-03-01" },
  { id: "cv-4", name: "v3.0 — Senior + Leadership", focus: "Senior", applications: 6, interviews: 4, createdAt: "2024-04-20" },
];

export const APPLICATIONS: Application[] = [
  {
    id: "app-1",
    company: "Mercado Libre",
    role: "Senior Frontend Engineer",
    status: "Entrevista Técnica",
    cvVersion: "v2.1 — React + TypeScript",
    appliedDate: "2024-04-28",
    lastUpdated: "2024-05-04",
    recruiter: { name: "Laura García", linkedin: "linkedin.com/in/lauragarcia", email: "l.garcia@meli.com" },
    techStack: ["React", "TypeScript", "Node.js", "AWS"],
    notes: "Pasé el primer filtro de RRHH. Esperando link de technical assessment.",
    salary: "USD 4.000–5.500",
    location: "Buenos Aires (Híbrido)",
    source: "LinkedIn",
    timeline: [
      { id: "t1", date: "2024-04-28", status: "Enviado", note: "Aplicación enviada vía LinkedIn" },
      { id: "t2", date: "2024-05-02", status: "RRHH", note: "Llamada con Laura García - 30 min", daysInStage: 4 },
      { id: "t3", date: "2024-05-04", status: "Entrevista Técnica", note: "Technical assessment enviado", daysInStage: 2 },
    ],
  },
  {
    id: "app-2",
    company: "Globant",
    role: "React Developer",
    status: "RRHH",
    cvVersion: "v2.0 — Frontend Focused",
    appliedDate: "2024-04-25",
    lastUpdated: "2024-05-01",
    recruiter: { name: "Martín Suárez", email: "m.suarez@globant.com" },
    techStack: ["React", "JavaScript", "GraphQL", "Docker"],
    salary: "USD 3.000–4.000",
    location: "Remoto",
    source: "Referido",
    timeline: [
      { id: "t1", date: "2024-04-25", status: "Enviado", note: "Referido por ex-colega" },
      { id: "t2", date: "2024-05-01", status: "RRHH", note: "Email de coordinación recibido", daysInStage: 6 },
    ],
  },
  {
    id: "app-3",
    company: "Despegar",
    role: "Full Stack Developer",
    status: "Rechazado",
    cvVersion: "v1.0 — Fullstack General",
    appliedDate: "2024-04-10",
    lastUpdated: "2024-04-22",
    recruiter: { name: "Sofía Rodríguez" },
    techStack: ["React", "Java", "Spring Boot", "Kubernetes"],
    notes: "Feedback: falta experiencia en Java/Spring. Priorizar backend en próximas versiones.",
    location: "Buenos Aires",
    source: "Portal Corporativo",
    timeline: [
      { id: "t1", date: "2024-04-10", status: "Enviado" },
      { id: "t2", date: "2024-04-14", status: "RRHH", daysInStage: 4 },
      { id: "t3", date: "2024-04-18", status: "Entrevista Técnica", note: "Live coding en Java — dificultades", daysInStage: 4 },
      { id: "t4", date: "2024-04-22", status: "Rechazado", note: "Feedback: experiencia Java insuficiente", daysInStage: 4 },
    ],
  },
  {
    id: "app-4",
    company: "Santander Tech",
    role: "Frontend Lead",
    status: "Oferta",
    cvVersion: "v3.0 — Senior + Leadership",
    appliedDate: "2024-03-20",
    lastUpdated: "2024-05-05",
    recruiter: { name: "Carolina Vega", linkedin: "linkedin.com/in/carolinavega", email: "c.vega@santander.com" },
    techStack: ["React", "TypeScript", "Angular", "Jenkins"],
    notes: "Oferta recibida. Evaluando contra otras opciones.",
    salary: "USD 5.000–6.500",
    location: "Buenos Aires (On-site)",
    source: "LinkedIn",
    timeline: [
      { id: "t1", date: "2024-03-20", status: "Enviado" },
      { id: "t2", date: "2024-03-25", status: "RRHH", daysInStage: 5 },
      { id: "t3", date: "2024-04-02", status: "Entrevista Técnica", daysInStage: 8 },
      { id: "t4", date: "2024-04-10", status: "RRHH", note: "Segunda entrevista — cultura organizacional", daysInStage: 8 },
      { id: "t5", date: "2024-05-05", status: "Oferta", note: "Oferta formal recibida por email", daysInStage: 25 },
    ],
  },
  {
    id: "app-5",
    company: "Auth0 / Okta",
    role: "Software Engineer II",
    status: "Enviado",
    cvVersion: "v2.1 — React + TypeScript",
    appliedDate: "2024-05-06",
    lastUpdated: "2024-05-06",
    techStack: ["React", "TypeScript", "Go", "Terraform"],
    salary: "USD 5.500–7.000",
    location: "Remoto LATAM",
    source: "LinkedIn",
    timeline: [
      { id: "t1", date: "2024-05-06", status: "Enviado", note: "Aplicación enviada. Follow-up programado." },
    ],
  },
  {
    id: "app-6",
    company: "Naranja X",
    role: "React Developer",
    status: "Archivado",
    cvVersion: "v1.0 — Fullstack General",
    appliedDate: "2024-02-15",
    lastUpdated: "2024-03-01",
    techStack: ["React", "Redux", "Node.js"],
    notes: "Proceso cancelado por la empresa.",
    location: "Córdoba",
    source: "Indeed",
    archived: true,
    timeline: [
      { id: "t1", date: "2024-02-15", status: "Enviado" },
      { id: "t2", date: "2024-02-20", status: "RRHH", daysInStage: 5 },
      { id: "t3", date: "2024-03-01", status: "Archivado", note: "Proceso cancelado por freeze de hiring", daysInStage: 9 },
    ],
  },
  {
    id: "app-7",
    company: "Ualá",
    role: "Senior React Engineer",
    status: "Entrevista Técnica",
    cvVersion: "v2.0 — Frontend Focused",
    appliedDate: "2024-05-01",
    lastUpdated: "2024-05-08",
    recruiter: { name: "Diego Morales", email: "d.morales@uala.ar" },
    techStack: ["React", "TypeScript", "Kotlin", "Microservices"],
    salary: "USD 4.500–5.500",
    location: "Buenos Aires (Híbrido)",
    source: "LinkedIn",
    timeline: [
      { id: "t1", date: "2024-05-01", status: "Enviado" },
      { id: "t2", date: "2024-05-05", status: "RRHH", daysInStage: 4 },
      { id: "t3", date: "2024-05-08", status: "Entrevista Técnica", note: "System design interview - next week", daysInStage: 3 },
    ],
  },
  {
    id: "app-8",
    company: "Bitso",
    role: "Frontend Engineer",
    status: "Rechazado",
    cvVersion: "v2.0 — Frontend Focused",
    appliedDate: "2024-04-01",
    lastUpdated: "2024-04-15",
    techStack: ["React", "TypeScript", "Web3", "GraphQL"],
    notes: "Feedback: falta experiencia en Web3 / blockchain.",
    location: "Remoto",
    source: "AngelList",
    timeline: [
      { id: "t1", date: "2024-04-01", status: "Enviado" },
      { id: "t2", date: "2024-04-07", status: "Entrevista Técnica", daysInStage: 6 },
      { id: "t3", date: "2024-04-15", status: "Rechazado", note: "Feedback: Web3 experience required", daysInStage: 8 },
    ],
  },
];

export const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string; dot: string }> = {
  Enviado:             { label: "Enviado",             color: "text-blue-400",   bg: "bg-blue-400/10",   dot: "bg-blue-400" },
  "Entrevista Técnica":{ label: "Entrevista Técnica",  color: "text-amber-400",  bg: "bg-amber-400/10",  dot: "bg-amber-400" },
  RRHH:                { label: "RRHH",                color: "text-cyan-400",   bg: "bg-cyan-400/10",   dot: "bg-cyan-400" },
  Oferta:              { label: "Oferta",              color: "text-emerald-400",bg: "bg-emerald-400/10",dot: "bg-emerald-400" },
  Rechazado:           { label: "Rechazado",           color: "text-red-400",    bg: "bg-red-400/10",    dot: "bg-red-400" },
  Archivado:           { label: "Archivado",           color: "text-zinc-500",   bg: "bg-zinc-500/10",   dot: "bg-zinc-500" },
};

export const PIPELINE_STAGES: ApplicationStatus[] = [
  "Enviado",
  "RRHH",
  "Entrevista Técnica",
  "Oferta",
  "Rechazado",
];
