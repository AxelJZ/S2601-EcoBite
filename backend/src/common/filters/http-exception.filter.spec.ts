// NOTE: Verifies API error envelope formatting.
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VALIDATION_FAILED_KEY } from '../validation/validation-bad-request';
import { ErrorCode, OrmKnownCodes } from '../errors/error-codes';
import { AppException } from '../errors/app.exception';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  function createHost(opts: {
    res: { status: jest.Mock; json: jest.Mock };
    req: { url: string };
  }): ArgumentsHost {
    const { res, req } = opts;
    return {
      switchToHttp: () => ({
        getResponse: (): typeof res => res,
        getRequest: (): typeof req => req,
      }),
      switchToWs: jest.fn(),
      switchToRpc: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ArgumentsHost;
  }

  function mockRes(): { status: jest.Mock; json: jest.Mock } {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  function mockReq(url = '/test'): { url: string } {
    return { url };
  }

  it('adds INTERNAL_ERROR code for bare Error (500)', () => {
    const res = mockRes();
    filter.catch(new Error('unexpected'), createHost({ res, req: mockReq() }));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCode.INTERNAL_ERROR.code,
        statusCode: 500,
      }),
    );
  });

  it('copies AppException code and status', () => {
    const res = mockRes();
    filter.catch(
      new AppException(ErrorCode.USR_NOT_FOUND),
      createHost({ res, req: mockReq('/users/u') }),
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.USR_NOT_FOUND.code,
        statusCode: 404,
      }),
    );
  });

  it('maps Prisma unique violation to DB_UNIQUE_VIOLATION', () => {
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError('uniq', {
      code: OrmKnownCodes.PrismaUniqueConstraint,
      clientVersion: 't',
    });
    filter.catch(err, createHost({ res, req: mockReq() }));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.DB_UNIQUE_VIOLATION.code,
      }),
    );
  });

  it('handles validation errors with VALIDATION_ERROR code', () => {
    const res = mockRes();
    const body = {
      statusCode: 400,
      message: ErrorCode.VALIDATION_ERROR.message,
      error: 'Bad Request',
      [VALIDATION_FAILED_KEY]: true,
      errors: [{ property: 'email', messages: ['invalid'] }],
    };
    filter.catch(
      new BadRequestException(body),
      createHost({ res, req: mockReq() }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.VALIDATION_ERROR.code,
        errors: body.errors,
      }),
    );
  });

  it('detects malformed JSON BadRequest pattern as INVALID_JSON', () => {
    const res = mockRes();
    filter.catch(
      new BadRequestException('Unexpected token o in JSON at position 5'),
      createHost({ res, req: mockReq() }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.INVALID_JSON.code,
      }),
    );
  });

  it('handles legacy Nest validation array messages', () => {
    const res = mockRes();
    filter.catch(
      new BadRequestException({
        statusCode: 400,
        message: ['a is required'],
      }),
      createHost({ res, req: mockReq() }),
    );
    const payload = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.code).toBe(ErrorCode.VALIDATION_ERROR.code);
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it('uses INTERNAL_ERROR branch only when HttpException is not domain AppException', () => {
    const res = mockRes();
    filter.catch(
      new HttpException('generic', HttpStatus.INTERNAL_SERVER_ERROR),
      createHost({ res, req: mockReq() }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: ErrorCode.INTERNAL_ERROR.code,
      }),
    );
  });
});
