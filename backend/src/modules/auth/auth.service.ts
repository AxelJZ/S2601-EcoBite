// NOTE: Implements signup, login, refresh, logout, and profile workflows.
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshSessionStatus, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID, createHash } from 'crypto';
import type { CookieOptions, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import authConfig from '../../config/auth.config';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode } from '../../common/errors/error-codes';
import { UserService, type UserSafe } from './auth-user.service';
import { SignupDto } from './dto/signup.dto';
import type { JwtAccessPayload } from './strategies/jwt.strategy';
import { readCookie } from './auth.utils';
import { generateCsrfToken } from './csrf-token';

function toUserSafe(user: User): UserSafe {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function hashRefreshToken(plain: string): string {
  return createHash('sha256').update(plain, 'utf8').digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly auth: ConfigType<typeof authConfig>,
    private readonly userService: UserService,
  ) {}

  private baseCookieOptions(): CookieOptions {
    const domain = this.auth.cookieDomain;
    const sameSite = this.auth.cookieSameSite;
    const secure = this.auth.cookieSecure;

    const partitioned = sameSite === 'none';

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      ...(partitioned ? { partitioned: true } : {}),
      ...(domain ? { domain } : {}),
    };
  }

  private attachCsrfCookie(res: Response): string {
    const token = generateCsrfToken();
    res.cookie(this.auth.csrfCookieName, token, {
      ...this.baseCookieOptions(),
      httpOnly: false,
      maxAge: this.auth.refreshCookieMaxAge,
    });
    return token;
  }

  private attachAuthCookies(
    res: Response,
    access: string,
    refresh: string,
  ): void {
    const base = this.baseCookieOptions();
    res.cookie(this.auth.accessCookieName, access, {
      ...base,
      maxAge: this.auth.cookieMaxAge,
    });
    res.cookie(this.auth.refreshCookieName, refresh, {
      ...base,
      maxAge: this.auth.refreshCookieMaxAge,
    });
  }

  clearAuthCookies(res: Response): void {
    const base = this.baseCookieOptions();
    res.clearCookie(this.auth.accessCookieName, base);
    res.clearCookie(this.auth.refreshCookieName, base);
    res.clearCookie(this.auth.csrfCookieName, {
      ...base,
      httpOnly: false,
    });
  }

  issueCsrfCookie(res: Response): { token: string } {
    return { token: this.attachCsrfCookie(res) };
  }

  private async signAccessToken(
    user: Pick<User, 'id' | 'email' | 'role'>,
  ): Promise<string> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }

  private async createAuthSession(
    user: User,
    res: Response,
  ): Promise<UserSafe> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const familyId = randomUUID();
    const refreshPlain = generateRefreshToken();
    await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshPlain),
        familyId,
        status: RefreshSessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + this.auth.refreshCookieMaxAge),
      },
    });

    const accessToken = await this.signAccessToken(user);
    this.attachAuthCookies(res, accessToken, refreshPlain);
    return toUserSafe(user);
  }

  async completeSignup(dto: SignupDto, res: Response): Promise<UserSafe> {
    const created = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      phone: dto.phone,
      role: Role.INSTALLER,
      active: true,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: created.id },
    });
    if (!user) {
      throw new AppException(ErrorCode.INTERNAL_ERROR);
    }
    return this.createAuthSession(user, res);
  }

  async login(
    email: string,
    password: string,
    res: Response,
  ): Promise<UserSafe> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user?.active) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    return this.createAuthSession(user, res);
  }

  async refresh(req: Request, res: Response): Promise<UserSafe> {
    const raw = readCookie(req, this.auth.refreshCookieName);
    if (typeof raw !== 'string') {
      throw new AppException(ErrorCode.AUTH_REFRESH_INVALID);
    }
    const tokenHash = hashRefreshToken(raw);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new AppException(ErrorCode.AUTH_REFRESH_INVALID);
    }

    if (session.status === RefreshSessionStatus.REPLACED) {
      await this.revokeRefreshFamily(session.familyId);
      throw new AppException(ErrorCode.AUTH_REFRESH_REUSE);
    }

    if (
      session.status !== RefreshSessionStatus.ACTIVE ||
      session.expiresAt < new Date()
    ) {
      throw new AppException(ErrorCode.AUTH_REFRESH_INVALID);
    }

    const { user } = session;
    if (!user.active) {
      throw new AppException(ErrorCode.AUTH_REFRESH_INVALID);
    }

    const newRefreshPlain = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshPlain);
    const newExpires = new Date(Date.now() + this.auth.refreshCookieMaxAge);

    await this.prisma.$transaction(async (tx) => {
      const replaced = await tx.refreshSession.updateMany({
        where: {
          id: session.id,
          status: RefreshSessionStatus.ACTIVE,
          expiresAt: { gt: new Date() },
        },
        data: { status: RefreshSessionStatus.REPLACED },
      });
      if (replaced.count !== 1) {
        const current = await tx.refreshSession.findUnique({
          where: { id: session.id },
          select: { familyId: true, status: true },
        });
        if (current?.status === RefreshSessionStatus.REPLACED) {
          await tx.refreshSession.updateMany({
            where: {
              familyId: current.familyId,
              status: {
                in: [
                  RefreshSessionStatus.ACTIVE,
                  RefreshSessionStatus.REPLACED,
                ],
              },
            },
            data: { status: RefreshSessionStatus.REVOKED },
          });
          throw new AppException(ErrorCode.AUTH_REFRESH_REUSE);
        }
        throw new AppException(ErrorCode.AUTH_REFRESH_INVALID);
      }

      await tx.refreshSession.create({
        data: {
          userId: user.id,
          tokenHash: newHash,
          familyId: session.familyId,
          status: RefreshSessionStatus.ACTIVE,
          expiresAt: newExpires,
        },
      });
    });

    const accessToken = await this.signAccessToken(user);
    this.attachAuthCookies(res, accessToken, newRefreshPlain);
    return toUserSafe(user);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const raw = readCookie(req, this.auth.refreshCookieName);
    this.clearAuthCookies(res);
    if (typeof raw !== 'string') {
      return;
    }
    const tokenHash = hashRefreshToken(raw);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
    });
    if (session) {
      await this.revokeRefreshFamily(session.familyId);
    }
  }

  private async revokeRefreshFamily(familyId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        familyId,
        status: {
          in: [RefreshSessionStatus.ACTIVE, RefreshSessionStatus.REPLACED],
        },
      },
      data: { status: RefreshSessionStatus.REVOKED },
    });
  }

  async me(userId: string): Promise<UserSafe> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.active) {
      throw new AppException(ErrorCode.AUTH_UNAUTHENTICATED);
    }
    return toUserSafe(user);
  }
}
