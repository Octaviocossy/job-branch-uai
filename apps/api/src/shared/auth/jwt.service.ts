import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService as NestJwtService } from "@nestjs/jwt";
import type { Env } from "../../config/env.validation";

export interface JwtPayload {
  sub: string;
  role: string;
  /** Unique per token, so two logins in the same second never sign the same JWT (a Sesion's hash is unique). */
  jti?: string;
  /** Issued-at and expiry (epoch seconds), added by `jsonwebtoken` when the token is signed. */
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  sign(payload: JwtPayload): string {
    return this.nestJwtService.sign(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.get("JWT_SECRET", { infer: true }),
        expiresIn: this.configService.get("JWT_EXPIRES_IN", { infer: true }),
      },
    );
  }

  verify(token: string): JwtPayload {
    return this.nestJwtService.verify<JwtPayload>(token, {
      secret: this.configService.get("JWT_SECRET", { infer: true }),
    });
  }
}
