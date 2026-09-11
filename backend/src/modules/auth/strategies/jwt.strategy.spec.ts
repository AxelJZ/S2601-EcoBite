// NOTE: Verifies JWT strategy payload validation behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import authConfig from '../../../config/auth.config';
import { ErrorCode } from '../../../common/errors/error-codes';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-uuid',
          email: 'fresh@example.com',
          role: Role.SUPERVISOR,
          active: true,
        }),
      },
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: authConfig.KEY,
          useValue: {
            jwtAccessSecret: 'test-secret-at-least-32-chars-long!!',
            jwtIssuer: 'test-issuer',
            jwtAudience: 'test-audience',
            accessCookieName: 'access_token',
          },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  describe('validate', () => {
    it('maps current DB user to Express.User', async () => {
      const out = await strategy.validate({
        sub: 'user-uuid',
        email: 'u@example.com',
        role: Role.INSTALLER,
      });
      expect(out).toEqual({
        userId: 'user-uuid',
        email: 'fresh@example.com',
        role: Role.SUPERVISOR,
      });
    });

    it('throws AUTH_UNAUTHENTICATED when user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.co',
        role: Role.ADMIN,
        active: false,
      });

      await expect(
        strategy.validate({
          sub: '1',
          email: 'a@b.co',
          role: Role.ADMIN,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_UNAUTHENTICATED.code });
    });

    it('uses current role across enum values', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.co',
        role: Role.ADMIN,
        active: true,
      });
      const out = await strategy.validate({
        sub: '1',
        email: 'a@b.co',
        role: Role.INSTALLER,
      });
      expect(out.role).toBe(Role.ADMIN);
    });
  });
});
