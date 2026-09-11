// NOTE: Creates standardized bad request exceptions for validation failures.
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../errors/error-codes';
import type { ValidationIssue } from './validation.types';

export const VALIDATION_FAILED_KEY = 'validationFailed' as const;

export function validationBadRequestBody(
  issues: ValidationIssue[],
): Record<string, unknown> {
  return {
    statusCode: HttpStatus.BAD_REQUEST,
    message: ErrorCode.VALIDATION_ERROR.message,
    error: 'Bad Request',
    [VALIDATION_FAILED_KEY]: true,
    errors: issues,
  };
}

export function validationBadRequest(
  issues: ValidationIssue[],
): BadRequestException {
  return new BadRequestException(validationBadRequestBody(issues));
}
