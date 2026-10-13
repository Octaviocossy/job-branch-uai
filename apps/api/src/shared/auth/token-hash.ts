import { createHash } from "node:crypto";

/** SHA-256 hex of a JWT: what a Sesion stores in place of the token (invariant 14). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
