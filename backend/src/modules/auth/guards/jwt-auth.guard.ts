// NOTE: Enforces JWT authentication for protected routes.
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { AppException } from '../../../common/errors/app.exception';
import { ErrorCode } from '../../../common/errors/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path ?? req.url?.split('?')[0] ?? '';

    if (path.startsWith('/docs')) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: Error | undefined,
    user: TUser,
    info: Error | undefined,
  ): TUser {
    if (err) {
      throw err;
    }
    if (!user) {
      const detail =
        info != null && typeof info.message === 'string'
          ? info.message
          : undefined;
      throw new AppException(ErrorCode.AUTH_UNAUTHENTICATED, detail);
    }
    return user;
  }
}
