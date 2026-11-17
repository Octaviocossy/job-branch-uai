import { Inject, Injectable } from "@nestjs/common";
import type { Message } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import {
  CHAT_REPOSITORY,
  type ChatRepository,
} from "../../domain/chat.repository";

@Injectable()
export class ListMessagesUseCase {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: ChatRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListMessagesUseCase.name);
  }

  async execute(
    applicationId: string,
    userId: string,
  ): Promise<Message[] | null> {
    this.logger.debug(
      `Listing messages applicationId=${applicationId} userId=${userId}`,
    );

    return this.chatRepository.listMessages(applicationId, userId);
  }
}