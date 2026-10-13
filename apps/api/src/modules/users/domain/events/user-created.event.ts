import type { Usuario } from "@repo/models";

/** Event name for the in-process "a user was created" domain event. */
export const USER_CREATED_EVENT = "user.created";

/** Payload published with {@link USER_CREATED_EVENT}. */
export interface UserCreatedEvent {
  user: Usuario;
}
