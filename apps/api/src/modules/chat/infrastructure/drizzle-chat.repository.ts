import { Inject, Injectable } from "@nestjs/common";
import type { Message, SendMessageInput } from "@repo/models";
import { and, asc, eq, or } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import {
  applications,
  conversaciones,
  mensajes,
} from "../../../database/schema/index";
import type { ChatRepository } from "../domain/chat.repository";

@Injectable()
export class DrizzleChatRepository implements ChatRepository {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: Database,
  ) {}

  async listMessages(
    applicationId: string,
    userId: string,
  ): Promise<Message[] | null> {
    /*
     * El chat solamente puede ser consultado por:
     *
     * 1. El postulante dueño de la application.
     * 2. El recruiter asignado a esa application.
     */
    const [application] = await this.db
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          or(
            eq(applications.usuarioId, userId),
            eq(applications.recruiterUsuarioId, userId),
          ),
        ),
      );

    if (!application) {
      return null;
    }

    const [conversacion] = await this.db
      .select()
      .from(conversaciones)
      .where(eq(conversaciones.applicationId, applicationId));

    if (!conversacion) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(mensajes)
      .where(eq(mensajes.conversacionId, conversacion.id))
      .orderBy(asc(mensajes.createdAt));

    return rows.map((row) => this.toMessage(row));
  }

  async sendMessage(
    applicationId: string,
    userId: string,
    input: SendMessageInput,
  ): Promise<Message | null> {
    return this.db.transaction(async (tx) => {
      /*
       * Para enviar mensajes aplicamos exactamente
       * la misma autorización:
       *
       * postulante OR recruiter asignado.
       */
      const [application] = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.id, applicationId),
            or(
              eq(applications.usuarioId, userId),
              eq(applications.recruiterUsuarioId, userId),
            ),
          ),
        );

      if (!application) {
        return null;
      }

      /*
       * Buscamos la conversación asociada a la application.
       */
      let [conversacion] = await tx
        .select()
        .from(conversaciones)
        .where(eq(conversaciones.applicationId, applicationId));

      /*
       * Si todavía no existe una conversación,
       * el primer mensaje la crea.
       */
      if (!conversacion) {
        [conversacion] = await tx
          .insert(conversaciones)
          .values({
            applicationId,
          })
          .returning();
      }

      if (!conversacion) {
        throw new Error(
          `Failed to create conversation for application ${applicationId}`,
        );
      }

      /*
       * usuarioId viene del JWT.
       *
       * Nunca permitimos que el frontend decida
       * qué usuario está enviando el mensaje.
       */
      const [created] = await tx
        .insert(mensajes)
        .values({
          conversacionId: conversacion.id,
          usuarioId: userId,
          contenido: input.contenido,
        })
        .returning();

      if (!created) {
        throw new Error(
          `Failed to create message for application ${applicationId}`,
        );
      }

      return this.toMessage(created);
    });
  }

  private toMessage(row: typeof mensajes.$inferSelect): Message {
    return {
      id: row.id,
      conversacionId: row.conversacionId,
      usuarioId: row.usuarioId,
      contenido: row.contenido,
      createdAt: row.createdAt,
      leidoAt: row.leidoAt,
    };
  }
}
