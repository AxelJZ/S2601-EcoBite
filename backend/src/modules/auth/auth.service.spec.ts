// NOTE: Verifies authentication service session and token behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { RefreshSessionStatus, Role } from '@prisma/client';
import authConfig from '../../config/auth.config';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './auth-user.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';

const mockedCompare = bcrypt.compare as jest.Mock;

const userRow = (
  overrides: Partial<{
    password: string;
    active: boolean;
    role: Role;
    id: string;
    email: string;
    name: string;
    phone: string | null;
  }> = {},
) => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Auth User',
  email: 'auth@example.com',
  password: 'stored-hash',
  phone: null,
  role: Role.INSTALLER,
  active: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function mockCookies(): Response {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    refreshSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let userService: { create: jest.Mock };

  const mockAuthCfg = {
    accessCookieName: 'access_token',
    refreshCookieName: 'refresh_token',
    csrfCookieName: 'csrf_token',
    csrfHeaderName: 'x-csrf-token',
    cookieMaxAge: 900_000,
    refreshCookieMaxAge: 7 * 86_400_000,
    cookieSecure: false,
    cookieSameSite: 'strict' as const,
    cookieDomain: undefined,
    jwtIssuer: 'iss',
    jwtAudience: 'aud',
  };

  beforeEach(async () => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('access.jwt') };
    userService = { create: jest.fn() };
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      refreshSession: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: typeof prisma) => unknown)(prisma);
        }
        if (Array.isArray(arg)) {
          await Promise.all(
            arg.map((op: unknown) =>
              Promise.resolve(op as PromiseLike<unknown>),
            ),
          );
        }
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: authConfig.KEY, useValue: mockAuthCfg },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    mockedCompare.mockReset();
    mockedCompare.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockedCompare.mockReset();
    mockedCompare.mockResolvedValue(false);
  });

  describe('login', () => {
    it('throws AUTH_INVALID_CREDENTIALS for an inactive user', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow({ active: false }));

      await expect(
        service.login('a@b.com', 'pwd', mockCookies()),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS.code,
      });
    });

    it('lanza AUTH_INVALID_CREDENTIALS si bcrypt no coincide', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());

      mockedCompare.mockResolvedValueOnce(false);

      await expect(
        service.login('auth@example.com', 'wrong', mockCookies()),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS.code,
      });
    });

    it('sets cookies and updates last login with valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());
      mockedCompare.mockResolvedValueOnce(true);

      const res = mockCookies();

      const out = await service.login('auth@example.com', 'good', res);

      expect(out.email).toBe('auth@example.com');

      expect(prisma.refreshSession.create).toHaveBeenCalledTimes(1);
      expect(prisma.refreshSession.create.mock.calls[0]?.[0]).toMatchObject({
        data: expect.objectContaining({
          userId: userRow().id,
          status: RefreshSessionStatus.ACTIVE,
        }),
      });

      expect(res.cookie as jest.Mock).toHaveBeenCalledWith(
        'access_token',
        'access.jwt',
        expect.objectContaining({ httpOnly: true }),
      );

      expect(res.cookie as jest.Mock).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.any(Object),
      );
    });

    it('treats a missing user as invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('missing@example.com', 'x', mockCookies()),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS.code,
      });
    });
  });

  describe('completeSignup', () => {
    it('delegates creation to UserService and throws INTERNAL_ERROR if the user cannot be read from the database', async () => {
      const createdSafe = {
        id: userRow().id,
        email: userRow().email,
        name: userRow().name,
        phone: null,
        role: Role.INSTALLER,
        active: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userService.create.mockResolvedValue(createdSafe);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.completeSignup(
          {
            name: createdSafe.name,
            email: createdSafe.email,
            password: 'P@ss1234',
          },
          mockCookies(),
        ),
      ).rejects.toMatchObject({ code: ErrorCode.INTERNAL_ERROR.code });
    });
  });

  describe('refresh', () => {
    it('AUTH_REFRESH_INVALID without refresh cookie', async () => {
      const req = {
        cookies: {},
      } as unknown as Request;

      await expect(service.refresh(req, mockCookies())).rejects.toMatchObject({
        code: ErrorCode.AUTH_REFRESH_INVALID.code,
      });
    });

    it('AUTH_REFRESH_INVALID for an expired or non-ACTIVE session', async () => {
      const raw = Buffer.from('raw-refresh-token').toString('base64url');
      const req = {
        cookies: { refresh_token: raw },
      } as unknown as Request;

      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 's1',
        userId: userRow().id,
        tokenHash: 'x',
        familyId: 'f1',
        status: RefreshSessionStatus.ACTIVE,
        expiresAt: new Date(0),
        user: userRow(),
      });

      await expect(service.refresh(req, mockCookies())).rejects.toMatchObject({
        code: ErrorCode.AUTH_REFRESH_INVALID.code,
      });
    });

    it('AUTH_REFRESH_REUSE y revoca familia si estado REPLACED', async () => {
      const raw = 'plaintext-refresh-used-twice';

      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 's-old',
        userId: userRow().id,
        tokenHash: 'irrelevant-checked-by-db',
        familyId: 'fam-99',
        status: RefreshSessionStatus.REPLACED,
        expiresAt: new Date(Date.now() + 86400000),
        user: userRow({ active: true }),
      });

      const req = {
        cookies: { refresh_token: raw },
      } as unknown as Request;

      await expect(service.refresh(req, mockCookies())).rejects.toMatchObject({
        code: ErrorCode.AUTH_REFRESH_REUSE.code,
      });

      expect(prisma.refreshSession.updateMany).toHaveBeenCalled();
    });

    it('AUTH_REFRESH_REUSE if another request replaced the session during rotation', async () => {
      const session = {
        id: 's-race',
        userId: userRow().id,
        tokenHash: 'h',
        familyId: 'f-race',
        status: RefreshSessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
        user: userRow({ active: true }),
      };
      prisma.refreshSession.findUnique
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce({
          familyId: session.familyId,
          status: RefreshSessionStatus.REPLACED,
        });
      prisma.refreshSession.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.refresh(
          { cookies: { refresh_token: 'x' } } as unknown as Request,
          mockCookies(),
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_REFRESH_REUSE.code });

      expect(prisma.refreshSession.create).not.toHaveBeenCalled();
      expect(prisma.refreshSession.updateMany).toHaveBeenCalledTimes(2);
    });

    it('AUTH_REFRESH_INVALID for an inactive user', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        id: 's',
        tokenHash: 'h',
        familyId: 'f',
        status: RefreshSessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
        user: userRow({ active: false }),
      });

      await expect(
        service.refresh(
          { cookies: { refresh_token: 'x' } } as unknown as Request,
          mockCookies(),
        ),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_REFRESH_INVALID.code });
    });
  });

  describe('logout', () => {
    it('limpia cookies aun si no hay refresh', async () => {
      const res = mockCookies();

      await service.logout({ cookies: {} } as unknown as Request, res);

      expect(res.clearCookie as jest.Mock).toHaveBeenCalled();
      expect(prisma.refreshSession.updateMany).not.toHaveBeenCalled();
    });

    it('clears cookies and revokes the family when there is a valid session', async () => {
      prisma.refreshSession.findUnique.mockResolvedValue({
        familyId: 'fam',
      });

      const res = mockCookies();

      await service.logout(
        { cookies: { refresh_token: 'plain' } } as unknown as Request,
        res,
      );

      expect(res.clearCookie as jest.Mock).toHaveBeenCalled();
      expect(prisma.refreshSession.updateMany).toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('AUTH_UNAUTHENTICATED for an inactive or missing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me(userRow().id)).rejects.toMatchObject({
        code: ErrorCode.AUTH_UNAUTHENTICATED.code,
      });

      prisma.user.findUnique.mockResolvedValue(userRow({ active: false }));

      await expect(service.me(userRow().id)).rejects.toMatchObject({
        code: ErrorCode.AUTH_UNAUTHENTICATED.code,
      });
    });

    it('returns UserSafe when active', async () => {
      const u = userRow();
      prisma.user.findUnique.mockResolvedValue(u);

      const out = await service.me(u.id);
      expect(out.email).toBe(u.email);
      expect(out.id).toBe(u.id);
    });
  });

  describe('clearAuthCookies', () => {
    it('clears auth cookies', () => {
      const res = mockCookies();
      service.clearAuthCookies(res);
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.accessCookieName,
        expect.any(Object),
      );
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.refreshCookieName,
        expect.any(Object),
      );
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.csrfCookieName,
        expect.objectContaining({ httpOnly: false }),
      );
    });
  });
});
