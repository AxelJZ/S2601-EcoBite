// NOTE: Extracts the authenticated user from a request handler context.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Express.User | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: Express.User }>();
    return request.user;
  },
);
