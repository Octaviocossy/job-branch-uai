import { Inject, Injectable } from "@nestjs/common";
import type { Message, SendMessageInput } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import {
  CHAT_REPOSITORY,
  type ChatRepository,
} from "../../domain/chat.repository";

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SendMessageUseCase.name);
  }

  async execute(
    applicationId: string,
    userId: string,
    input: SendMessageInput,
  ): Promise<Message | null> {
    this.logger.debug(
      `Sending message applicationId=${applicationId} userId=${userId}`,
    );

    const message = await this.chatRepository.sendMessage(
      applicationId,
      userId,
      input,
    );

    if (message) {
      this.logger.log(`Message created id=${message.id}`);
    }

    return message;
  }
}