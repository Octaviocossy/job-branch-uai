import type { Sesion } from "./sesion";

export const SESION_REPOSITORY = Symbol("SESION_REPOSITORY");

export interface NuevaSesion {
  usuarioId: string;
  /** SHA-256 hex of the issued JWT, never the token (invariant 14). */
  tokenJWT: string;
  fechaEmision: Date;
  fechaExpiracion: Date;
}

export interface SesionRepository {
  crear(nueva: NuevaSesion): Promise<Sesion>;
  /** `tokenJWT` is the token's hash, as stored. */
  buscarPorToken(tokenJWT: string): Promise<Sesion | null>;
  buscarPorId(id: string): Promise<Sesion | null>;
  /** Persists `fechaExpiracion`, the only mutable field. No Sesion row is ever deleted (invariant 14). */
  guardar(sesion: Sesion): Promise<void>;
}
