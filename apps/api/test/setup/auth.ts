import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { AuthResponse, RegisterRole } from "@repo/models";
import request from "supertest";
import { PasswordService } from "../../src/modules/auth/application/password.service";
import { CreatePersonaUseCase } from "../../src/modules/persona/application/use-cases/create-persona.use-case";
import { MATRIZ_PERMISOS_FACTORIES, type MatrizPermisosFactories } from "../../src/modules/security/application/factories/matriz-permisos.factory";
import { LISTA_USUARIOS, type ListaUsuarios } from "../../src/modules/users/domain/lista-usuarios.repository";
import type { Usuario } from "../../src/modules/users/domain/usuario";

type Http = ReturnType<INestApplication["getHttpServer"]>;

export const DEFAULT_PASSWORD = "Password#123";

export interface RegistrarOverrides {
  email?: string;
  password?: string;
  nombreCompleto?: string;
  role?: RegisterRole;
}

/** `POST /auth/register` with a unique email; a postulante unless told otherwise. Returns the `AuthResponse` body. */
export async function registrar(http: Http, overrides: RegistrarOverrides = {}): Promise<AuthResponse> {
  const response = await request(http)
    .post("/auth/register")
    .send({
      email: overrides.email ?? `usuario-${randomUUID()}@example.com`,
      password: overrides.password ?? DEFAULT_PASSWORD,
      nombreCompleto: overrides.nombreCompleto ?? "Usuario de Prueba",
      role: overrides.role ?? "postulante",
    });

  if (response.status !== 201) {
    throw new Error(`register failed with ${response.status}: ${JSON.stringify(response.body)}`);
  }

  return response.body as AuthResponse;
}

/** `POST /auth/login`; returns the bearer token. */
export async function login(http: Http, email: string, password: string): Promise<string> {
  const response = await request(http).post("/auth/login").send({ email, password });

  if (response.status !== 200) {
    throw new Error(`login failed with ${response.status}: ${JSON.stringify(response.body)}`);
  }

  return (response.body as AuthResponse).token;
}

/** Registration cannot create an Administrador (invariant 2), so a test builds one the way the seed does. */
export async function crearAdministrador(app: INestApplication, email: string, password: string): Promise<Usuario> {
  const listaUsuarios = app.get<ListaUsuarios>(LISTA_USUARIOS, { strict: false });
  const passwordService = app.get(PasswordService, { strict: false });
  const createPersonaUseCase = app.get(CreatePersonaUseCase, { strict: false });
  const factories = app.get<MatrizPermisosFactories>(MATRIZ_PERMISOS_FACTORIES, { strict: false });

  const usuario = await listaUsuarios.agregarUsuario({ email, nombreCompleto: "Administrador de Prueba", passwordHash: await passwordService.hash(password) });

  await createPersonaUseCase.execute({ tipo: "administrador", usuarioId: usuario.id, puestoCorporativo: null }, factories.administrador.raicesPorDefecto());

  return usuario;
}
