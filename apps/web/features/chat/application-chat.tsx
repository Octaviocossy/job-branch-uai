"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useSendMessage } from "@/hooks/use-send-message";
import { EResult } from "@/models";
import { cn } from "@/utilities/tailwind.utility";

interface ApplicationChatProps {
  applicationId: string;
  currentUserId: string;
}

export function ApplicationChat({
  applicationId,
  currentUserId,
}: ApplicationChatProps) {
  const [contenido, setContenido] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useChatMessages(applicationId);
  const sendMessage = useSendMessage(applicationId);

  const messages =
    messagesQuery.data?.type === EResult.SUCCESS
      ? messagesQuery.data.value
      : [];

  const loadError =
    messagesQuery.data?.type === EResult.ERROR
      ? messagesQuery.data.value.getUserMessage()
      : undefined;

  const sendError =
    sendMessage.data?.type === EResult.ERROR
      ? sendMessage.data.value.getUserMessage()
      : undefined;

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const texto = contenido.trim();

    if (!texto || sendMessage.isPending) {
      return;
    }

    sendMessage.mutate(
      {
        contenido: texto,
      },
      {
        onSuccess: (result) => {
          if (result.type === EResult.SUCCESS) {
            setContenido("");
          }
        },
      },
    );
  }

  if (messagesQuery.isPending) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando conversación...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-border border-b px-4 py-3">
        <h2 className="font-semibold text-foreground">
          Conversación
        </h2>

        <p className="text-muted-foreground text-sm">
          Chat entre recruiter y postulante
        </p>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {loadError ? (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {loadError}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-muted-foreground text-sm">
            Todavía no hay mensajes.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.usuarioId === currentUserId;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  isMine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-4 py-2",
                    isMine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.contenido}
                  </p>

                  <div
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      isMine
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {new Date(message.createdAt).toLocaleString(
                      "es-AR",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
  onSubmit={handleSubmit}
  className="border-border border-t p-3"
>
  <div className="flex min-w-0 items-center gap-2">
    <input
      type="text"
      value={contenido}
      onChange={(event) => setContenido(event.target.value)}
      placeholder="Escribí un mensaje..."
      maxLength={4000}
      disabled={sendMessage.isPending}
      className="min-w-0 flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
    />

  <Button
  type="submit"
  size="sm"
  disabled={!contenido.trim() || sendMessage.isPending}
  title="Enviar mensaje"
  aria-label="Enviar mensaje"
  className="h-9 w-9 shrink-0 p-0"
>
  {sendMessage.isPending ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Send className="h-4 w-4" />
  )}
</Button>
  </div>

  {sendError && (
    <p className="mt-2 text-destructive text-xs">
      {sendError}
    </p>
  )}
</form>
    </div>
  );
}