import { Inject, Injectable } from "@nestjs/common";
import type { PersonaTipo } from "@repo/models";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { personas, usuarios } from "../../../database/schema/index";
import type { ListaUsuarios, NuevoUsuario } from "../domain/lista-usuarios.repository";
import { Usuario } from "../domain/usuario";

type UsuarioRow = typeof usuarios.$inferSelect;

function toDomain(row: UsuarioRow, tipo: PersonaTipo | null): Usuario {
  return new Usuario(row.id, row.email, row.nombreCompleto, row.passwordHash, row.authProvider, row.intentosFallidos, tipo ?? null);
}

@Injectable()
export class DrizzleListaUsuarios implements ListaUsuarios {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async agregarUsuario(nuevo: NuevoUsuario): Promise<Usuario> {
    const [row] = await this.db.insert(usuarios).values(nuevo).returning();

    if (!row) {
      throw new Error("Failed to create usuario");
    }

    // The Persona does not exist yet, so the new Usuario has no role until it is created.
    return toDomain(row, null);
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [row] = await this.selectConPersona().where(eq(usuarios.email, email));

    return row ? toDomain(row.usuario, row.tipo) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const [row] = await this.selectConPersona().where(eq(usuarios.id, id));

    return row ? toDomain(row.usuario, row.tipo) : null;
  }

  async listar(): Promise<Usuario[]> {
    const rows = await this.selectConPersona();

    return rows.map((row) => toDomain(row.usuario, row.tipo));
  }

  async guardar(usuario: Usuario): Promise<void> {
    await this.db.update(usuarios).set({ nombreCompleto: usuario.nombreCompleto, intentosFallidos: usuario.intentosFallidos }).where(eq(usuarios.id, usuario.id));
  }

  private selectConPersona() {
    return this.db.select({ usuario: usuarios, tipo: personas.tipo }).from(usuarios).leftJoin(personas, eq(personas.usuarioId, usuarios.id));
  }
}
