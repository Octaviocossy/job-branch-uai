import type { Message, SendMessageInput, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const chat_service = {
  listMessages: (
    applicationId: string,
    signal?: AbortSignal,
  ): Promise<TResult<Message[]>> =>
    api.get<Message[]>(
      `/chat/${applicationId}/messages`,
      undefined,
      signal,
    ),

  sendMessage: (
    applicationId: string,
    input: SendMessageInput,
  ): Promise<TResult<Message>> =>
    api.post<SendMessageInput, Message>(
      `/chat/${applicationId}/messages`,
      input,
    ),
};