// NOTE: Formats thrown errors into the public API error envelope.
import type { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'http';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { mapOrmUniqueViolationToAppException } from '../errors/unique-violation.map';
import { VALIDATION_FAILED_KEY } from '../validation/validation-bad-request';
import {
  INTERNAL_ERROR_HTTP_STATUS,
  isInvalidJsonBadRequest,
  isLegacyValidationArrayMessage,
  messageFromHttpExceptionBody,
} from './http-exception.filter.helpers';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const err = mapOrmUniqueViolationToAppException(exception) ?? exception;

    const status: number =
      err instanceof HttpException
        ? err.getStatus()
        : INTERNAL_ERROR_HTTP_STATUS;

    const exceptionResponse =
      err instanceof HttpException
        ? err.getResponse()
        : 'Internal server error';

    let message: unknown;
    let validationErrors: unknown;
    const invalidJson = isInvalidJsonBadRequest(err);

    if (err instanceof BadRequestException) {
      const raw = err.getResponse();
      if (typeof raw === 'object' && raw !== null) {
        const rec = raw as Record<string, unknown>;
        if (rec[VALIDATION_FAILED_KEY] === true && Array.isArray(rec.errors)) {
          message =
            typeof rec.message === 'string'
              ? rec.message
              : ErrorCode.VALIDATION_ERROR.message;
          validationErrors = rec.errors;
        } else if (isLegacyValidationArrayMessage(err)) {
          const msgs = rec.message;
          message = ErrorCode.VALIDATION_ERROR.message;
          validationErrors = [
            {
              property: 'body',
              messages: Array.isArray(msgs) ? msgs.map(String) : [],
            },
          ];
        }
      }
    }

    if (invalidJson) {
      message = ErrorCode.INVALID_JSON.message;
      validationErrors = [
        {
          property: 'body',
          messages: [ErrorCode.INVALID_JSON.message],
        },
      ];
    } else if (message === undefined) {
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : messageFromHttpExceptionBody(exceptionResponse);
    }

    const body: Record<string, unknown> = {
      success: false,
      statusCode: status,
      statusText: STATUS_CODES[status] ?? 'Unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    if (validationErrors !== undefined) {
      body.errors = validationErrors;
    }

    if (err instanceof AppException) {
      body.code = err.code;
    } else if (invalidJson) {
      body.code = ErrorCode.INVALID_JSON.code;
    } else if (validationErrors !== undefined) {
      body.code = ErrorCode.VALIDATION_ERROR.code;
    } else if (status === INTERNAL_ERROR_HTTP_STATUS) {
      body.code = ErrorCode.INTERNAL_ERROR.code;
    }

    response.status(status).json(body);
  }
}
