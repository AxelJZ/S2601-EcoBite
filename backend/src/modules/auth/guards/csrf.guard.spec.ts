// NOTE: Verifies CSRF guard behavior for safe and mutating requests.
import { Test, TestingModule } from '@nestjs/testing';
import authConfig from '../../../config/auth.config';
import { ErrorCode } from '../../../common/errors/error-codes';
import { mockHttpExecutionContext } from '../../../testing/mock-execution-context';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        {
          provide: authConfig.KEY,
          useValue: {
            csrfCookieName: 'csrf_token',
            csrfHeaderName: 'x-csrf-token',
          },
        },
      ],
    }).compile();

    guard = moduleRef.get(CsrfGuard);
  });

  it('allows safe methods without a token', () => {
    expect(guard.canActivate(mockHttpExecutionContext({ method: 'GET' }))).toBe(
      true,
    );
  });

  it('allows mutating methods with matching cookie and header', () => {
    expect(
      guard.canActivate(
        mockHttpExecutionContext({
          method: 'POST',
          cookies: { csrf_token: 'abc' },
          headers: { 'x-csrf-token': 'abc' },
        }),
      ),
    ).toBe(true);
  });

  it('rejects mutating methods without matching token', () => {
    let thrown: unknown;
    try {
      guard.canActivate(
        mockHttpExecutionContext({
          method: 'DELETE',
          cookies: { csrf_token: 'abc' },
          headers: { 'x-csrf-token': 'wrong' },
        }),
      );
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ code: ErrorCode.CSRF_INVALID.code });
  });
});
