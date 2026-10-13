import { describe, expect, it, vi } from "vitest";
import { ACCIONES, GRUPOS, type GrupoDefinicion } from "../../domain/catalogo-matriz";
import type { ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { ContextoSeguridad } from "../../domain/contexto-seguridad";
import { GrupoPermisos } from "../../domain/grupo-permisos";
import { AdministradorMatrizFactory, crearFactories, type MatrizPermisosFactory, PostulanteMatrizFactory, RecruiterMatrizFactory } from "./matriz-permisos.factory";

const makeRepository = () =>
  ({
    sincronizarModulosYFormularios: vi.fn(),
    asegurarGrupos: vi.fn(),
    sincronizarAcciones: vi.fn(),
    findArbolByPersona: vi.fn(),
    asignarRaices: vi.fn(),
    listarPersonasSinRaices: vi.fn(),
  }) as unknown as ComponentePermisoRepository;

const CODIGOS = ACCIONES.map((accion) => accion.codigoAccion);

const conPrefijo = (...prefijos: string[]) => CODIGOS.filter((codigo) => prefijos.some((prefijo) => codigo.startsWith(prefijo)));

/** The ContextoSeguridad of a Persona holding the factory's default roots, wrapped like `ResolverPermisosUseCase` does. */
function contextoDe(factory: MatrizPermisosFactory): ContextoSeguridad {
  const raices = new GrupoPermisos("persona:test", "Raíces de la Persona");

  for (const raiz of factory.crear()) {
    raices.agregar(raiz);
  }

  return new ContextoSeguridad(raices);
}

function accionesDe(factory: MatrizPermisosFactory): string[] {
  return contextoDe(factory).listarAcciones().sort();
}

// The nine codes the Postulante could use before the persisted matrix (decision-29 regression guard).
const POSTULANTE_ACCIONES_PREVIAS = [
  "auth.me",
  "security.viewMatrix",
  "branch.create",
  "branch.clone",
  "branch.archive",
  "cv.create",
  "cv.upload",
  "cv.setOutput",
  "followup.resolve",
];

describe("PostulanteMatrizFactory", () => {
  const factory = new PostulanteMatrizFactory(makeRepository());

  it("keeps the 9 codes the Postulante had before the persisted matrix", () => {
    const acciones = accionesDe(factory);

    for (const codigo of POSTULANTE_ACCIONES_PREVIAS) {
      expect(acciones, codigo).toContain(codigo);
    }
  });

  it("holds every branch.*, cv.*, followup.* and analytics.overview code, plus the account", () => {
    expect(accionesDe(factory)).toEqual(conPrefijo("auth.", "security.viewMatrix", "branch.", "cv.", "followup.", "analytics.").sort());
  });

  it("holds no matrix-administration or usuario.* code", () => {
    const acciones = accionesDe(factory);

    expect(acciones.filter((codigo) => codigo.startsWith("usuario."))).toEqual([]);
    expect(acciones.filter((codigo) => codigo.startsWith("security.") && codigo !== "security.viewMatrix")).toEqual([]);
  });

  it("is scoped by role: it cannot do what only an Administrador can (BR-4)", () => {
    const contexto = contextoDe(factory);

    expect(contexto.tienePermiso("branch.create")).toBe(true);
    expect(contexto.tienePermiso("security.createGroup")).toBe(false);
  });

  it("has the five default roots, in a stable order", () => {
    expect(factory.raicesPorDefecto()).toEqual([GRUPOS.CUENTA.id, GRUPOS.PERFILES.id, GRUPOS.ANALITICA.id, GRUPOS.PIPELINE.id, GRUPOS.SEGUIMIENTO.id]);
  });
});

describe("RecruiterMatrizFactory", () => {
  const factory = new RecruiterMatrizFactory(makeRepository());

  it("holds every branch.*, followup.*, analytics.overview, auth.* and security.viewMatrix code", () => {
    expect(accionesDe(factory)).toEqual(conPrefijo("auth.", "security.viewMatrix", "branch.", "followup.", "analytics.").sort());
  });

  it("holds no cv.* code", () => {
    expect(accionesDe(factory).filter((codigo) => codigo.startsWith("cv."))).toEqual([]);
  });

  it("holds no matrix-administration or usuario.* code", () => {
    const acciones = accionesDe(factory);

    expect(acciones.filter((codigo) => codigo.startsWith("usuario."))).toEqual([]);
    expect(acciones.filter((codigo) => codigo.startsWith("security.") && codigo !== "security.viewMatrix")).toEqual([]);
  });
});

describe("AdministradorMatrizFactory", () => {
  const factory = new AdministradorMatrizFactory(makeRepository());

  it("holds auth.*, security.* and usuario.* only", () => {
    expect(accionesDe(factory)).toEqual(conPrefijo("auth.", "security.", "usuario.").sort());
  });

  it("holds no branch.*, cv.*, followup.* or analytics.* code", () => {
    expect(accionesDe(factory).filter((codigo) => /^(branch|cv|followup|analytics)\./.test(codigo))).toEqual([]);
  });
});

describe("MatrizPermisosFactory", () => {
  it("crearFactories builds one factory per role, each reporting its own tipo", () => {
    const factories = crearFactories(makeRepository());

    expect(factories.postulante).toBeInstanceOf(PostulanteMatrizFactory);
    expect(factories.recruiter).toBeInstanceOf(RecruiterMatrizFactory);
    expect(factories.administrador).toBeInstanceOf(AdministradorMatrizFactory);
    expect(Object.entries(factories).map(([clave, factory]) => [clave, factory.tipo])).toEqual([
      ["postulante", "postulante"],
      ["recruiter", "recruiter"],
      ["administrador", "administrador"],
    ]);
  });

  it("reaches every default group through at least one factory's roots", () => {
    const factories = Object.values(crearFactories(makeRepository()));
    const grupos: GrupoDefinicion[] = Object.values(GRUPOS);
    const raices = new Set(factories.flatMap((factory) => factory.raicesPorDefecto()));
    const alcanzado = (grupo: GrupoDefinicion): boolean => raices.has(grupo.id) || grupos.some((padre) => padre.id === grupo.padreId && alcanzado(padre));

    for (const grupo of grupos) {
      expect(alcanzado(grupo), grupo.nombre).toBe(true);
    }
  });

  it("reaches every Accion through at least one factory", () => {
    const factories = Object.values(crearFactories(makeRepository()));
    const alcanzadas = new Set(factories.flatMap(accionesDe));

    expect([...alcanzadas].sort()).toEqual([...CODIGOS].sort());
  });

  it("otorgarRaices hands the Persona the role's default root ids", async () => {
    const repository = makeRepository();
    const factory = new RecruiterMatrizFactory(repository);

    await factory.otorgarRaices("persona-1");

    expect(repository.asignarRaices).toHaveBeenCalledWith("persona-1", factory.raicesPorDefecto());
  });

  it("sembrar seeds the role's root groups together with every descendant group", async () => {
    const repository = makeRepository();

    await new PostulanteMatrizFactory(repository).sembrar();

    const grupos = vi.mocked(repository.asegurarGrupos).mock.calls[0]?.[0] ?? [];
    expect(grupos.map((grupo) => grupo.id).sort()).toEqual(
      [
        GRUPOS.CUENTA,
        GRUPOS.PERFILES,
        GRUPOS.ANALITICA,
        GRUPOS.SEGUIMIENTO,
        GRUPOS.PIPELINE,
        GRUPOS.PIPELINE_TABLERO,
        GRUPOS.PIPELINE_CREAR,
        GRUPOS.PIPELINE_CLONAR,
        GRUPOS.PIPELINE_HITOS,
        GRUPOS.PIPELINE_ARCHIVAR,
      ]
        .map((grupo) => grupo.id)
        .sort(),
    );
  });

  it("sembrar never writes anything but groups", async () => {
    const repository = makeRepository();

    await new AdministradorMatrizFactory(repository).sembrar();

    expect(repository.sincronizarAcciones).not.toHaveBeenCalled();
    expect(repository.asignarRaices).not.toHaveBeenCalled();
  });
});
