// NOTE: Provides helpers for HTTP exception filtering.
import { BadRequestException } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { VALIDATION_FAILED_KEY } from '../validation/validation-bad-request';

export const INTERNAL_ERROR_HTTP_STATUS: number =
  HttpStatus.INTERNAL_SERVER_ERROR;

export const JSON_BODY_PARSE_HINTS: RegExp[] = [
  /is not valid JSON/i,
  /Unexpected token/i,
  /Unexpected end of JSON input/i,
  /JSON at position/i,
];

export function isLegacyValidationArrayMessage(exception: unknown): boolean {
  if (!(exception instanceof BadRequestException)) {
    return false;
  }
  const response = exception.getResponse();
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  const message = (response as Record<string, unknown>).message;
  return Array.isArray(message);
}

export function messageFromHttpExceptionBody(body: object): unknown {
  const record = body as Record<string, unknown>;
  const direct = record.message;
  if (direct != null) {
    return direct;
  }
  const stripped = Object.fromEntries(
    Object.entries(record).filter(
      ([key]) => key !== 'statusCode' && key !== 'error',
    ),
  );
  return Object.keys(stripped).length > 0 ? stripped : {};
}

export function badRequestMessageString(
  exception: BadRequestException,
): string | undefined {
  const raw = exception.getResponse();
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'object' && raw !== null) {
    const msg = (raw as Record<string, unknown>).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return undefined;
}

export function looksLikeInvalidJsonBodyMessage(text: string): boolean {
  return JSON_BODY_PARSE_HINTS.some((pattern) => pattern.test(text));
}

export function isInvalidJsonBadRequest(exception: unknown): boolean {
  if (!(exception instanceof BadRequestException)) {
    return false;
  }
  if (exception.getStatus() !== 400) {
    return false;
  }
  const raw = exception.getResponse();
  if (typeof raw === 'object' && raw !== null) {
    const rec = raw as Record<string, unknown>;
    if (rec[VALIDATION_FAILED_KEY] === true) {
      return false;
    }
  }
  if (isLegacyValidationArrayMessage(exception)) {
    return false;
  }
  const text = badRequestMessageString(exception);
  if (text === undefined) {
    return false;
  }
  return looksLikeInvalidJsonBodyMessage(text);
}
