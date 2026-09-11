// NOTE: Wraps application error codes in Nest HTTP exceptions.
import { HttpException } from '@nestjs/common';
import { ErrorCodeDefinition } from './error-codes';

export class AppException extends HttpException {
  readonly code: string;

  constructor(errorCode: ErrorCodeDefinition, message?: string) {
    super(message ?? errorCode.message, errorCode.status);
    this.code = errorCode.code;
  }
}
