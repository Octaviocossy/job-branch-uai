import { Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import { type ListFollowupsQuery, listFollowupsQuerySchema } from "@repo/models";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { ListFollowupsUseCase } from "../application/use-cases/list-followups.use-case";
import { MarkFollowupDoneUseCase } from "../application/use-cases/mark-followup-done.use-case";
import { resolveThresholds } from "../domain/followup.utils";

@Controller("followup")
@UseGuards(JwtAuthGuard)
export class FollowupController {
  constructor(
    private readonly listFollowupsUseCase: ListFollowupsUseCase,
    private readonly markFollowupDoneUseCase: MarkFollowupDoneUseCase,
  ) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query(new ZodValidationPipe(listFollowupsQuerySchema)) query: ListFollowupsQuery) {
    return this.listFollowupsUseCase.execute(user.sub, resolveThresholds(query.threshold));
  }

  @Post(":ramaId/done")
  async markDone(@CurrentUser() user: JwtPayload, @Param("ramaId") ramaId: string) {
    const resolved = await this.markFollowupDoneUseCase.execute(user.sub, ramaId);

    if (!resolved) {
      throw new NotFoundException(`Branch ${ramaId} not found`);
    }

    return resolved;
  }
}
