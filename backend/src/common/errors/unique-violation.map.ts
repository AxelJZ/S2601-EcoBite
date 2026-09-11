// NOTE: Maps Prisma unique constraint errors to application exceptions.
import { Prisma } from '@prisma/client';
import { AppException } from './app.exception';
import { ErrorCode, OrmKnownCodes } from './error-codes';

export function mapOrmUniqueViolationToAppException(
  exception: unknown,
): AppException | null {
  if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }
  if (exception.code !== OrmKnownCodes.PrismaUniqueConstraint) {
    return null;
  }
  return new AppException(ErrorCode.DB_UNIQUE_VIOLATION);
}
