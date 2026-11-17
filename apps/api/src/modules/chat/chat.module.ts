import { Module } from "@nestjs/common";
import { ListMessagesUseCase } from "./application/use-cases/list-messages.use-case";
import { SendMessageUseCase } from "./application/use-cases/send-message.use-case";
import { CHAT_REPOSITORY } from "./domain/chat.repository";
import { DrizzleChatRepository } from "./infrastructure/drizzle-chat.repository";
import { ChatController } from "./presentation/chat.controller";

@Module({
  controllers: [ChatController],
  providers: [
    ListMessagesUseCase,
    SendMessageUseCase,
    {
      provide: CHAT_REPOSITORY,
      useClass: DrizzleChatRepository,
    },
  ],
})
export class ChatModule {}