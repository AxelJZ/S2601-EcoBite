// NOTE: Verifies successful response envelope formatting.
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import type { Request, Response } from 'express';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor<Record<string, string>>();

  function createCtx(
    req: Partial<Request>,
    res: Partial<Response>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req as Request,
        getResponse: () =>
          ({
            statusCode: 201,
            ...res,
          }) as Response,
      }),
    } as ExecutionContext;
  }

  it('wraps payload in ApiResponse envelope', (done) => {
    interceptor
      .intercept(createCtx({ url: '/users?take=10' }, { statusCode: 201 }), {
        handle: () => of({ id: '1' }),
      })
      .subscribe({
        next: (val) => {
          expect(val.success).toBe(true);
          expect(val.statusCode).toBe(201);
          expect(val.data).toEqual({ id: '1' });
          expect(typeof val.timestamp).toBe('string');
          expect(val.path).toBe('/users?take=10');
          done();
        },
      });
  });
});
