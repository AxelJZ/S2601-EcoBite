// NOTE: Builds mock Nest execution contexts for guard and decorator tests.
import type { ExecutionContext } from '@nestjs/common';

export function mockHttpExecutionContext(request: {
  method?: string;
  path?: string;
  url?: string;
  user?: Express.User;
  cookies?: Record<string, string>;
  headers?: Record<string, string | string[]>;
}): ExecutionContext {
  const req = {
    method: request.method ?? 'GET',
    path: request.path ?? '/',
    url: request.url ?? `${request.path ?? '/'}`,
    cookies: request.cookies ?? {},
    headers: request.headers ?? {},
    ...(request.user !== undefined ? { user: request.user } : {}),
  };
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: jest.fn(),
    }),
  } as unknown as ExecutionContext;
}
