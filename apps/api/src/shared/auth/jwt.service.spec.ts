import type { ConfigService } from "@nestjs/config";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import type { Env } from "../../config/env.validation";
import { JwtService } from "./jwt.service";

const SECRET = "unit-test-secret-at-least-16-chars";

const makeJwtService = () => {
  const config = { get: (key: keyof Env) => ({ JWT_SECRET: SECRET, JWT_EXPIRES_IN: "1d" })[key as "JWT_SECRET" | "JWT_EXPIRES_IN"] } as unknown as ConfigService<Env, true>;

  return new JwtService(new NestJwtService(), config);
};

describe("JwtService", () => {
  it("signs a token whose verified payload carries sub, role, jti, iat and exp", () => {
    const jwtService = makeJwtService();

    const payload = jwtService.verify(jwtService.sign({ sub: "u1", role: "postulante" }));

    expect(payload).toMatchObject({ sub: "u1", role: "postulante" });
    expect(payload.jti).toEqual(expect.any(String));
    expect(payload.iat).toEqual(expect.any(Number));
    expect(payload.exp).toBeGreaterThan(payload.iat as number);
  });

  it("signs a different token on every call, even for the same payload in the same second", () => {
    const jwtService = makeJwtService();

    const tokens = new Set(Array.from({ length: 20 }, () => jwtService.sign({ sub: "u1", role: "postulante" })));

    expect(tokens.size).toBe(20);
  });

  it("rejects a token signed with another secret", () => {
    const foreign = new NestJwtService().sign({ sub: "u1", role: "postulante" }, { secret: "another-secret-also-long-enough" });

    expect(() => makeJwtService().verify(foreign)).toThrow();
  });
});
