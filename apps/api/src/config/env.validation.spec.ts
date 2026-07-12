import { describe, expect, it } from "vitest";
import { validateEnv } from "./env.validation";

describe("validateEnv", () => {
  it("applies defaults for NODE_ENV, PORT, and CORS_ORIGIN", () => {
    const env = validateEnv({ DATABASE_URL: "postgres://x" });

    expect(env).toEqual({
      NODE_ENV: "development",
      PORT: 3001,
      CORS_ORIGIN: "http://localhost:3000",
      DATABASE_URL: "postgres://x",
    });
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => validateEnv({})).toThrow();
  });

  it("round-trips a fully specified, valid env", () => {
    const input = {
      NODE_ENV: "production",
      PORT: "8080",
      CORS_ORIGIN: "https://example.com",
      DATABASE_URL: "postgres://x",
    };

    expect(validateEnv(input)).toEqual({
      NODE_ENV: "production",
      PORT: 8080,
      CORS_ORIGIN: "https://example.com",
      DATABASE_URL: "postgres://x",
    });
  });
});
