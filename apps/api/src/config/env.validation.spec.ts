import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  it("applies defaults for NODE_ENV, PORT, CORS_ORIGIN, and JWT_EXPIRES_IN", () => {
    const env = validateEnv({ DATABASE_URL: "postgres://x", JWT_SECRET: "a-very-long-secret-value" });

    expect(env).toEqual({
      NODE_ENV: "development",
      PORT: 3001,
      CORS_ORIGIN: "http://localhost:3000",
      DATABASE_URL: "postgres://x",
      JWT_SECRET: "a-very-long-secret-value",
      JWT_EXPIRES_IN: "1d",
    });
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => validateEnv({ JWT_SECRET: "a-very-long-secret-value" })).toThrow();
  });

  it("throws when JWT_SECRET is missing", () => {
    expect(() => validateEnv({ DATABASE_URL: "postgres://x" })).toThrow();
  });

  it("throws when JWT_SECRET is shorter than 16 characters", () => {
    expect(() => validateEnv({ DATABASE_URL: "postgres://x", JWT_SECRET: "short" })).toThrow();
  });

  it("round-trips a fully specified, valid env", () => {
    const input = {
      NODE_ENV: "production",
      PORT: "8080",
      CORS_ORIGIN: "https://example.com",
      DATABASE_URL: "postgres://x",
      JWT_SECRET: "a-very-long-secret-value",
      JWT_EXPIRES_IN: "12h",
    };

    expect(validateEnv(input)).toEqual({
      NODE_ENV: "production",
      PORT: 8080,
      CORS_ORIGIN: "https://example.com",
      DATABASE_URL: "postgres://x",
      JWT_SECRET: "a-very-long-secret-value",
      JWT_EXPIRES_IN: "12h",
    });
  });
});
