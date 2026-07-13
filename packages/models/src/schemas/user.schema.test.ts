import { describe, expect, it } from "vitest";
import { createUserSchema, userSchema } from "./user.schema";

const validUser = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  email: "ada@example.com",
  displayName: "Ada",
  role: "postulante",
};

describe("userSchema", () => {
  it("parses a valid user unchanged", () => {
    expect(userSchema.parse(validUser)).toEqual(validUser);
  });

  it("rejects a non-UUID id", () => {
    const result = userSchema.safeParse({ ...validUser, id: "not-a-uuid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("id");
    }
  });

  it("rejects an invalid email", () => {
    const result = userSchema.safeParse({ ...validUser, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });

  it("rejects an empty displayName", () => {
    const result = userSchema.safeParse({ ...validUser, displayName: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("displayName");
    }
  });

  it("rejects a role outside postulante/recruiter", () => {
    const result = userSchema.safeParse({ ...validUser, role: "admin" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("role");
    }
  });
});

describe("createUserSchema", () => {
  it("parses an input without an id", () => {
    const { id: _id, ...withoutId } = validUser;
    const result = createUserSchema.parse(withoutId);

    expect(result).not.toHaveProperty("id");
  });

  it("strips an id when present, rather than rejecting it", () => {
    // Zod object schemas strip unknown keys by default (no .strict() on the
    // source schema), so passing an id through createUserSchema succeeds and
    // the id is silently dropped instead of causing a validation error.
    const result = createUserSchema.safeParse(validUser);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });

  it("still rejects an invalid email", () => {
    const { id: _id, ...withoutId } = validUser;
    const result = createUserSchema.safeParse({ ...withoutId, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });
});
