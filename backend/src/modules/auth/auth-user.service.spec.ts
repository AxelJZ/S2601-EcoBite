// NOTE: Verifies user service persistence and error handling behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import { AppException } from '../../common/errors/app.exception';
import { ErrorCode, OrmKnownCodes } from '../../common/errors/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './auth-user.service';
import { makeUserSafe } from './fixtures/user.fixtures';
import bcrypt from 'bcryptjs';

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockImplementation(() =>
      Promise.resolve('hashed-password'),
    );
  });

  describe('create', () => {
    it('hashes the password and persists default role and active state', async () => {
      const dto = makeUserSafe();

      prisma.user.create.mockResolvedValue(makeUserSafe({ email: dto.email }));

      await service.create({
        name: dto.name,
        email: dto.email,
        password: 'plain',
        phone: dto.phone,
        role: Role.ADMIN,
        active: dto.active ?? true,
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledWith('plain', 10);

      const tuple = prisma.user.create.mock.calls[0];
      expect(tuple).toBeDefined();
      const payload = tuple![0] as {
        data: { email: string; password: string; role: Role };
      };
      expect(payload.data.email).toBe(dto.email);
      expect(payload.data.password).toBe('hashed-password');
      expect(payload.data.role).toBe(Role.ADMIN);
    });

    it('traduce unicidad violada Prisma P2002 a USR_EMAIL_TAKEN', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: OrmKnownCodes.PrismaUniqueConstraint,
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({
          name: 'A',
          email: 'dup@example.com',
          password: 'p',
          role: Role.INSTALLER,
          active: true,
        }),
      ).rejects.toMatchObject({
        constructor: AppException,
        code: ErrorCode.USR_EMAIL_TAKEN.code,
      });
    });

    it('rethrows errors that are not P2002', async () => {
      prisma.user.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({
          name: 'A',
          email: 'x@example.com',
          password: 'p',
          role: Role.INSTALLER,
          active: true,
        }),
      ).rejects.toThrow('db down');
    });
  });

  describe('findAll', () => {
    it('applies the take=100 cap when a higher value is requested', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll({ skip: 0, take: 500 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });

    it('solo activos cuando activeOnly es true', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll({ activeOnly: true });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true },
        }),
      );
    });

    it('omit where cuando activeOnly no es true', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.findAll({ activeOnly: false });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza USR_NOT_FOUND si no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('550e8400-e29b-41d4-a716-446655440099'),
      ).rejects.toMatchObject({
        code: ErrorCode.USR_NOT_FOUND.code,
      });
    });
  });

  describe('update', () => {
    it('returns the user without touching Prisma when the patch is empty', async () => {
      const safe = makeUserSafe();
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: safe.id })
        .mockResolvedValueOnce(safe);

      const result = await service.update(safe.id, {});
      expect(result).toEqual(safe);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('traduce unicidad violada en update a USR_EMAIL_TAKEN', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'id-1' });
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: OrmKnownCodes.PrismaUniqueConstraint,
          clientVersion: 'test',
        }),
      );

      await expect(
        service.update('id-1', { email: 'taken@example.com' }),
      ).rejects.toMatchObject({
        code: ErrorCode.USR_EMAIL_TAKEN.code,
      });
    });
  });

  describe('remove', () => {
    it('sets active to false after ensureExists', async () => {
      const safe = makeUserSafe({ active: false });

      prisma.user.findUnique.mockResolvedValue({ id: safe.id });

      prisma.user.update.mockResolvedValue(safe);

      await expect(service.remove(safe.id)).resolves.toEqual(safe);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { active: false },
        }),
      );
    });
  });
});
