// NOTE: Verifies custom parameter parsing validation behavior.
import { BadRequestException } from '@nestjs/common';
import { ValidationParseIntPipe } from './parse-int-validation.pipe';
import { ValidationParseUUIDPipe } from './parse-uuid-validation.pipe';
import { VALIDATION_FAILED_KEY } from '../validation/validation-bad-request';
import type { ArgumentMetadata } from '@nestjs/common';

const meta = {
  type: 'param',
  metatype: String,
  data: '',
} satisfies ArgumentMetadata;

describe('ValidationParseIntPipe', () => {
  let pipe: ValidationParseIntPipe;

  beforeEach(() => {
    pipe = new ValidationParseIntPipe('skip');
  });

  it('transforms numeric string to number', async () => {
    await expect(pipe.transform('42', meta)).resolves.toBe(42);
  });

  it('throws BadRequest with validationFailed on invalid payload', async () => {
    let thrown: BadRequestException | undefined;
    try {
      await pipe.transform('not-int', meta);
    } catch (e: unknown) {
      thrown = e as BadRequestException;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    const res = thrown!.getResponse() as Record<string, unknown>;
    expect(res[VALIDATION_FAILED_KEY]).toBe(true);
    expect(Array.isArray(res.errors)).toBe(true);
  });
});

describe('ValidationParseUUIDPipe', () => {
  let pipe: ValidationParseUUIDPipe;

  beforeEach(() => {
    pipe = new ValidationParseUUIDPipe('id');
  });

  it('accepts uuid v4', async () => {
    await expect(
      pipe.transform('550e8400-e29b-41d4-a716-446655440000', meta),
    ).resolves.toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('reject invalid uuid with property name in errors', async () => {
    let thrown: BadRequestException | undefined;
    try {
      await pipe.transform('not-a-uuid', meta);
    } catch (e: unknown) {
      thrown = e as BadRequestException;
    }
    expect(thrown).toBeInstanceOf(BadRequestException);
    const res = thrown!.getResponse() as Record<string, unknown>;
    const errors = res.errors as { property: string }[];
    expect(errors[0]?.property).toBe('id');
  });
});
