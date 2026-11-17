import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  type SendMessageInput,
  sendMessageSchema,
} from "@repo/models";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { ListMessagesUseCase } from "../application/use-cases/list-messages.use-case";
import { SendMessageUseCase } from "../application/use-cases/send-message.use-case";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("chat")
export class ChatController {
  constructor(
    private readonly listMessagesUseCase: ListMessagesUseCase,
    private readonly sendMessageUseCase: SendMessageUseCase,
  ) {}

  @Get(":applicationId/messages")
  async listMessages(
    @CurrentUser() user: JwtPayload,
    @Param("applicationId") applicationId: string,
  ) {
    const messages = await this.listMessagesUseCase.execute(
      applicationId,
      user.sub,
    );

    if (messages === null) {
      throw new NotFoundException(
        `Application ${applicationId} not found`,
      );
    }

    return messages;
  }

  @Post(":applicationId/messages")
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("applicationId") applicationId: string,
    @Body(new ZodValidationPipe(sendMessageSchema))
    body: SendMessageInput,
  ) {
    const message = await this.sendMessageUseCase.execute(
      applicationId,
      user.sub,
      body,
    );

    if (!message) {
      throw new NotFoundException(
        `Application ${applicationId} not found`,
      );
    }

    return message;
  }
}