import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "./jwt.service";
import type { AuthenticatedRequest } from "./jwt-auth.guard";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

  return request.user;
});
