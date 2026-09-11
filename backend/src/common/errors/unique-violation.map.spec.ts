// NOTE: Verifies mapping of unique constraint persistence errors.
import { Prisma } from '@prisma/client';
import { mapOrmUniqueViolationToAppException } from './unique-violation.map';
import { ErrorCode, OrmKnownCodes } from './error-codes';

describe('mapOrmUniqueViolationToAppException', () => {
  it('returns null for non-Prisma errors', () => {
    expect(mapOrmUniqueViolationToAppException(new Error('x'))).toBeNull();
  });

  it('returns null for Prisma codes other than P2002', () => {
    const err = new Prisma.PrismaClientKnownRequestError('x', {
      code: 'P2025',
      clientVersion: 't',
    });
    expect(mapOrmUniqueViolationToAppException(err)).toBeNull();
  });

  it('maps P2002 to DB_UNIQUE_VIOLATION', () => {
    const err = new Prisma.PrismaClientKnownRequestError('unique', {
      code: OrmKnownCodes.PrismaUniqueConstraint,
      clientVersion: 't',
    });
    const mapped = mapOrmUniqueViolationToAppException(err);
    expect(mapped).not.toBeNull();
    expect(mapped!.code).toBe(ErrorCode.DB_UNIQUE_VIOLATION.code);
  });
});
