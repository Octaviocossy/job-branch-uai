import { describe, expect, it } from "vitest";
import { codigoParaRuta, primeraRutaPermitida } from "./permissions.config";

const ADMINISTRADOR_CODES = ["auth.me", "auth.logout", "security.viewMatrix", "security.viewCatalog", "security.listGroups", "usuario.list"];
const POSTULANTE_CODES = ["auth.me", "auth.logout", "branch.list", "branch.view", "analytics.overview", "followup.list", "cv.list"];

describe("codigoParaRuta", () => {
  it("returns the code of an exact route", () => {
    expect(codigoParaRuta("/")).toBe("branch.list");
    expect(codigoParaRuta("/branches")).toBe("branch.list");
    expect(codigoParaRuta("/admin/permisos")).toBe("security.listGroups");
  });

  it("matches a dynamic segment against any single segment", () => {
    expect(codigoParaRuta("/branches/abc")).toBe("branch.view");
  });

  it("does not let a dynamic segment span several segments", () => {
    expect(codigoParaRuta("/branches/abc/extra")).toBeUndefined();
  });

  it("returns undefined for a route outside the map", () => {
    expect(codigoParaRuta("/signin")).toBeUndefined();
    expect(codigoParaRuta("/admin")).toBeUndefined();
  });
});

describe("primeraRutaPermitida", () => {
  it("lands an Administrador on the permissions screen", () => {
    expect(primeraRutaPermitida(new Set(ADMINISTRADOR_CODES))).toBe("/admin/permisos");
  });

  it("lands a Postulante on the dashboard", () => {
    expect(primeraRutaPermitida(new Set(POSTULANTE_CODES))).toBe("/");
  });

  it("returns undefined when no nav route is allowed", () => {
    expect(primeraRutaPermitida(new Set(["auth.me"]))).toBeUndefined();
  });
});
