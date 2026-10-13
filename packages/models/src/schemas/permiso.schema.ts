import { z } from "zod";
import { personaTipoSchema } from "./persona.schema";

export const accionResumenSchema = z.object({
  id: z.uuid(),
  codigoAccion: z.string().min(1),
  nombre: z.string().min(1),
});

/** An Accion of the catalog with the group that currently holds it (`null` when parentless). */
export const accionCatalogoSchema = accionResumenSchema.extend({
  grupo: z.object({ id: z.uuid(), nombre: z.string() }).nullable(),
});

export const formularioCatalogoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  acciones: z.array(accionCatalogoSchema),
});

export const moduloCatalogoSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  formularios: z.array(formularioCatalogoSchema),
});

/** `GET /security/catalog`: every Accion grouped by Modulo and Formulario. */
export const catalogoMatrizSchema = z.array(moduloCatalogoSchema);

/** `GET /security/matrix`: the caller's own permitted Acciones grouped by Modulo and Formulario (decision 21). */
export const permissionMatrixSchema = z.object({
  role: personaTipoSchema,
  modulos: z.array(
    z.object({
      id: z.uuid(),
      nombre: z.string(),
      formularios: z.array(z.object({ id: z.uuid(), nombre: z.string(), acciones: z.array(accionResumenSchema) })),
    }),
  ),
});

export const componenteResumenSchema = z.object({
  id: z.uuid(),
  tipo: z.enum(["grupo", "accion"]),
  nombre: z.string(),
  codigoAccion: z.string().nullable(),
});

export const grupoPermisosSchema = z.object({
  id: z.uuid(),
  nombre: z.string().min(1),
  descripcion: z.string().nullable(),
  padreId: z.uuid().nullable(),
  hijos: z.array(componenteResumenSchema),
  /** How many Personas hold this group as a root. */
  personasConRaiz: z.number().int().min(0),
});

const grupoPermisosCamposSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().nullable().optional(),
  padreId: z.uuid().nullable().optional(),
});

export const createGrupoPermisosSchema = grupoPermisosCamposSchema.extend({
  hijoIds: z.array(z.uuid()).default([]),
});

// Built from the fields, not from `createGrupoPermisosSchema.partial()`: Zod 4 applies a default inside an
// optional, so a PATCH without `hijoIds` would parse to `[]` and empty the group.
export const updateGrupoPermisosSchema = grupoPermisosCamposSchema.partial().extend({
  hijoIds: z.array(z.uuid()).optional(),
});

export const personaRaicesSchema = z.object({
  personaId: z.uuid(),
  tipo: personaTipoSchema,
  usuario: z.object({ id: z.uuid(), email: z.email(), nombreCompleto: z.string() }),
  raices: z.array(z.object({ id: z.uuid(), nombre: z.string(), tipo: z.enum(["grupo", "accion"]) })),
});

export const asignarRaizSchema = z.object({ componenteId: z.uuid() });

export type AccionResumen = z.infer<typeof accionResumenSchema>;
export type AccionCatalogo = z.infer<typeof accionCatalogoSchema>;
export type FormularioCatalogo = z.infer<typeof formularioCatalogoSchema>;
export type ModuloCatalogo = z.infer<typeof moduloCatalogoSchema>;
export type CatalogoMatriz = z.infer<typeof catalogoMatrizSchema>;
export type PermissionMatrix = z.infer<typeof permissionMatrixSchema>;
export type ComponenteResumen = z.infer<typeof componenteResumenSchema>;
export type GrupoPermisos = z.infer<typeof grupoPermisosSchema>;
export type CreateGrupoPermisosInput = z.infer<typeof createGrupoPermisosSchema>;
export type UpdateGrupoPermisosInput = z.infer<typeof updateGrupoPermisosSchema>;
export type PersonaRaices = z.infer<typeof personaRaicesSchema>;
export type AsignarRaizInput = z.infer<typeof asignarRaizSchema>;
