import type { Usuario } from "./usuario";

export const LISTA_USUARIOS = Symbol("LISTA_USUARIOS");

export interface NuevoUsuario {
  email: string;
  nombreCompleto: string;
  passwordHash: string | null;
}

/** SPEC 19.13 «Catálogo» of Usuarios: a query about users goes to the catalog, never to a single Usuario. */
export interface ListaUsuarios {
  agregarUsuario(nuevo: NuevoUsuario): Promise<Usuario>;
  buscarPorEmail(email: string): Promise<Usuario | null>;
  buscarPorId(id: string): Promise<Usuario | null>;
  listar(): Promise<Usuario[]>;
  /** Persists the mutable state of a Usuario (`nombreCompleto`, `intentosFallidos`). */
  guardar(usuario: Usuario): Promise<void>;
}
