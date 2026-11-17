import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SendMessageInput } from "@/models";
import { chatMessagesQueryKey } from "@/hooks/use-chat-messages";
import { chat_service } from "@/services/chat.service";

export const useSendMessage = (applicationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      chat_service.sendMessage(applicationId, input),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: chatMessagesQueryKey(applicationId),
      });
    },
  });
};