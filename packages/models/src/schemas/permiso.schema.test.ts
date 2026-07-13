import { describe, expect, it } from "vitest";
import { permissionMatrixSchema } from "./permiso.schema.js";

describe("permissionMatrixSchema", () => {
  const valid = { role: "postulante", acciones: ["branch.create", "cv.create"] };

  it("parses a valid permission matrix unchanged", () => {
    expect(permissionMatrixSchema.parse(valid)).toEqual(valid);
  });

  it("accepts an empty acciones array", () => {
    expect(permissionMatrixSchema.safeParse({ ...valid, acciones: [] }).success).toBe(true);
  });

  it("rejects a role outside postulante/recruiter", () => {
    const result = permissionMatrixSchema.safeParse({ ...valid, role: "admin" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("role");
    }
  });

  it("rejects a non-string accion entry", () => {
    expect(permissionMatrixSchema.safeParse({ ...valid, acciones: [1] }).success).toBe(false);
  });

  it("rejects an empty-string accion entry", () => {
    expect(permissionMatrixSchema.safeParse({ ...valid, acciones: [""] }).success).toBe(false);
  });
});
