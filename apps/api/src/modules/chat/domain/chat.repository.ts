import type { Message, SendMessageInput } from "@repo/models";

export const CHAT_REPOSITORY = Symbol("CHAT_REPOSITORY");

export interface ChatRepository {
  listMessages(applicationId: string, userId: string): Promise<Message[] | null>;

  sendMessage(
    applicationId: string,
    userId: string,
    input: SendMessageInput,
  ): Promise<Message | null>;
}
