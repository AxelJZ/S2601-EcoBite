// NOTE: Protects cookie-based mutations with CSRF token checks.
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Request } from 'express';
import authConfig from '../../../config/auth.config';
import { AppException } from '../../../common/errors/app.exception';
import { ErrorCode } from '../../../common/errors/error-codes';
import { readCookie } from '../auth.utils';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readHeader(req: Request, headerName: string): string | undefined {
  const raw = req.headers[headerName];
  if (Array.isArray(raw)) {
    return raw.length === 1 ? raw[0] : undefined;
  }
  return typeof raw === 'string' ? raw : undefined;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(authConfig.KEY)
    private readonly auth: ConfigType<typeof authConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method?.toUpperCase() ?? 'GET')) {
      return true;
    }

    const cookieToken = readCookie(req, this.auth.csrfCookieName);
    const headerToken = readHeader(req, this.auth.csrfHeaderName);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new AppException(ErrorCode.CSRF_INVALID);
    }
    return true;
  }
}
