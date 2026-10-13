import { RequestMethod } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { REQUIERE_ACCION_KEY } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { ACCIONES } from "../domain/catalogo-matriz";
import { AdministracionMatrizController } from "./administracion-matriz.controller";

const rutas = {
  catalog: { metodo: RequestMethod.GET, ruta: "catalog", accion: "security.viewCatalog" },
  listGroups: { metodo: RequestMethod.GET, ruta: "groups", accion: "security.listGroups" },
  createGroup: { metodo: RequestMethod.POST, ruta: "groups", accion: "security.createGroup" },
  updateGroup: { metodo: RequestMethod.PATCH, ruta: "groups/:id", accion: "security.updateGroup" },
  deleteGroup: { metodo: RequestMethod.DELETE, ruta: "groups/:id", accion: "security.deleteGroup" },
  listPersonas: { metodo: RequestMethod.GET, ruta: "personas", accion: "security.listPersonas" },
  assignRoot: { metodo: RequestMethod.POST, ruta: "personas/:personaId/roots", accion: "security.assignRoot" },
  removeRoot: { metodo: RequestMethod.DELETE, ruta: "personas/:personaId/roots/:componenteId", accion: "security.removeRoot" },
} as const;

type Handler = keyof typeof rutas;

const handler = (nombre: Handler): object => AdministracionMatrizController.prototype[nombre];

describe("AdministracionMatrizController", () => {
  it("serves the controller under /security behind the JWT and permission guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdministracionMatrizController)).toBe("security");
    expect(Reflect.getMetadata(GUARDS_METADATA, AdministracionMatrizController)).toEqual([JwtAuthGuard, PermissionsGuard]);
  });

  it.each(Object.entries(rutas))("%s is routed and carries its own Accion", (nombre, { metodo, ruta, accion }) => {
    expect(Reflect.getMetadata(METHOD_METADATA, handler(nombre as Handler))).toBe(metodo);
    expect(Reflect.getMetadata(PATH_METADATA, handler(nombre as Handler))).toBe(ruta);
    expect(Reflect.getMetadata(REQUIERE_ACCION_KEY, handler(nombre as Handler))).toBe(accion);
  });

  it("leaves no route handler without an Accion, which PermissionsGuard would let through", () => {
    const handlers = Object.getOwnPropertyNames(AdministracionMatrizController.prototype).filter((nombre) => nombre !== "constructor");

    expect(handlers.sort()).toEqual(Object.keys(rutas).sort());
  });

  it("only requires Acciones the seed catalog defines", () => {
    const codigos = new Set(ACCIONES.map(({ codigoAccion }) => codigoAccion));

    for (const { accion } of Object.values(rutas)) {
      expect(codigos.has(accion)).toBe(true);
    }
  });
});
