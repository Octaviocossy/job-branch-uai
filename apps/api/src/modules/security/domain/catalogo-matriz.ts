import { Formulario } from "./formulario";
import { Modulo } from "./modulo";

/**
 * Seed catalog of the permission matrix (pure data). `SincronizarMatrizUseCase` writes it to the
 * database at boot and in the seed script; the role factories read it to define each role's default
 * roots. The ids below are permanent: they are how a sync recognises a row it already wrote, so
 * never change one and never reuse one for another row.
 *
 * Acciones are keyed by `codigoAccion`. There is one per protected endpoint (decision 25); only
 * register, login and health are public. They are seeded ahead of the endpoints that do not exist
 * yet (the session and matrix-administration slices add those), so every role tree is complete from
 * the start.
 */

/** A use case of the spec, e.g. `CU-02`. */
export type CasoDeUso = `CU-${number}`;

export interface GrupoDefinicion {
  id: string;
  nombre: string;
  descripcion: string;
  padreId: string | null;
}

export interface AccionDefinicion {
  codigoAccion: string;
  nombre: string;
  formularioId: string;
  /** Id of the default group the Accion is first seeded under; a later move by an Administrador survives a re-sync. */
  grupoPorDefecto: string;
  /** The use cases the Accion traces to. */
  cu: readonly CasoDeUso[];
}

// Modulos: the web sections.
const modulosPorClave = {
  CUENTA: new Modulo("57d02c74-e206-46f7-b002-16b895f66627", "Cuenta"),
  PIPELINE: new Modulo("e405c7fe-07df-41bf-9936-39caf0e6beac", "Pipeline"),
  PERFILES: new Modulo("f640464b-55ff-4059-a0f7-f3843f5884cc", "Perfiles CV"),
  ANALITICA: new Modulo("1001938c-52b5-49c3-a061-dd62947a965b", "Analítica"),
  SEGUIMIENTO: new Modulo("ccc8558d-63db-4bca-82f5-42f15d8312f9", "Seguimiento"),
  ADMINISTRACION: new Modulo("2ba23030-23da-4bca-a5db-39c1fcded489", "Administración"),
};

// Formularios: a screen or form (decision 25).
const formulariosPorClave = {
  SESION: new Formulario("cb1369b0-9ff2-4ef8-84f8-f1228bdb88dc", "Sesión", modulosPorClave.CUENTA.id),
  MIS_PERMISOS: new Formulario("2fe090f9-c46c-4f3e-b15e-067a7bb5f648", "Mis permisos", modulosPorClave.CUENTA.id),
  TABLERO: new Formulario("44d58bd3-ba12-4d93-aefa-cd730033ffbc", "Tablero", modulosPorClave.PIPELINE.id),
  NUEVA_RAMA: new Formulario("0993a76a-0ca8-434b-a9df-e3f9b7c2e3a3", "Nueva rama", modulosPorClave.PIPELINE.id),
  DETALLE_RAMA: new Formulario("e531e9e6-ccd5-46ab-a6c9-881f3b8d471d", "Detalle de rama", modulosPorClave.PIPELINE.id),
  REPOSITORIO_PERFILES: new Formulario("fe9ff9ee-5327-4654-82f6-5687e189dff7", "Repositorio de perfiles", modulosPorClave.PERFILES.id),
  NUEVA_VERSION: new Formulario("f5ff82a3-1648-4842-8d28-4165bebe7068", "Nueva versión", modulosPorClave.PERFILES.id),
  PANEL_ANALITICA: new Formulario("5404edb2-bcfe-4538-bebf-619981607187", "Panel de analítica", modulosPorClave.ANALITICA.id),
  FOLLOWUP: new Formulario("2663b3d6-f85d-44f5-a1f6-2fb08129c3ca", "Follow-up", modulosPorClave.SEGUIMIENTO.id),
  MATRIZ_PERMISOS: new Formulario("64e43109-41d0-4e09-82fd-436f9d4516ec", "Matriz de permisos", modulosPorClave.ADMINISTRACION.id),
  USUARIOS: new Formulario("461c9ef2-a8d6-4f39-b4d6-e7b8a546be3f", "Usuarios", modulosPorClave.ADMINISTRACION.id),
};

export const MODULOS: readonly Modulo[] = Object.values(modulosPorClave);

export const FORMULARIOS: readonly Formulario[] = Object.values(formulariosPorClave);

const PIPELINE_ID = "ad253ccd-56be-49d1-a9b2-f2eb40dfc02b";

/**
 * Default groups. They are shared and each has at most one parent, so a role's default is a set of
 * these as roots (invariant 12), keyed by the symbolic names the factories use.
 */
export const GRUPOS = {
  CUENTA: { id: "3ac37d78-71f1-4007-98a0-2720c35c7bdf", nombre: "Cuenta", descripcion: "Own session and permissions (CU-14)", padreId: null },
  PIPELINE: { id: PIPELINE_ID, nombre: "Pipeline", descripcion: "Application-branch management (CU-02, CU-06–CU-09)", padreId: null },
  PIPELINE_TABLERO: { id: "0d8b0f29-0611-43fe-8f49-434c0ce4dcc9", nombre: "Tablero", descripcion: "CU-06", padreId: PIPELINE_ID },
  PIPELINE_CREAR: { id: "83119203-88f1-479c-8c36-dbbb51d3aa4a", nombre: "Crear rama", descripcion: "CU-02", padreId: PIPELINE_ID },
  PIPELINE_CLONAR: { id: "8fcd1205-d917-4e0f-b627-74b64805af48", nombre: "Clonar rama", descripcion: "CU-07", padreId: PIPELINE_ID },
  PIPELINE_HITOS: { id: "73f661dc-d2aa-4960-85c8-a332e591bb69", nombre: "Hitos y feedback", descripcion: "CU-08", padreId: PIPELINE_ID },
  PIPELINE_ARCHIVAR: { id: "f7879bb9-3eab-4300-8794-6407e3c84de5", nombre: "Archivar rama", descripcion: "CU-09", padreId: PIPELINE_ID },
  PERFILES: { id: "2ca7ffcb-a3c5-416a-975b-1639f66e7fd2", nombre: "Perfiles CV", descripcion: "CU-16", padreId: null },
  ANALITICA: { id: "8bc531b5-160d-48e2-96c6-9ffe202a2d8d", nombre: "Analítica", descripcion: "CU-10, CU-11", padreId: null },
  SEGUIMIENTO: { id: "90c270d4-827c-40f2-8641-bc4de0bfb298", nombre: "Seguimiento", descripcion: "CU-13", padreId: null },
  ADMIN_PERMISOS: { id: "39103bbc-c87a-4f84-bf0d-a555df7764d3", nombre: "Administración de permisos", descripcion: "CU-15", padreId: null },
  ADMIN_USUARIOS: { id: "198429e6-de1e-4cc8-8edb-2cc12dcc6f3a", nombre: "Administración de usuarios", descripcion: "Administration of ListaUsuarios (CU-15)", padreId: null },
} satisfies Record<string, GrupoDefinicion>;

/** One Accion per protected endpoint, 29 in all; the endpoints that do not exist yet land with later slices. */
export const ACCIONES: readonly AccionDefinicion[] = [
  { codigoAccion: "auth.me", nombre: "Ver perfil propio", formularioId: formulariosPorClave.SESION.id, grupoPorDefecto: GRUPOS.CUENTA.id, cu: ["CU-14"] },
  { codigoAccion: "auth.logout", nombre: "Cerrar sesión", formularioId: formulariosPorClave.SESION.id, grupoPorDefecto: GRUPOS.CUENTA.id, cu: ["CU-14"] },
  { codigoAccion: "security.viewMatrix", nombre: "Ver mis permisos", formularioId: formulariosPorClave.MIS_PERMISOS.id, grupoPorDefecto: GRUPOS.CUENTA.id, cu: ["CU-15"] },
  { codigoAccion: "branch.list", nombre: "Listar ramas", formularioId: formulariosPorClave.TABLERO.id, grupoPorDefecto: GRUPOS.PIPELINE_TABLERO.id, cu: ["CU-06"] },
  { codigoAccion: "branch.view", nombre: "Ver rama", formularioId: formulariosPorClave.DETALLE_RAMA.id, grupoPorDefecto: GRUPOS.PIPELINE_TABLERO.id, cu: ["CU-06"] },
  {
    codigoAccion: "branch.create",
    nombre: "Crear rama",
    formularioId: formulariosPorClave.NUEVA_RAMA.id,
    grupoPorDefecto: GRUPOS.PIPELINE_CREAR.id,
    cu: ["CU-02", "CU-12"], // CU-12: the recruiter contact travels with the new branch
  },
  { codigoAccion: "branch.clone", nombre: "Clonar rama", formularioId: formulariosPorClave.DETALLE_RAMA.id, grupoPorDefecto: GRUPOS.PIPELINE_CLONAR.id, cu: ["CU-07"] },
  { codigoAccion: "branch.addHito", nombre: "Registrar hito", formularioId: formulariosPorClave.DETALLE_RAMA.id, grupoPorDefecto: GRUPOS.PIPELINE_HITOS.id, cu: ["CU-08"] },
  { codigoAccion: "branch.addFeedback", nombre: "Registrar feedback", formularioId: formulariosPorClave.DETALLE_RAMA.id, grupoPorDefecto: GRUPOS.PIPELINE_HITOS.id, cu: ["CU-08"] },
  { codigoAccion: "branch.archive", nombre: "Archivar rama", formularioId: formulariosPorClave.DETALLE_RAMA.id, grupoPorDefecto: GRUPOS.PIPELINE_ARCHIVAR.id, cu: ["CU-09"] },
  { codigoAccion: "cv.list", nombre: "Listar versiones de CV", formularioId: formulariosPorClave.REPOSITORIO_PERFILES.id, grupoPorDefecto: GRUPOS.PERFILES.id, cu: ["CU-16"] },
  { codigoAccion: "cv.create", nombre: "Crear versión de CV", formularioId: formulariosPorClave.NUEVA_VERSION.id, grupoPorDefecto: GRUPOS.PERFILES.id, cu: ["CU-16"] },
  { codigoAccion: "cv.upload", nombre: "Subir archivo de CV", formularioId: formulariosPorClave.REPOSITORIO_PERFILES.id, grupoPorDefecto: GRUPOS.PERFILES.id, cu: ["CU-16"] },
  {
    codigoAccion: "cv.setOutput",
    nombre: "Definir perfil de salida",
    formularioId: formulariosPorClave.REPOSITORIO_PERFILES.id,
    grupoPorDefecto: GRUPOS.PERFILES.id,
    cu: ["CU-16"],
  },
  {
    codigoAccion: "cv.setSnapshotVacante",
    nombre: "Asociar vacante a una versión de CV",
    formularioId: formulariosPorClave.REPOSITORIO_PERFILES.id,
    grupoPorDefecto: GRUPOS.PERFILES.id,
    cu: ["CU-16"],
  },
  { codigoAccion: "cv.archive", nombre: "Archivar versión de CV", formularioId: formulariosPorClave.REPOSITORIO_PERFILES.id, grupoPorDefecto: GRUPOS.PERFILES.id, cu: ["CU-16"] },
  {
    codigoAccion: "analytics.overview",
    nombre: "Ver analítica",
    formularioId: formulariosPorClave.PANEL_ANALITICA.id,
    grupoPorDefecto: GRUPOS.ANALITICA.id,
    cu: ["CU-10", "CU-11"],
  },
  { codigoAccion: "followup.list", nombre: "Listar seguimientos", formularioId: formulariosPorClave.FOLLOWUP.id, grupoPorDefecto: GRUPOS.SEGUIMIENTO.id, cu: ["CU-13"] },
  { codigoAccion: "followup.resolve", nombre: "Resolver seguimiento", formularioId: formulariosPorClave.FOLLOWUP.id, grupoPorDefecto: GRUPOS.SEGUIMIENTO.id, cu: ["CU-13"] },
  {
    codigoAccion: "security.viewCatalog",
    nombre: "Ver catálogo de acciones",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.listGroups",
    nombre: "Listar grupos de permisos",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.createGroup",
    nombre: "Crear grupo de permisos",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.updateGroup",
    nombre: "Editar grupo de permisos",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.deleteGroup",
    nombre: "Eliminar grupo de permisos",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.listPersonas",
    nombre: "Listar personas",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.assignRoot",
    nombre: "Asignar raíz a una persona",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  {
    codigoAccion: "security.removeRoot",
    nombre: "Quitar raíz de una persona",
    formularioId: formulariosPorClave.MATRIZ_PERMISOS.id,
    grupoPorDefecto: GRUPOS.ADMIN_PERMISOS.id,
    cu: ["CU-15"],
  },
  { codigoAccion: "usuario.list", nombre: "Listar usuarios", formularioId: formulariosPorClave.USUARIOS.id, grupoPorDefecto: GRUPOS.ADMIN_USUARIOS.id, cu: ["CU-15"] },
  { codigoAccion: "usuario.view", nombre: "Ver usuario", formularioId: formulariosPorClave.USUARIOS.id, grupoPorDefecto: GRUPOS.ADMIN_USUARIOS.id, cu: ["CU-15"] },
];

const TODOS_LOS_GRUPOS: readonly GrupoDefinicion[] = Object.values(GRUPOS);

export function grupoPorId(id: string): GrupoDefinicion {
  const grupo = TODOS_LOS_GRUPOS.find((candidato) => candidato.id === id);

  if (!grupo) {
    throw new Error(`Unknown default group ${id}`);
  }

  return grupo;
}

export function subgruposDe(grupo: GrupoDefinicion): GrupoDefinicion[] {
  return TODOS_LOS_GRUPOS.filter((candidato) => candidato.padreId === grupo.id);
}

/** The group followed by every group below it, each parent before its children. */
export function conDescendientes(grupo: GrupoDefinicion): GrupoDefinicion[] {
  return [grupo, ...subgruposDe(grupo).flatMap(conDescendientes)];
}

/** The Acciones first seeded directly under the group. */
export function accionesPorDefectoDe(grupo: GrupoDefinicion): AccionDefinicion[] {
  return ACCIONES.filter((accion) => accion.grupoPorDefecto === grupo.id);
}
