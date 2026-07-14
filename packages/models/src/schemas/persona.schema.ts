import { z } from "zod";

export const personaTipoSchema = z.enum(["recruiter", "postulante"]);

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

export const personaSchema = z.discriminatedUnion("tipo", [personaRecruiterSchema, postulanteSchema]);
export const createPersonaSchema = z.discriminatedUnion("tipo", [personaRecruiterSchema.omit({ id: true }), postulanteSchema.omit({ id: true })]);

export type PersonaTipo = z.infer<typeof personaTipoSchema>;
export type PersonaRecruiter = z.infer<typeof personaRecruiterSchema>;
export type Postulante = z.infer<typeof postulanteSchema>;
export type Persona = z.infer<typeof personaSchema>;
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
