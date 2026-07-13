import { describe, expect, it } from "vitest";
import { authResponseSchema, loginSchema, registerSchema } from "./auth.schema.js";

const validRegister = {
  email: "ada@example.com",
  password: "supersecret",
  displayName: "Ada",
  role: "postulante",
};

describe("registerSchema", () => {
  it("parses a valid registration payload", () => {
    expect(registerSchema.parse(validRegister)).toEqual(validRegister);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...validRegister, password: "short" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("password");
    }
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...validRegister, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });

  it("rejects a role outside postulante/recruiter", () => {
    const result = registerSchema.safeParse({ ...validRegister, role: "admin" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("role");
    }
  });

  it("never carries a passwordHash field", () => {
    expect(validRegister).not.toHaveProperty("passwordHash");
  });
});

describe("loginSchema", () => {
  const validLogin = { email: "ada@example.com", password: "supersecret" };

  it("parses a valid login payload", () => {
    expect(loginSchema.parse(validLogin)).toEqual(validLogin);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ ...validLogin, password: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("password");
    }
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ ...validLogin, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });
});

describe("authResponseSchema", () => {
  const validResponse = {
    token: "signed.jwt.token",
    user: {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      email: "ada@example.com",
      displayName: "Ada",
      role: "postulante",
    },
  };

  it("parses a valid auth response", () => {
    expect(authResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  it("rejects an empty token", () => {
    const result = authResponseSchema.safeParse({ ...validResponse, token: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("token");
    }
  });

  it("rejects a user missing required fields", () => {
    const { role: _role, ...userWithoutRole } = validResponse.user;
    const result = authResponseSchema.safeParse({ ...validResponse, user: userWithoutRole });

    expect(result.success).toBe(false);
  });
});
