import { z } from "zod";

export const personaTipoSchema = z.enum(["recruiter", "postulante", "administrador"]);

const personaBaseSchema = z.object({
  id: z.uuid(),
  usuarioId: z.uuid(),
  puestoCorporativo: z.string().nullable(),
});

// Named `personaRecruiterSchema`/`PersonaRecruiter` (not `recruiterSchema`/`Recruiter`) to avoid
// colliding with application.schema.ts's `Recruiter` (the Application's embedded recruiter-contact
// view-model, consumed by apps/api's branch repository) — the two `export *` barrel entries would
// otherwise be ambiguous.
export const personaRecruiterSchema = personaBaseSchema.extend({
  tipo: z.literal("recruiter"),
  perNombre: z.string().min(1),
  perApellido: z.string().min(1),
  fechaContratacion: z.iso.date(),
});

export const postulanteSchema = personaBaseSchema.extend({
  tipo: z.literal("postulante"),
  habilidadesMaster: z.array(z.string()),
});

// The third Persona subtype (SPEC 18.10). Only the seed creates one: `registerRoleSchema` (auth.schema.ts)
// deliberately excludes it, so no registration can choose it (invariant 2).
export const administradorSchema = personaBaseSchema.extend({
  tipo: z.literal("administrador"),
});

export const personaSchema = z.discriminatedUnion("tipo", [personaRecruiterSchema, postulanteSchema, administradorSchema]);
export const createPersonaSchema = z.discriminatedUnion("tipo", [
  personaRecruiterSchema.omit({ id: true }),
  postulanteSchema.omit({ id: true }),
  administradorSchema.omit({ id: true }),
]);

export type PersonaTipo = z.infer<typeof personaTipoSchema>;
export type PersonaRecruiter = z.infer<typeof personaRecruiterSchema>;
export type Postulante = z.infer<typeof postulanteSchema>;
export type Administrador = z.infer<typeof administradorSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
