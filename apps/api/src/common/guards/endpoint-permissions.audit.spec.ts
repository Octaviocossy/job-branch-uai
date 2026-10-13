import "reflect-metadata";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { beforeAll, describe, expect, it } from "vitest";
import { ACCIONES } from "../../modules/security/domain/catalogo-matriz";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";
import { PermissionsGuard } from "./permissions.guard";

/** The only endpoints invariant 10 exempts. */
const PUBLICOS = new Set(["AuthController.register", "AuthController.login", "HealthController.check"]);

const MODULES_DIR = join(__dirname, "../../modules");

interface Endpoint {
  /** `ClassName.method`. */
  nombre: string;
  codigo: string | undefined;
  /** Class-level guards followed by method-level ones, the order Nest runs them in. */
  guards: readonly unknown[];
}

/** Every `*.controller.ts` under `src/modules`, so a controller added later is audited without editing this spec. */
function archivosDeControladores(): string[] {
  return readdirSync(MODULES_DIR, { recursive: true, encoding: "utf8" })
    .filter((archivo) => archivo.endsWith(".controller.ts"))
    .map((archivo) => join(MODULES_DIR, archivo))
    .sort();
}

/** A class exported by a controller file; only those carrying `@Controller()` metadata are audited. */
type Controlador = { name: string; prototype: object };

function endpointsDe(controlador: Controlador): Endpoint[] {
  const guardsDeClase: unknown[] = Reflect.getMetadata(GUARDS_METADATA, controlador) ?? [];

  return Object.getOwnPropertyNames(controlador.prototype).flatMap((metodo) => {
    const handler = Object.getOwnPropertyDescriptor(controlador.prototype, metodo)?.value;

    // The HTTP verb is stored as an enum whose first member is 0, so test for presence, not truthiness.
    if (typeof handler !== "function" || Reflect.getMetadata(METHOD_METADATA, handler) === undefined) {
      return [];
    }

    const guardsDeMetodo: unknown[] = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];

    return [{ nombre: `${controlador.name}.${metodo}`, codigo: Reflect.getMetadata(REQUIERE_ACCION_KEY, handler), guards: [...guardsDeClase, ...guardsDeMetodo] }];
  });
}

describe("endpoint permissions audit (invariant 10)", () => {
  let endpoints: Endpoint[] = [];

  beforeAll(async () => {
    const modulos = await Promise.all(archivosDeControladores().map((archivo) => import(archivo) as Promise<Record<string, unknown>>));
    const controladores = modulos.flatMap((modulo) =>
      Object.values(modulo).filter((exportado): exportado is Controlador => typeof exportado === "function" && Reflect.hasMetadata(PATH_METADATA, exportado)),
    );

    endpoints = controladores.flatMap(endpointsDe);
  }, 60_000);

  const protegidos = () => endpoints.filter((endpoint) => !PUBLICOS.has(endpoint.nombre));

  it("finds the public handlers, and only they carry no code", () => {
    const publicos = endpoints.filter((endpoint) => PUBLICOS.has(endpoint.nombre));

    expect(publicos.map((endpoint) => endpoint.nombre).sort()).toEqual([...PUBLICOS].sort());
    expect(publicos.filter((endpoint) => endpoint.codigo !== undefined).map((endpoint) => `${endpoint.nombre} -> ${endpoint.codigo}`)).toEqual([]);
  });

  it("gives every other handler a code", () => {
    expect(
      protegidos()
        .filter((endpoint) => !endpoint.codigo)
        .map((endpoint) => `${endpoint.nombre} has no @RequiereAccion`),
    ).toEqual([]);
  });

  it("guards every other handler with JwtAuthGuard and then PermissionsGuard", () => {
    const sinGuards = protegidos()
      .filter((endpoint) => {
        const jwt = endpoint.guards.indexOf(JwtAuthGuard);
        const permisos = endpoint.guards.indexOf(PermissionsGuard);

        return jwt === -1 || permisos === -1 || jwt > permisos;
      })
      .map((endpoint) => `${endpoint.nombre} must run JwtAuthGuard before PermissionsGuard`);

    expect(sinGuards).toEqual([]);
  });

  it("maps every handler's code to an Accion of the catalog", () => {
    const catalogo = new Set(ACCIONES.map((accion) => accion.codigoAccion));

    expect(
      protegidos()
        .filter((endpoint) => endpoint.codigo && !catalogo.has(endpoint.codigo))
        .map((endpoint) => `${endpoint.nombre} uses ${endpoint.codigo}, which is not in ACCIONES`),
    ).toEqual([]);
  });

  it("uses no code on two handlers", () => {
    const conCodigo = protegidos().filter((endpoint) => endpoint.codigo);
    const repetidos = [...new Set(conCodigo.map((endpoint) => endpoint.codigo))].flatMap((codigo) => {
      const usados = conCodigo.filter((endpoint) => endpoint.codigo === codigo);

      return usados.length > 1 ? [`${codigo} is shared by ${usados.map((endpoint) => endpoint.nombre).join(", ")}`] : [];
    });

    expect(repetidos).toEqual([]);
  });

  it("serves every Accion of the catalog from exactly one handler: 29 codes, 29 handlers", () => {
    const usados = protegidos().map((endpoint) => endpoint.codigo);
    const sinHandler = ACCIONES.map((accion) => accion.codigoAccion).filter((codigo) => !usados.includes(codigo));

    expect(sinHandler.map((codigo) => `${codigo} has no handler`)).toEqual([]);
    expect(ACCIONES).toHaveLength(29);
    expect(protegidos()).toHaveLength(29);
  });
});
