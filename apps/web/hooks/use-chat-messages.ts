import { useQuery } from "@tanstack/react-query";
import { chat_service } from "@/services/chat.service";

export const chatMessagesQueryKey = (applicationId: string) =>
  ["chat", applicationId, "messages"] as const;

export const useChatMessages = (applicationId: string) =>
  useQuery({
    queryKey: chatMessagesQueryKey(applicationId),
    queryFn: ({ signal }) =>
      chat_service.listMessages(applicationId, signal),
    enabled: Boolean(applicationId),
    refetchInterval: 5000,
  });