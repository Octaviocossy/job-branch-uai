import { describe, expect, it } from "vitest";
import { createRecordatorioSchema, recordatorioEstadoSchema, recordatorioSchema } from "./recordatorio.schema";

const validRecordatorio = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  ramaId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  fechaVencimiento: "2024-05-15",
  diasInactividad: 7,
  estado: "pendiente",
};

describe("recordatorioEstadoSchema", () => {
  it("accepts every documented state", () => {
    for (const estado of ["pendiente", "notificado", "resuelto"]) {
      expect(recordatorioEstadoSchema.safeParse(estado).success).toBe(true);
    }
  });

  it("rejects an unknown state", () => {
    expect(recordatorioEstadoSchema.safeParse("vencido").success).toBe(false);
  });
});

describe("recordatorioSchema", () => {
  it("parses a valid recordatorio unchanged", () => {
    expect(recordatorioSchema.parse(validRecordatorio)).toEqual(validRecordatorio);
  });

  it("rejects a negative diasInactividad", () => {
    const result = recordatorioSchema.safeParse({ ...validRecordatorio, diasInactividad: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("diasInactividad");
    }
  });

  it("rejects an invalid estado", () => {
    const result = recordatorioSchema.safeParse({ ...validRecordatorio, estado: "vencido" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("estado");
    }
  });
});

describe("createRecordatorioSchema", () => {
  it("omits id from the base schema", () => {
    const { id: _id, ...withoutId } = validRecordatorio;
    const result = createRecordatorioSchema.safeParse(withoutId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});
