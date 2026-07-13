import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { TERMINAL_STATUSES } from "../modules/branches/domain/terminal-statuses";
import * as schema from "./schema/index";

const DEMO_EMAIL = "demo@jobbranch.dev";
const DEMO_PASSWORD = "JobBranch#2024";

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;

const FOLLOWUP_DUE_DAYS = 7;
const FOLLOWUP_DAYS_INACTIVE = 7;

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const FEEDBACK_BY_COMPANY: Record<
  string,
  {
    hitoStatus: string;
    fechaEntrevista: string;
    tipoEntrevista: "tecnica" | "cultural";
    scoreTecnico: number;
    scoreCultura: number;
    comentarios: string;
    habilidadesFaltantes: string[];
  }
> = {
  "Mercado Libre": {
    hitoStatus: "Entrevista Técnica",
    fechaEntrevista: "2024-05-04",
    tipoEntrevista: "tecnica",
    scoreTecnico: 8,
    scoreCultura: 7,
    comentarios: "Buen manejo de React y TypeScript; resolvió con solidez los problemas de whiteboard.",
    habilidadesFaltantes: ["AWS avanzado"],
  },
  "Santander Tech": {
    hitoStatus: "Entrevista Técnica",
    fechaEntrevista: "2024-04-02",
    tipoEntrevista: "tecnica",
    scoreTecnico: 9,
    scoreCultura: 9,
    comentarios: "Entrevista técnica sólida; buen liderazgo demostrado en preguntas de arquitectura.",
    habilidadesFaltantes: [],
  },
  Ualá: {
    hitoStatus: "Entrevista Técnica",
    fechaEntrevista: "2024-05-08",
    tipoEntrevista: "tecnica",
    scoreTecnico: 7,
    scoreCultura: 8,
    comentarios: "Buen dominio de React; se sugiere reforzar microservicios y Kotlin en el backend.",
    habilidadesFaltantes: ["Kotlin", "Microservicios"],
  },
};

const CV_VERSIONS = [
  { name: "v1.0 — Fullstack General", focus: "General", tags: ["fullstack", "general"], estado: "disponible", esPerfilSalida: false, tamanioBytes: 245_760 },
  { name: "v2.0 — Frontend Focused", focus: "Frontend", tags: ["frontend"], estado: "disponible", esPerfilSalida: false, tamanioBytes: 268_120 },
  { name: "v2.1 — React + TypeScript", focus: "Frontend", tags: ["frontend", "react", "typescript"], estado: "seleccionado_salida", esPerfilSalida: true, tamanioBytes: 271_360 },
  { name: "v3.0 — Senior + Leadership", focus: "Senior", tags: ["senior", "leadership"], estado: "disponible", esPerfilSalida: false, tamanioBytes: 289_920 },
] as const;

const APPLICATIONS = [
  {
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
      { date: "2024-04-28", status: "Enviado", note: "Aplicación enviada vía LinkedIn" },
      { date: "2024-05-02", status: "RRHH", note: "Llamada con Laura García - 30 min", daysInStage: 4 },
      { date: "2024-05-04", status: "Entrevista Técnica", note: "Technical assessment enviado", daysInStage: 2 },
    ],
  },
  {
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
      { date: "2024-04-25", status: "Enviado", note: "Referido por ex-colega" },
      { date: "2024-05-01", status: "RRHH", note: "Email de coordinación recibido", daysInStage: 6 },
    ],
  },
  {
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
      { date: "2024-04-10", status: "Enviado" },
      { date: "2024-04-14", status: "RRHH", daysInStage: 4 },
      { date: "2024-04-18", status: "Entrevista Técnica", note: "Live coding en Java — dificultades", daysInStage: 4 },
      { date: "2024-04-22", status: "Rechazado", note: "Feedback: experiencia Java insuficiente", daysInStage: 4 },
    ],
  },
  {
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
      { date: "2024-03-20", status: "Enviado" },
      { date: "2024-03-25", status: "RRHH", daysInStage: 5 },
      { date: "2024-04-02", status: "Entrevista Técnica", daysInStage: 8 },
      { date: "2024-04-10", status: "RRHH", note: "Segunda entrevista — cultura organizacional", daysInStage: 8 },
      { date: "2024-05-05", status: "Oferta", note: "Oferta formal recibida por email", daysInStage: 25 },
    ],
  },
  {
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
    timeline: [{ date: "2024-05-06", status: "Enviado", note: "Aplicación enviada. Follow-up programado." }],
  },
  {
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
      { date: "2024-02-15", status: "Enviado" },
      { date: "2024-02-20", status: "RRHH", daysInStage: 5 },
      { date: "2024-03-01", status: "Archivado", note: "Proceso cancelado por freeze de hiring", daysInStage: 9 },
    ],
  },
  {
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
      { date: "2024-05-01", status: "Enviado" },
      { date: "2024-05-05", status: "RRHH", daysInStage: 4 },
      { date: "2024-05-08", status: "Entrevista Técnica", note: "System design interview - next week", daysInStage: 3 },
    ],
  },
  {
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
      { date: "2024-04-01", status: "Enviado" },
      { date: "2024-04-07", status: "Entrevista Técnica", daysInStage: 6 },
      { date: "2024-04-15", status: "Rechazado", note: "Feedback: Web3 experience required", daysInStage: 8 },
    ],
  },
] as const;

async function seedDemoUser(db: Executor) {
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL));

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      email: DEMO_EMAIL,
      displayName: "Demo Postulante",
      role: "postulante",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    })
    .returning();

  if (!created) {
    throw new Error("Failed to seed the demo user");
  }

  return created;
}

async function seedCvVersions(db: Executor, usuarioId: string) {
  const cvVersionsByName = new Map<string, string>();

  for (const cv of CV_VERSIONS) {
    const [row] = await db
      .insert(schema.cvVersions)
      .values({
        usuarioId,
        name: cv.name,
        focus: cv.focus,
        tags: [...cv.tags],
        esPerfilSalida: cv.esPerfilSalida,
        estado: cv.estado,
        tamanioBytes: cv.tamanioBytes,
      })
      .returning();

    if (!row) {
      throw new Error(`Failed to seed cv version ${cv.name}`);
    }

    cvVersionsByName.set(cv.name, row.id);
  }

  return cvVersionsByName;
}

async function seedApplications(db: Executor, usuarioId: string, cvVersionsByName: Map<string, string>) {
  let recordatorioCount = 0;
  let feedbackCount = 0;

  for (const application of APPLICATIONS) {
    const [empresa] = await db.insert(schema.empresas).values({ nombre: application.company, industria: "Tecnología" }).returning();

    if (!empresa) {
      throw new Error(`Failed to seed empresa for ${application.company}`);
    }

    const [vacante] = await db
      .insert(schema.vacantes)
      .values({
        titulo: application.role,
        descripcion: `Vacante de ${application.role} en ${application.company}.`,
        tecnologiasRequeridas: [...application.techStack],
        rangoSalarial: "salary" in application ? application.salary : "No especificado",
        empresaId: empresa.id,
      })
      .returning();

    if (!vacante) {
      throw new Error(`Failed to seed vacante for ${application.role}`);
    }

    const cvVersionId = cvVersionsByName.get(application.cvVersion);

    if (!cvVersionId) {
      throw new Error(`Unknown cv version ${application.cvVersion}`);
    }

    const recruiter = "recruiter" in application ? application.recruiter : undefined;

    const [rama] = await db
      .insert(schema.applications)
      .values({
        usuarioId,
        vacanteId: vacante.id,
        cvVersionId,
        status: application.status,
        appliedDate: application.appliedDate,
        lastUpdated: application.lastUpdated,
        recruiterName: recruiter?.name,
        recruiterLinkedin: recruiter && "linkedin" in recruiter ? recruiter.linkedin : undefined,
        recruiterEmail: recruiter && "email" in recruiter ? recruiter.email : undefined,
        techStack: [...application.techStack],
        notes: "notes" in application ? application.notes : undefined,
        salary: "salary" in application ? application.salary : undefined,
        location: "location" in application ? application.location : undefined,
        source: "source" in application ? application.source : undefined,
        archived: "archived" in application ? application.archived : false,
      })
      .returning();

    if (!rama) {
      throw new Error(`Failed to seed application for ${application.company}`);
    }

    const feedbackConfig = FEEDBACK_BY_COMPANY[application.company];

    for (const hito of application.timeline) {
      const [createdHito] = await db
        .insert(schema.hitos)
        .values({
          ramaId: rama.id,
          date: hito.date,
          status: hito.status,
          note: "note" in hito ? hito.note : undefined,
          daysInStage: "daysInStage" in hito ? hito.daysInStage : undefined,
        })
        .returning();

      if (!createdHito) {
        throw new Error(`Failed to seed hito for ${application.company}`);
      }

      if (feedbackConfig && hito.status === feedbackConfig.hitoStatus) {
        await db.insert(schema.feedback).values({
          hitoId: createdHito.id,
          fechaEntrevista: feedbackConfig.fechaEntrevista,
          tipoEntrevista: feedbackConfig.tipoEntrevista,
          scoreTecnico: feedbackConfig.scoreTecnico,
          scoreCultura: feedbackConfig.scoreCultura,
          comentarios: feedbackConfig.comentarios,
          habilidadesFaltantes: [...feedbackConfig.habilidadesFaltantes],
        });
        feedbackCount += 1;
      }
    }

    if (!TERMINAL_STATUSES.includes(rama.status as (typeof TERMINAL_STATUSES)[number])) {
      await db.insert(schema.recordatorios).values({
        ramaId: rama.id,
        fechaVencimiento: addDays(application.lastUpdated, FOLLOWUP_DUE_DAYS),
        diasInactividad: FOLLOWUP_DAYS_INACTIVE,
        estado: "pendiente",
      });
      recordatorioCount += 1;
    }
  }

  return { recordatorioCount, feedbackCount };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const { recordatorioCount, feedbackCount } = await db.transaction(async (tx) => {
    // Reverse FK order so re-running the seeder never duplicates rows; the demo user
    // itself stays stable via seedDemoUser's email guard.
    await tx.delete(schema.feedback);
    await tx.delete(schema.recordatorios);
    await tx.delete(schema.hitos);
    await tx.delete(schema.applications);
    await tx.delete(schema.vacantes);
    await tx.delete(schema.cvVersions);
    await tx.delete(schema.empresas);

    const demoUser = await seedDemoUser(tx);
    const cvVersionsByName = await seedCvVersions(tx, demoUser.id);
    return seedApplications(tx, demoUser.id, cvVersionsByName);
  });

  await pool.end();

  console.log(
    `Seeded demo user ${DEMO_EMAIL} with ${CV_VERSIONS.length} CV versions, ${APPLICATIONS.length} applications, ${recordatorioCount} recordatorios, and ${feedbackCount} feedback entries.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
