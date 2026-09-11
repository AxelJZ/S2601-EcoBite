// NOTE: Verifies standardized validation bad request exceptions.
import { BadRequestException } from '@nestjs/common';
import {
  VALIDATION_FAILED_KEY,
  validationBadRequest,
  validationBadRequestBody,
} from './validation-bad-request';
import { ErrorCode } from '../errors/error-codes';

describe('validation-bad-request', () => {
  it('validationBadRequestBody sets flag and keeps issues', () => {
    const issues = [{ property: 'email', messages: ['invalid'] }];
    const body = validationBadRequestBody(issues);
    expect(body[VALIDATION_FAILED_KEY]).toBe(true);
    expect(body.errors).toEqual(issues);
    expect(body.message).toBe(ErrorCode.VALIDATION_ERROR.message);
  });

  it('validationBadRequest returns BadRequestException with same shape', () => {
    const ex = validationBadRequest([{ property: 'x', messages: ['y'] }]);
    expect(ex).toBeInstanceOf(BadRequestException);
    const res = ex.getResponse() as Record<string, unknown>;
    expect(res[VALIDATION_FAILED_KEY]).toBe(true);
    expect(ex.getStatus()).toBe(400);
  });
});
