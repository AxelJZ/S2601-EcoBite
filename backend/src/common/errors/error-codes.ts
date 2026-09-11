// NOTE: Centralizes stable API error codes, HTTP statuses, and messages.
import { HttpStatus } from '@nestjs/common';

export interface ErrorCodeDefinition {
  code: string;
  status: HttpStatus;
  message: string;
}

export const OrmKnownCodes = {
  PrismaUniqueConstraint: 'P2002',
} as const;

export const ErrorCode = {
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    status: HttpStatus.BAD_REQUEST,
    message: 'Validation error',
  },

  INVALID_JSON: {
    code: 'INVALID_JSON',
    status: HttpStatus.BAD_REQUEST,
    message: 'The request body is not valid JSON',
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },

  DB_UNIQUE_VIOLATION: {
    code: 'DB_UNIQUE_VIOLATION',
    status: HttpStatus.CONFLICT,
    message: 'A record with those values already exists',
  },

  USR_NOT_FOUND: {
    code: 'USR_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: 'User not found',
  },
  USR_EMAIL_TAKEN: {
    code: 'USR_EMAIL_TAKEN',
    status: HttpStatus.CONFLICT,
    message: 'A user with that email already exists',
  },

  CUS_NOT_FOUND: {
    code: 'CUS_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: 'Customer not found',
  },
  CUS_COORDS_MISSING: {
    code: 'CUS_COORDS_MISSING',
    status: HttpStatus.BAD_REQUEST,
    message:
      'The customer does not have coordinates (latitude/longitude). Complete them before creating the order.',
  },

  USR_ROLE_INVALID_INSTALLER: {
    code: 'USR_ROLE_INVALID_INSTALLER',
    status: HttpStatus.BAD_REQUEST,
    message: 'The selected user is not a valid active installer.',
  },

  ORD_NOT_FOUND: {
    code: 'ORD_NOT_FOUND',
    status: HttpStatus.NOT_FOUND,
    message: 'Order not found',
  },

  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid credentials',
  },
  AUTH_UNAUTHENTICATED: {
    code: 'AUTH_UNAUTHENTICATED',
    status: HttpStatus.UNAUTHORIZED,
    message: 'No autenticado',
  },
  AUTH_FORBIDDEN: {
    code: 'AUTH_FORBIDDEN',
    status: HttpStatus.FORBIDDEN,
    message: 'You do not have permission to perform this action',
  },
  AUTH_REFRESH_INVALID: {
    code: 'AUTH_REFRESH_INVALID',
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid or expired refresh session',
  },

  AUTH_REFRESH_REUSE: {
    code: 'AUTH_REFRESH_REUSE',
    status: HttpStatus.UNAUTHORIZED,
    message: 'Invalid session; sign in again',
  },
  CSRF_INVALID: {
    code: 'CSRF_INVALID',
    status: HttpStatus.FORBIDDEN,
    message: 'Invalid or missing CSRF token',
  },
} as const satisfies Record<string, ErrorCodeDefinition>;

export type ErrorCodeKey = keyof typeof ErrorCode;
